import type {
  BillPaymentMethod,
  BillStatus,
  BillType,
} from './types';

export const BILL_TYPE_LABELS: Readonly<Record<BillType, string>> = {
  prepaid: '预付费',
  postpaid: '后付费',
  renewal: '续费',
  adjustment: '调整',
  refund: '退款',
};

export const BILL_STATUS_VIEWS: Readonly<Record<BillStatus, {
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'error';
}>> = {
  unpaid: { label: '待支付', tone: 'warning' },
  paying: { label: '支付中', tone: 'info' },
  paid: { label: '已支付', tone: 'success' },
  cancelled: { label: '已取消', tone: 'neutral' },
  refunding: { label: '退款中', tone: 'info' },
  refunded: { label: '已退款', tone: 'neutral' },
};

export const BILL_PAYMENT_METHOD_LABELS: Readonly<
  Record<BillPaymentMethod, string>
> = {
  'account-balance': '账户余额',
  'enterprise-account': '企业付款账户',
  'online-payment': '在线支付',
};
