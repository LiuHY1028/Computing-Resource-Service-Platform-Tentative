export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'delivered'
  | 'cancelled'
  | 'failed';

export type OrderResourceType = 'cloud-server' | 'physical-machine';

export type OrderSummaryItem = Readonly<{
  label: string;
  value: string;
}>;

export type OrderTimelineItem = Readonly<{
  label: string;
  time: string;
  status: 'completed' | 'current' | 'stopped';
  description: string;
}>;

export type PurchaseOrder = Readonly<{
  id: string;
  resourceType: OrderResourceType;
  productName: string;
  specificationSummary: string;
  quantity: number;
  site: string;
  applicant: '当前用户';
  submittedAt: string;
  status: OrderStatus;
  resourceId?: string;
  resourceName?: string;
  summary: readonly OrderSummaryItem[];
  timeline: readonly OrderTimelineItem[];
}>;

export type OrderQuery = Readonly<{
  search?: string;
  resourceType?: 'all' | OrderResourceType;
  status?: 'all' | OrderStatus;
  site?: string;
  submittedAfter?: string;
  related?: 'all' | 'yes' | 'no';
}>;
