import { checkoutPath, orderDetailPath } from '../../../app/routes';
import { recordOperation } from '../../operations';
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
  createPriceSnapshot,
  type PriceSnapshot,
} from '../../pricing';
import {
  readMigratedVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import { cancelBillForOrder, createBillForOrder } from '../../bills/state/billStore';
import type {
  CommerceFulfillment,
  CommerceOrder,
  OrderProductType,
  OrderQuery,
  OrderStatus,
  OrderSummaryItem,
  OrderType,
} from '../types';
import { ORDER_STATUS_VIEWS } from '../formatters';

const STORAGE_KEY = 'computing-platform:commerce-orders';
const VERSION = 2;

const INITIAL_CLOUD_PRICE = createPriceSnapshot(
  'catalog-cloud-cpu-c16-west',
  calculateCloudPrice({
    skuId: 'catalog-cloud-cpu-c16-west',
    billingMode: 'subscription',
    quantity: 1,
    durationMonths: 1,
    systemDiskGb: 30,
    storage: {
      skuId: 'storage-shared-performance-gb-month',
      capacityGb: 2048,
      label: '研发共享存储 · 2048 GB',
    },
    imageId: 'preset-image-base-linux',
  }),
  '2026-07-18T02:30:00.000Z',
);

const INITIAL_PHYSICAL_PRICE = createPriceSnapshot(
  'catalog-physical-gpu-p8-west',
  calculatePhysicalPrice({
    skuId: 'catalog-physical-gpu-p8-west',
    quantity: 1,
    durationMonths: 1,
  }),
  '2026-07-20T05:10:00.000Z',
);

const INITIAL_ORDERS: readonly CommerceOrder[] = [
  {
    id: 'ORD-20260718-0001',
    orderType: 'purchase',
    productType: 'cloud-server',
    productName: '通用计算 C16',
    resourceId: 'cs-east-001',
    resourceIds: ['cs-east-001'],
    resourceName: '研发计算节点-01',
    items: INITIAL_CLOUD_PRICE.lineItems.map((item) => ({
      id: item.id,
      name: item.label,
      quantity: item.quantity,
      amount: item.amount,
    })),
    pricingSnapshot: INITIAL_CLOUD_PRICE,
    status: 'completed',
    createdAt: '2026-07-18T02:30:00.000Z',
    paidAt: '2026-07-18T02:32:00.000Z',
    completedAt: '2026-07-18T03:20:00.000Z',
    site: '东部算力中心',
    quantity: 1,
    billingMode: 'subscription',
    configurationSummary: [
      { label: '资源类型', value: '云服务器' },
      { label: '站点', value: '东部算力中心' },
      { label: 'CPU', value: '16 vCPU' },
      { label: '内存', value: '64 GB' },
      { label: '系统盘', value: '30 GB' },
      { label: '镜像', value: '基础 Linux 运行镜像' },
    ],
    timeline: [
      { label: '订单已创建', time: '2026-07-18T02:30:00.000Z', status: 'completed', description: '配置与费用快照已确认。' },
      { label: '已支付', time: '2026-07-18T02:32:00.000Z', status: 'completed', description: '账单已支付。' },
      { label: '开通中', time: '2026-07-18T02:35:00.000Z', status: 'completed', description: '资源进入开通流程。' },
      { label: '已完成', time: '2026-07-18T03:20:00.000Z', status: 'completed', description: '资源已开通并关联订单。' },
    ],
  },
  {
    id: 'ORD-20260720-0002',
    orderType: 'purchase',
    productType: 'physical-machine',
    productName: '整机加速计算 P8',
    items: INITIAL_PHYSICAL_PRICE.lineItems.map((item) => ({
      id: item.id,
      name: item.label,
      quantity: item.quantity,
      amount: item.amount,
    })),
    pricingSnapshot: INITIAL_PHYSICAL_PRICE,
    status: 'fulfilling',
    createdAt: '2026-07-20T05:10:00.000Z',
    paidAt: '2026-07-20T05:12:00.000Z',
    site: '东部算力中心',
    quantity: 1,
    billingMode: 'subscription',
    configurationSummary: [
      { label: '资源类型', value: '物理机' },
      { label: '站点', value: '东部算力中心' },
      { label: '整机规格', value: '整机加速计算 P8' },
      { label: '数量', value: '1' },
    ],
    timeline: [
      { label: '订单已创建', time: '2026-07-20T05:10:00.000Z', status: 'completed', description: '配置与费用快照已确认。' },
      { label: '已支付', time: '2026-07-20T05:12:00.000Z', status: 'completed', description: '账单已支付。' },
      { label: '开通中', time: '2026-07-20T05:18:00.000Z', status: 'current', description: '正在准备资源和网络。' },
    ],
  },
];

const ORDER_STATUSES: readonly OrderStatus[] = [
  'awaiting-payment',
  'paying',
  'paid',
  'fulfilling',
  'completed',
  'cancelled',
  'payment-failed',
  'refunding',
  'refunded',
];

const ORDER_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  'awaiting-payment': ['paying', 'payment-failed', 'cancelled'],
  paying: ['paid', 'payment-failed', 'cancelled'],
  paid: ['fulfilling', 'refunding'],
  fulfilling: ['completed', 'refunding'],
  completed: ['refunding'],
  cancelled: [],
  'payment-failed': ['paying', 'cancelled'],
  refunding: ['refunded'],
  refunded: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus) {
  return from === to || ORDER_TRANSITIONS[from].includes(to);
}

function isOrder(value: unknown): value is CommerceOrder {
  if (!value || typeof value !== 'object') return false;
  const order = value as Partial<CommerceOrder>;
  return (
    typeof order.id === 'string' &&
    typeof order.orderType === 'string' &&
    typeof order.productType === 'string' &&
    typeof order.productName === 'string' &&
    typeof order.status === 'string' &&
    ORDER_STATUSES.includes(order.status as OrderStatus) &&
    typeof order.createdAt === 'string' &&
    Array.isArray(order.items) &&
    Array.isArray(order.configurationSummary) &&
    Array.isArray(order.timeline) &&
    typeof order.pricingSnapshot === 'object' &&
    Array.isArray(order.pricingSnapshot?.lineItems) &&
    Number.isSafeInteger(order.pricingSnapshot?.total?.amountFen)
  );
}

function readOrders() {
  return readMigratedVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is CommerceOrder[] =>
      Array.isArray(value) && value.every(isOrder),
    (value, previousVersion) => {
      if (previousVersion !== 1 || !Array.isArray(value)) return undefined;
      return value
        .filter((candidate) => {
          if (!candidate || typeof candidate !== 'object') return false;
          const order = candidate as { orderType?: unknown };
          return order.orderType !== 'resize';
        })
        .map((candidate) => {
          const order = candidate as Record<string, unknown>;
          const fulfillment = order.fulfillment as { kind?: unknown } | undefined;
          return {
            ...order,
            status: order.status === 'provisioning' ? 'fulfilling' : order.status,
            fulfillment:
              fulfillment?.kind === 'resource-resize' ? undefined : fulfillment,
          };
        }) as CommerceOrder[];
    },
    () => structuredClone(INITIAL_ORDERS) as CommerceOrder[],
  );
}

function writeOrders(orders: readonly CommerceOrder[]) {
  writeVersionedState(STORAGE_KEY, VERSION, orders);
}

function nextOrderId(date: Date) {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const prefix = `ORD-${day}-`;
  const sequence =
    readOrders()
      .filter((order) => order.id.startsWith(prefix))
      .reduce((maximum, order) => {
        const value = Number(order.id.slice(prefix.length));
        return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
      }, 0) + 1;
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

function itemize(snapshot: PriceSnapshot) {
  return snapshot.lineItems.map((item) => ({
    id: item.id,
    name: item.label,
    description: item.unitLabel,
    quantity: item.quantity,
    amount: item.amount,
  }));
}

function summaryValue(summary: readonly OrderSummaryItem[], label: string) {
  return summary.find((item) => item.label === label)?.value;
}

export function createCommerceOrder(input: Readonly<{
  orderType: OrderType;
  productType: OrderProductType;
  productName: string;
  site: string;
  quantity?: number;
  resourceId?: string;
  resourceIds?: readonly string[];
  resourceName?: string;
  configurationSummary: readonly OrderSummaryItem[];
  pricingSnapshot: PriceSnapshot;
  fulfillment?: CommerceFulfillment;
  requiresPayment?: boolean;
  billingPeriod?: CommerceOrder['billingPeriod'];
}>) {
  const createdAt = new Date().toISOString();
  const id = nextOrderId(new Date(createdAt));
  const requiresPayment = input.requiresPayment ?? true;
  const order: CommerceOrder = {
    id,
    orderType: input.orderType,
    productType: input.productType,
    productName: input.productName,
    resourceId: input.resourceId,
    resourceIds: input.resourceIds,
    resourceName: input.resourceName,
    items: itemize(input.pricingSnapshot),
    pricingSnapshot: structuredClone(input.pricingSnapshot),
    status: requiresPayment ? 'awaiting-payment' : 'fulfilling',
    createdAt,
    site: input.site,
    quantity: input.quantity ?? 1,
    billingMode: input.pricingSnapshot.billingMode,
    billingPeriod: input.billingPeriod,
    configurationSummary: input.configurationSummary.map((item) => ({ ...item })),
    timeline: [{
      label: '订单已创建',
      time: createdAt,
      status: 'current',
      description: requiresPayment ? '请完成支付后开始开通。' : '订单已进入开通流程。',
    }],
    fulfillment: input.fulfillment,
  };
  writeOrders([order, ...readOrders()]);
  if (requiresPayment) createBillForOrder(order);
  recordOperation({
    module: 'order',
    action: '创建订单',
    targetId: order.id,
    targetName: order.productName,
    status: requiresPayment ? 'waiting' : 'executing',
    message: requiresPayment ? '订单已创建，等待支付。' : '订单已创建，正在开通。',
    targetPath: orderDetailPath(order.id),
    createdAt,
  });
  return order;
}

export function createPurchaseOrder(input: Readonly<{
  resourceType: Extract<OrderProductType, 'cloud-server' | 'physical-machine'>;
  productName: string;
  summary: readonly OrderSummaryItem[];
  priceSnapshot: PriceSnapshot;
  fulfillment?: CommerceFulfillment;
}>) {
  const quantity = Number(summaryValue(input.summary, '数量')) || 1;
  const site = summaryValue(input.summary, '站点') ?? '未标注';
  const payAsYouGo = input.priceSnapshot.billingMode === 'pay-as-you-go';
  const createdAt = new Date();
  return createCommerceOrder({
    orderType: 'purchase',
    productType: input.resourceType,
    productName: input.productName,
    site,
    quantity,
    configurationSummary: input.summary,
    pricingSnapshot: input.priceSnapshot,
    fulfillment: input.fulfillment,
    requiresPayment: !payAsYouGo,
    billingPeriod: payAsYouGo
      ? {
          startAt: createdAt.toISOString(),
          endAt: new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      : undefined,
  });
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  description: string,
) {
  const orders = readOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index < 0) throw new Error('未找到订单。');
  const current = orders[index];
  if (!canTransitionOrder(current.status, status)) {
    throw new Error(
      `订单不能从“${ORDER_STATUS_VIEWS[current.status].label}”变为“${ORDER_STATUS_VIEWS[status].label}”。`,
    );
  }
  const time = new Date().toISOString();
  const timeline = current.timeline.map((item) =>
    item.status === 'current' ? { ...item, status: 'completed' as const } : item,
  );
  const next: CommerceOrder = {
    ...current,
    status,
    paidAt: status === 'paid' ? time : current.paidAt,
    completedAt: status === 'completed' ? time : current.completedAt,
    cancelledAt: status === 'cancelled' ? time : current.cancelledAt,
    timeline: [
      ...timeline,
      {
        label: ORDER_STATUS_VIEWS[status].label,
        time,
        status: ['cancelled', 'payment-failed', 'refunded'].includes(status)
          ? 'stopped'
          : status === 'completed'
            ? 'completed'
            : 'current',
        description,
      },
    ],
  };
  writeOrders([...orders.slice(0, index), next, ...orders.slice(index + 1)]);
  return structuredClone(next);
}

export function updateOrderRelations(
  orderId: string,
  resourceIds: readonly string[],
) {
  const orders = readOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index < 0) throw new Error('未找到订单。');
  const current = orders[index];
  const next: CommerceOrder = {
    ...current,
    resourceId: resourceIds[0] ?? current.resourceId,
    resourceIds: resourceIds.length ? [...resourceIds] : current.resourceIds,
  };
  writeOrders([...orders.slice(0, index), next, ...orders.slice(index + 1)]);
  return structuredClone(next);
}

export function cancelCommerceOrder(orderId: string) {
  const current = getOrder(orderId);
  if (!current) throw new Error('未找到订单。');
  if (current.status !== 'awaiting-payment' && current.status !== 'payment-failed') {
    throw new Error('仅待支付或支付失败的订单可以取消。');
  }
  const next = updateOrderStatus(orderId, 'cancelled', '订单已取消，未创建或变更资源。');
  cancelBillForOrder(orderId);
  recordOperation({
    module: 'order',
    action: '取消订单',
    targetId: next.id,
    targetName: next.productName,
    status: 'completed',
    message: '订单及关联账单已取消。',
    targetPath: orderDetailPath(next.id),
  });
  return next;
}

export function queryOrders(query: OrderQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readOrders().filter((order) => {
    if (
      search &&
      ![
        order.id,
        order.productName,
        order.resourceId ?? '',
        order.resourceName ?? '',
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search)
    ) return false;
    if (query.orderType && query.orderType !== 'all' && order.orderType !== query.orderType) return false;
    if (query.productType && query.productType !== 'all' && order.productType !== query.productType) return false;
    if (query.status && query.status !== 'all' && order.status !== query.status) return false;
    if (query.site && query.site !== 'all' && order.site !== query.site) return false;
    if (query.createdAfter && order.createdAt.slice(0, 10) < query.createdAfter) return false;
    const hasRelatedObject = Boolean(order.resourceId || order.resourceIds?.length);
    if (query.related === 'yes' && !hasRelatedObject) return false;
    if (query.related === 'no' && hasRelatedObject) return false;
    return true;
  });
}

export function getOrder(orderId: string) {
  return readOrders().find((order) => order.id === orderId);
}

export function getOrdersForResource(resourceId: string) {
  return readOrders().filter(
    (order) =>
      order.resourceId === resourceId || order.resourceIds?.includes(resourceId),
  );
}

export function getCheckoutPath(orderId: string) {
  return checkoutPath(orderId);
}

export function resetOrderStore() {
  removeVersionedState(STORAGE_KEY);
}
