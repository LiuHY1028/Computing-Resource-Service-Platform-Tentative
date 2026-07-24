import {
  getComputePrice,
  getImagePrice,
  getStoragePrice,
} from './pricingStore';
import type {
  Money,
  PriceCategory,
  PriceLineItem,
  PriceQuote,
  PriceSnapshot,
} from './types';

const HOURS_PER_MONTH = 730;

export function money(amountFen: number): Money {
  if (!Number.isSafeInteger(amountFen) || amountFen < 0) {
    throw new Error('金额必须为非负整数分。');
  }
  return { amountFen, currency: 'CNY' };
}

function positiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label}必须为正整数。`);
  }
  return value;
}

export function addMoney(values: readonly Money[]): Money {
  return money(values.reduce((total, value) => total + value.amountFen, 0));
}

export function combinePriceQuotes(
  sources: readonly PriceQuote[],
  billingMode: string,
  duration?: number,
): PriceQuote {
  const lineItems = sources.flatMap((source, sourceIndex) =>
    source.lineItems.map((item) => ({
      ...item,
      id: `${sourceIndex + 1}:${item.id}`,
    })),
  );
  return quote(
    billingMode,
    sources.reduce((total, source) => total + source.quantity, 0),
    lineItems,
    duration,
  );
}

function line(input: Readonly<{
  id: string;
  category: PriceCategory;
  label: string;
  unitPriceFen: number;
  quantity: number;
  duration?: number;
  included?: boolean;
  unitLabel?: string;
}>): PriceLineItem {
  const quantity = positiveInteger(input.quantity, '数量');
  const duration = input.duration === undefined
    ? undefined
    : positiveInteger(input.duration, '周期');
  const amountFen = input.included
    ? 0
    : input.unitPriceFen * quantity * (duration ?? 1);
  return {
    id: input.id,
    category: input.category,
    label: input.label,
    unitPrice: money(input.unitPriceFen),
    quantity,
    duration,
    amount: money(amountFen),
    included: input.included,
    unitLabel: input.unitLabel,
  };
}

function quote(
  billingMode: string,
  quantity: number,
  lineItems: readonly PriceLineItem[],
  duration?: number,
): PriceQuote {
  const subtotal = addMoney(lineItems.map((item) => item.amount));
  return {
    billingMode,
    duration,
    quantity,
    lineItems,
    subtotal,
    total: subtotal,
  };
}

function hourlyFromMonthly(monthlyFen: number) {
  return Math.round(monthlyFen / HOURS_PER_MONTH);
}

export type CloudQuoteInput = Readonly<{
  skuId: string;
  billingMode: 'subscription' | 'pay-as-you-go';
  quantity: number;
  durationMonths?: 1 | 3 | 6 | 12;
  systemDiskGb: number;
  storage?: Readonly<{
    skuId: string;
    capacityGb: number;
    label: string;
    included?: boolean;
  }>;
  imageId?: string | null;
}>;

export function calculateCloudPrice(input: CloudQuoteInput): PriceQuote {
  const compute = getComputePrice(input.skuId);
  if (!compute || compute.resourceType !== 'cloud-server') {
    throw new Error(`未找到云服务器价格：${input.skuId}`);
  }
  const quantity = positiveInteger(input.quantity, '数量');
  const duration =
    input.billingMode === 'subscription'
      ? positiveInteger(input.durationMonths ?? 1, '购买周期')
      : undefined;
  const computeUnit =
    input.billingMode === 'subscription'
      ? compute.monthlyPriceFen
      : compute.hourlyPriceFen;
  const items: PriceLineItem[] = [
    line({
      id: `${input.skuId}:compute`,
      category: 'compute',
      label: compute.name,
      unitPriceFen: computeUnit,
      quantity,
      duration,
      unitLabel: input.billingMode === 'subscription' ? '月' : '小时',
    }),
    line({
      id: `${input.skuId}:system-disk`,
      category: 'systemDisk',
      label: `${input.systemDiskGb} GB 系统盘`,
      unitPriceFen: 0,
      quantity,
      duration,
      included: true,
      unitLabel: '已包含',
    }),
  ];

  if (input.storage) {
    const storage = getStoragePrice(input.storage.skuId);
    if (!storage) throw new Error(`未找到存储价格：${input.storage.skuId}`);
    const storageQuantity = positiveInteger(input.storage.capacityGb, '存储容量');
    const monthlyUnit = storage.unitPriceFen;
    items.push(
      line({
        id: `${input.storage.skuId}:storage`,
        category: 'dataStorage',
        label: input.storage.label,
        unitPriceFen:
          input.billingMode === 'subscription'
            ? monthlyUnit
            : hourlyFromMonthly(monthlyUnit),
        quantity: storageQuantity,
        duration,
        included: input.storage.included,
        unitLabel:
          input.storage.included
            ? '已包含'
            : input.billingMode === 'subscription'
            ? 'GB/月'
            : 'GB/小时',
      }),
    );
  }

  if (input.imageId) {
    const image = getImagePrice(input.imageId);
    if (!image) throw new Error(`未找到镜像价格：${input.imageId}`);
    const included = image.policy !== 'monthly';
    items.push(
      line({
        id: `${input.imageId}:image`,
        category: 'image',
        label: image.name,
        unitPriceFen:
          input.billingMode === 'subscription'
            ? image.monthlyPriceFen
            : hourlyFromMonthly(image.monthlyPriceFen),
        quantity,
        duration,
        included,
        unitLabel: included
          ? image.policy === 'free'
            ? '免费'
            : '已包含'
          : input.billingMode === 'subscription'
            ? '月'
            : '小时',
      }),
    );
  }

  return quote(input.billingMode, quantity, items, duration);
}

export function calculatePhysicalPrice(input: Readonly<{
  skuId: string;
  quantity: number;
  durationMonths: 1 | 3 | 6 | 12;
}>): PriceQuote {
  const compute = getComputePrice(input.skuId);
  if (!compute || compute.resourceType !== 'physical-machine') {
    throw new Error(`未找到物理机价格：${input.skuId}`);
  }
  const quantity = positiveInteger(input.quantity, '数量');
  const duration = positiveInteger(input.durationMonths, '使用周期');
  return quote(
    'monthly-rental',
    quantity,
    [
      line({
        id: `${input.skuId}:compute`,
        category: 'compute',
        label: compute.name,
        unitPriceFen: compute.monthlyPriceFen,
        quantity,
        duration,
        unitLabel: '月',
      }),
    ],
    duration,
  );
}

export function calculateStoragePrice(input: Readonly<{
  skuId: string;
  capacityGb: number;
  durationMonths?: number;
  label?: string;
}>): PriceQuote {
  const storage = getStoragePrice(input.skuId);
  if (!storage) throw new Error(`未找到存储价格：${input.skuId}`);
  const duration = positiveInteger(input.durationMonths ?? 1, '计费周期');
  const quantity = positiveInteger(input.capacityGb, '存储容量');
  return quote(
    'monthly-capacity',
    quantity,
    [
      line({
        id: `${input.skuId}:storage`,
        category: 'dataStorage',
        label: input.label ?? storage.name,
        unitPriceFen: storage.unitPriceFen,
        quantity,
        duration,
        unitLabel: 'GB/月',
      }),
    ],
    duration,
  );
}

export function createPriceSnapshot(
  skuId: string,
  source: PriceQuote,
  generatedAt = new Date().toISOString(),
): PriceSnapshot {
  const computeLine = source.lineItems.find((item) => item.category === 'compute');
  const unitPrice = computeLine?.unitPrice ?? source.lineItems[0]?.unitPrice ?? money(0);
  return structuredClone({
    skuId,
    billingMode: source.billingMode,
    unitPrice,
    quantity: source.quantity,
    duration: source.duration,
    lineItems: source.lineItems,
    subtotal: source.subtotal,
    total: source.total,
    generatedAt,
  });
}

export function createZeroPriceSnapshot(
  skuId: string,
  label: string,
  generatedAt = new Date().toISOString(),
): PriceSnapshot {
  return createPriceSnapshot(
    skuId,
    quote(
      'not-billable',
      1,
      [
        line({
          id: `${skuId}:included`,
          category: 'compute',
          label,
          unitPriceFen: 0,
          quantity: 1,
          included: true,
          unitLabel: '不计费',
        }),
      ],
    ),
    generatedAt,
  );
}
