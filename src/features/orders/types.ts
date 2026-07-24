import type { PriceSnapshot } from '../pricing';

export type OrderStatus = 'pending' | 'preparing' | 'delivered' | 'cancelled' | 'failed';
export type OrderResourceType = 'cloud-server' | 'physical-machine' | 'storage';
export type ApplicationType =
  | 'new-purchase'
  | 'cloud-renewal'
  | 'auto-renewal'
  | 'physical-extension'
  | 'configuration-change'
  | 'storage-purchase'
  | 'storage-expansion'
  | 'storage-renewal'
  | 'storage-mount'
  | 'storage-unmount'
  | 'storage-release'
  | 'os-reinstall'
  | 'resource-release';

export type OrderSummaryItem = Readonly<{ label: string; value: string }>;
export type OrderTimelineItem = Readonly<{
  label: string;
  time: string;
  status: 'completed' | 'current' | 'stopped';
  description: string;
}>;

export type PurchaseOrder = Readonly<{
  id: string;
  applicationType: ApplicationType;
  resourceType: OrderResourceType;
  productName: string;
  specificationSummary: string;
  quantity: number;
  site: string;
  applicant: '当前用户';
  submittedAt: string;
  status: OrderStatus;
  resourceId?: string;
  resourceIds?: readonly string[];
  resourceName?: string;
  storageId?: string;
  expectedExpiresAt?: string;
  configurationChanges?: string;
  summary: readonly OrderSummaryItem[];
  timeline: readonly OrderTimelineItem[];
  priceSnapshot: PriceSnapshot;
}>;

export type OrderQuery = Readonly<{
  search?: string;
  applicationType?: 'all' | ApplicationType;
  resourceType?: 'all' | OrderResourceType;
  status?: 'all' | OrderStatus;
  site?: string;
  submittedAfter?: string;
  related?: 'all' | 'yes' | 'no';
}>;
