import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import type { CommerceOrder, OrderType } from '../../orders/types';
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
  createPriceSnapshot,
} from '../../pricing';
import type {
  Bill,
  BillPaymentMethod,
  BillQuery,
  BillStatus,
  BillType,
} from '../types';

const STORAGE_KEY = 'computing-platform:bills';
const VERSION = 1;

const INITIAL_CLOUD_BILL_PRICE = createPriceSnapshot(
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

const INITIAL_PHYSICAL_BILL_PRICE = createPriceSnapshot(
  'catalog-physical-gpu-p8-west',
  calculatePhysicalPrice({
    skuId: 'catalog-physical-gpu-p8-west',
    quantity: 1,
    durationMonths: 1,
  }),
  '2026-07-20T05:10:00.000Z',
);

const INITIAL_BILLS: readonly Bill[] = [
  {
    id: 'BILL-20260718-0001',
    orderId: 'ORD-20260718-0001',
    billType: 'prepaid',
    productName: '通用计算 C16',
    resourceId: 'cs-east-001',
    amount: INITIAL_CLOUD_BILL_PRICE.total,
    lineItems: INITIAL_CLOUD_BILL_PRICE.lineItems,
    status: 'paid',
    issuedAt: '2026-07-18T02:30:00.000Z',
    dueAt: '2026-07-18T03:00:00.000Z',
    paidAt: '2026-07-18T02:32:00.000Z',
  },
  {
    id: 'BILL-20260720-0002',
    orderId: 'ORD-20260720-0002',
    billType: 'prepaid',
    productName: '整机加速计算 P8',
    amount: INITIAL_PHYSICAL_BILL_PRICE.total,
    lineItems: INITIAL_PHYSICAL_BILL_PRICE.lineItems,
    status: 'paid',
    issuedAt: '2026-07-20T05:10:00.000Z',
    dueAt: '2026-07-20T05:40:00.000Z',
    paidAt: '2026-07-20T05:12:00.000Z',
  },
];

const BILL_STATUSES: readonly BillStatus[] = [
  'unpaid',
  'paying',
  'paid',
  'cancelled',
  'refunding',
  'refunded',
];

const BILL_TRANSITIONS: Readonly<Record<BillStatus, readonly BillStatus[]>> = {
  unpaid: ['paying', 'cancelled'],
  paying: ['unpaid', 'paid', 'cancelled'],
  paid: ['refunding'],
  cancelled: [],
  refunding: ['refunded'],
  refunded: [],
};

export function canTransitionBill(from: BillStatus, to: BillStatus) {
  return from === to || BILL_TRANSITIONS[from].includes(to);
}

function isBill(value: unknown): value is Bill {
  if (!value || typeof value !== 'object') return false;
  const bill = value as Partial<Bill>;
  return (
    typeof bill.id === 'string' &&
    typeof bill.orderId === 'string' &&
    typeof bill.billType === 'string' &&
    typeof bill.productName === 'string' &&
    typeof bill.status === 'string' &&
    BILL_STATUSES.includes(bill.status as BillStatus) &&
    typeof bill.issuedAt === 'string' &&
    Number.isSafeInteger(bill.amount?.amountFen) &&
    bill.amount?.currency === 'CNY' &&
    Array.isArray(bill.lineItems)
  );
}

function readBills() {
  return readVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is Bill[] => Array.isArray(value) && value.every(isBill),
    () => structuredClone(INITIAL_BILLS) as Bill[],
  );
}

function writeBills(bills: readonly Bill[]) {
  writeVersionedState(STORAGE_KEY, VERSION, bills);
}

function billTypeForOrder(orderType: OrderType): BillType {
  if (orderType === 'renewal' || orderType === 'rentalRenewal') return 'renewal';
  if (orderType === 'resize' || orderType === 'storageExpansion') return 'adjustment';
  if (orderType === 'refund') return 'refund';
  return 'prepaid';
}

function nextBillId(now: Date) {
  const day = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const prefix = `BILL-${day}-`;
  const sequence =
    readBills()
      .filter((bill) => bill.id.startsWith(prefix))
      .reduce((maximum, bill) => {
        const value = Number(bill.id.slice(prefix.length));
        return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
      }, 0) + 1;
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

export function createBillForOrder(order: CommerceOrder) {
  const existing = getBillForOrder(order.id);
  if (existing) return existing;
  const issuedAt = order.createdAt;
  const bill: Bill = {
    id: nextBillId(new Date(issuedAt)),
    orderId: order.id,
    billType: billTypeForOrder(order.orderType),
    productName: order.productName,
    resourceId: order.resourceId,
    amount: structuredClone(order.pricingSnapshot.total),
    lineItems: structuredClone(order.pricingSnapshot.lineItems),
    status: 'unpaid',
    issuedAt,
    dueAt: new Date(new Date(issuedAt).getTime() + 30 * 60 * 1000).toISOString(),
    billingPeriod: order.billingPeriod,
  };
  writeBills([bill, ...readBills()]);
  return bill;
}

export function createPostpaidBillForOrder(order: CommerceOrder) {
  const existing = getBillForOrder(order.id);
  if (existing) return existing;
  const issuedAt = new Date().toISOString();
  const bill: Bill = {
    id: nextBillId(new Date(issuedAt)),
    orderId: order.id,
    billType: 'postpaid',
    productName: order.productName,
    resourceId: order.resourceId,
    amount: structuredClone(order.pricingSnapshot.total),
    lineItems: structuredClone(order.pricingSnapshot.lineItems),
    status: 'unpaid',
    issuedAt,
    dueAt: order.billingPeriod?.endAt,
    billingPeriod: order.billingPeriod,
  };
  writeBills([bill, ...readBills()]);
  return bill;
}

export function updateBillStatus(
  billId: string,
  status: BillStatus,
  paymentMethod?: BillPaymentMethod,
) {
  const bills = readBills();
  const index = bills.findIndex((bill) => bill.id === billId);
  if (index < 0) throw new Error('未找到账单。');
  const current = bills[index];
  if (!canTransitionBill(current.status, status)) {
    throw new Error('当前账单不能进入目标状态。');
  }
  const next: Bill = {
    ...current,
    status,
    paidAt: status === 'paid' ? new Date().toISOString() : current.paidAt,
    paymentMethod:
      status === 'paid'
        ? paymentMethod ?? current.paymentMethod
        : current.paymentMethod,
  };
  writeBills([...bills.slice(0, index), next, ...bills.slice(index + 1)]);
  return structuredClone(next);
}

export function updateBillForOrder(
  orderId: string,
  status: BillStatus,
  paymentMethod?: BillPaymentMethod,
) {
  const bill = getBillForOrder(orderId);
  if (!bill) throw new Error('订单没有可支付账单。');
  return updateBillStatus(bill.id, status, paymentMethod);
}

export function updateBillRelations(orderId: string, resourceId: string) {
  const bills = readBills();
  const index = bills.findIndex((bill) => bill.orderId === orderId);
  if (index < 0) return undefined;
  const next: Bill = {
    ...bills[index],
    resourceId,
  };
  writeBills([...bills.slice(0, index), next, ...bills.slice(index + 1)]);
  return structuredClone(next);
}

export function cancelBillForOrder(orderId: string) {
  const bill = getBillForOrder(orderId);
  if (!bill) return undefined;
  if (bill.status === 'paid') throw new Error('已支付账单不能直接取消。');
  return updateBillStatus(bill.id, 'cancelled');
}

export function queryBills(query: BillQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readBills().filter((bill) => {
    if (
      search &&
      ![bill.id, bill.orderId, bill.productName, bill.resourceId ?? '']
        .join(' ')
        .toLocaleLowerCase()
        .includes(search)
    ) return false;
    if (query.billType && query.billType !== 'all' && bill.billType !== query.billType) return false;
    if (query.status && query.status !== 'all' && bill.status !== query.status) return false;
    return true;
  });
}

export function getBill(billId: string) {
  return readBills().find((bill) => bill.id === billId);
}

export function getBillForOrder(orderId: string) {
  return readBills().find((bill) => bill.orderId === orderId);
}

export function resetBillStore() {
  removeVersionedState(STORAGE_KEY);
}
