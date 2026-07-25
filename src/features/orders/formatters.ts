import type { OrderStatus, OrderType } from './types';

export const ORDER_TYPE_LABELS: Readonly<Record<OrderType, string>> = {
  purchase: '新购',
  renewal: '续费',
  rentalRenewal: '续租',
  storageExpansion: '存储扩容',
  softwarePurchase: '软件购买',
  refund: '退款',
};

export const ORDER_STATUS_VIEWS: Readonly<Record<OrderStatus, {
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'error';
}>> = {
  'awaiting-payment': { label: '待支付', tone: 'warning' },
  paying: { label: '支付中', tone: 'info' },
  paid: { label: '已支付', tone: 'success' },
  fulfilling: { label: '履约中', tone: 'info' },
  completed: { label: '已完成', tone: 'success' },
  cancelled: { label: '已取消', tone: 'neutral' },
  'payment-failed': { label: '支付失败', tone: 'error' },
  refunding: { label: '退款中', tone: 'info' },
  refunded: { label: '已退款', tone: 'neutral' },
};
