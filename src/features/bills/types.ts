import type { Money, PriceLineItem } from '../pricing';

export type BillType =
  | 'prepaid'
  | 'postpaid'
  | 'renewal'
  | 'adjustment'
  | 'refund';

export type BillStatus =
  | 'unpaid'
  | 'paying'
  | 'paid'
  | 'cancelled'
  | 'refunding'
  | 'refunded';

export type BillPaymentMethod =
  | 'account-balance'
  | 'enterprise-account'
  | 'online-payment';

export type Bill = Readonly<{
  id: string;
  orderId: string;
  billType: BillType;
  productName: string;
  resourceId?: string;
  amount: Money;
  lineItems: readonly PriceLineItem[];
  status: BillStatus;
  issuedAt: string;
  dueAt?: string;
  paidAt?: string;
  paymentMethod?: BillPaymentMethod;
  billingPeriod?: Readonly<{ startAt: string; endAt: string }>;
}>;

export type BillQuery = Readonly<{
  search?: string;
  billType?: 'all' | BillType;
  status?: 'all' | BillStatus;
}>;
