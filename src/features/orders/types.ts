import type { PriceSnapshot } from '../pricing';

export type OrderStatus =
  | 'awaiting-payment'
  | 'paying'
  | 'paid'
  | 'fulfilling'
  | 'completed'
  | 'cancelled'
  | 'payment-failed'
  | 'refunding'
  | 'refunded';

export type OrderType =
  | 'purchase'
  | 'renewal'
  | 'rentalRenewal'
  | 'storageExpansion'
  | 'softwarePurchase'
  | 'refund';

export type OrderProductType =
  | 'cloud-server'
  | 'physical-machine'
  | 'storage'
  | 'software';

export type OrderSummaryItem = Readonly<{ label: string; value: string }>;

export type OrderLineItem = Readonly<{
  id: string;
  name: string;
  description?: string;
  quantity: number;
  amount: PriceSnapshot['total'];
}>;

export type OrderTimelineItem = Readonly<{
  label: string;
  time: string;
  status: 'completed' | 'current' | 'stopped';
  description: string;
}>;

export type CommerceFulfillment =
  | Readonly<{
      kind: 'resource-purchase';
      resourceType: 'cloud-server' | 'physical-machine';
      skuId: string;
      configuration: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      kind: 'storage-purchase';
      configuration: Readonly<Record<string, unknown>>;
    }>
  | Readonly<{
      kind: 'resource-renewal' | 'resource-rental-renewal';
      resourceId: string;
      periodMonths: 1 | 3 | 6 | 12;
    }>
  | Readonly<{
      kind: 'storage-renewal';
      storageId: string;
      periodMonths: 1 | 3 | 6 | 12;
    }>
  | Readonly<{
      kind: 'storage-expansion';
      storageId: string;
      capacityGb: number;
    }>
  | Readonly<{
      kind: 'software-purchase';
      softwareId: string;
      resourceId: string;
      version: string;
    }>;

export type CommerceOrder = Readonly<{
  id: string;
  orderType: OrderType;
  productType: OrderProductType;
  productName: string;
  resourceId?: string;
  resourceIds?: readonly string[];
  resourceName?: string;
  items: readonly OrderLineItem[];
  pricingSnapshot: PriceSnapshot;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  site: string;
  quantity: number;
  billingMode: string;
  billingPeriod?: Readonly<{ startAt: string; endAt: string }>;
  configurationSummary: readonly OrderSummaryItem[];
  timeline: readonly OrderTimelineItem[];
  fulfillment?: CommerceFulfillment;
}>;

export type PurchaseOrder = CommerceOrder;

export type OrderQuery = Readonly<{
  search?: string;
  orderType?: 'all' | OrderType;
  productType?: 'all' | OrderProductType;
  status?: 'all' | OrderStatus;
  site?: string;
  createdAfter?: string;
  related?: 'all' | 'yes' | 'no';
}>;
