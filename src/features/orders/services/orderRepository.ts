import { recordOperation } from '../../operations';
import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import type {
  OrderQuery,
  OrderResourceType,
  OrderSummaryItem,
  PurchaseOrder,
} from '../types';

const STORAGE_KEY = 'computing-platform:orders';
const VERSION = 1;

const INITIAL_ORDERS: readonly PurchaseOrder[] = [
  {
    id: 'REQ-20260718-0001',
    resourceType: 'cloud-server',
    productName: '通用计算 C8',
    specificationSummary: '16 vCPU · 64 GB · Linux LTS · 30 GB 系统盘',
    quantity: 1,
    site: '东部算力中心',
    applicant: '当前用户',
    submittedAt: '2026-07-18T02:30:00.000Z',
    status: 'delivered',
    resourceId: 'cs-east-001',
    resourceName: '研发计算节点-01',
    summary: [
      { label: '资源类型', value: '云服务器' },
      { label: '站点', value: '东部算力中心' },
      { label: 'CPU', value: '16 vCPU' },
      { label: '内存', value: '64 GB' },
      { label: '系统盘', value: '30 GB' },
      { label: '镜像', value: '基础 Linux 运行镜像' },
      { label: '数据盘', value: '高性能共享存储 · 研发共享存储' },
      { label: '网络访问', value: 'SSH 已启用 · 2 条端口规则' },
    ],
    timeline: [
      { label: '申请已提交', time: '2026-07-18T02:30:00.000Z', status: 'completed', description: '资源配置申请已受理。' },
      { label: '资源准备', time: '2026-07-18T02:35:00.000Z', status: 'completed', description: '资源进入准备流程。' },
      { label: '已交付', time: '2026-07-18T03:20:00.000Z', status: 'completed', description: '资源已关联至当前申请记录。' },
    ],
  },
  {
    id: 'REQ-20260720-0002',
    resourceType: 'physical-machine',
    productName: '整机加速计算 P8',
    specificationSummary: '2 × 64 核处理器 · 1024 GB · 8 张加速卡',
    quantity: 1,
    site: '东部算力中心',
    applicant: '当前用户',
    submittedAt: '2026-07-20T05:10:00.000Z',
    status: 'preparing',
    summary: [
      { label: '资源类型', value: '物理机' },
      { label: '站点', value: '东部算力中心' },
      { label: '整机规格', value: '整机加速计算 P8' },
      { label: '数量', value: '1' },
      { label: '连接信息', value: '资源交付完成后提供' },
    ],
    timeline: [
      { label: '申请已提交', time: '2026-07-20T05:10:00.000Z', status: 'completed', description: '资源配置申请已受理。' },
      { label: '资源准备', time: '2026-07-20T05:18:00.000Z', status: 'current', description: '等待资源和网络准备。' },
    ],
  },
];

function isOrder(value: unknown): value is PurchaseOrder {
  if (!value || typeof value !== 'object') return false;
  const order = value as Partial<PurchaseOrder>;
  return (
    typeof order.id === 'string' &&
    (order.resourceType === 'cloud-server' || order.resourceType === 'physical-machine') &&
    typeof order.productName === 'string' &&
    typeof order.status === 'string' &&
    Array.isArray(order.summary) &&
    Array.isArray(order.timeline)
  );
}

function readOrders() {
  return readVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is PurchaseOrder[] =>
      Array.isArray(value) && value.every(isOrder),
    () => structuredClone(INITIAL_ORDERS) as PurchaseOrder[],
  );
}

function writeOrders(orders: readonly PurchaseOrder[]) {
  writeVersionedState(STORAGE_KEY, VERSION, orders);
}

function nextApplicationId(date: Date) {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
  const prefix = `REQ-${day}-`;
  const sequence =
    readOrders()
      .filter((order) => order.id.startsWith(prefix))
      .reduce((maximum, order) => {
        const value = Number(order.id.slice(prefix.length));
        return Number.isFinite(value) ? Math.max(maximum, value) : maximum;
      }, 0) + 1;
  return `${prefix}${String(sequence).padStart(4, '0')}`;
}

function summaryValue(summary: readonly OrderSummaryItem[], label: string) {
  return summary.find((item) => item.label === label)?.value;
}

export async function createPurchaseOrder(input: Readonly<{
  resourceType: OrderResourceType;
  productName: string;
  summary: readonly OrderSummaryItem[];
}>) {
  await Promise.resolve();
  const submittedAt = new Date().toISOString();
  const id = nextApplicationId(new Date(submittedAt));
  const quantity = Number(summaryValue(input.summary, '数量')) || 1;
  const order: PurchaseOrder = {
    id,
    resourceType: input.resourceType,
    productName: input.productName,
    specificationSummary: input.summary
      .filter((item) => ['CPU', '内存', 'GPU', '系统盘', '整机规格'].includes(item.label))
      .map((item) => item.value)
      .join(' · '),
    quantity,
    site: summaryValue(input.summary, '站点') ?? '未标注',
    applicant: '当前用户',
    submittedAt,
    status: 'pending',
    summary: input.summary.map((item) => ({ label: item.label, value: item.value })),
    timeline: [
      {
        label: '申请已提交',
        time: submittedAt,
        status: 'current',
        description: '资源配置申请已提交，等待处理。',
      },
    ],
  };
  writeOrders([order, ...readOrders()]);
  recordOperation({
    module: 'order',
    action: '提交资源配置',
    targetId: order.id,
    targetName: order.id,
    status: 'submitted',
    message: '资源配置申请已提交，等待处理。',
    targetPath: `/orders/${order.id}`,
    createdAt: submittedAt,
  });
  return order;
}

export async function queryOrders(query: OrderQuery = {}) {
  await Promise.resolve();
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readOrders().filter((order) => {
    if (search && ![order.id, order.productName, order.resourceId ?? '', order.resourceName ?? ''].join(' ').toLocaleLowerCase().includes(search)) return false;
    if (query.resourceType && query.resourceType !== 'all' && order.resourceType !== query.resourceType) return false;
    if (query.status && query.status !== 'all' && order.status !== query.status) return false;
    if (query.site && query.site !== 'all' && order.site !== query.site) return false;
    if (query.submittedAfter && order.submittedAt.slice(0, 10) < query.submittedAfter) return false;
    if (query.related === 'yes' && !order.resourceId) return false;
    if (query.related === 'no' && order.resourceId) return false;
    return true;
  });
}

export async function getOrder(orderId: string) {
  await Promise.resolve();
  return readOrders().find((order) => order.id === orderId);
}

export function getOrdersForResource(resourceId: string) {
  return readOrders().filter((order) => order.resourceId === resourceId);
}

export function resetOrderRepository() {
  removeVersionedState(STORAGE_KEY);
}
