import {
  getMarketplaceProductById,
  type MarketplaceResourceType,
} from '../../marketplace';
import { createPurchaseOrder } from '../../orders';
import { fulfillPostpaidOrder } from '../../commerce';
import {
  createPriceSnapshot,
  type PriceQuote,
} from '../../pricing';
import type {
  CloudPurchaseConfiguration,
  PurchaseSubmissionResult,
  PhysicalPurchaseConfiguration,
  PurchaseConfiguration,
  PurchaseDraftEnvelope,
  PurchaseSummaryItem,
} from '../types';

const DRAFT_VERSION = 2;
const draftMemory = new Map<string, string>();

export function loadPurchaseProduct(productId: string) {
  return getMarketplaceProductById(productId);
}

export async function submitConfiguration(
  resourceType: MarketplaceResourceType,
  productName: string,
  summary: readonly PurchaseSummaryItem[],
  quote: PriceQuote,
  skuId: string,
  configuration: PurchaseConfiguration,
): Promise<PurchaseSubmissionResult> {
  const priceSnapshot = createPriceSnapshot(skuId, quote);
  const order = await createPurchaseOrder({
    resourceType,
    productName,
    summary,
    priceSnapshot,
    fulfillment: {
      kind: 'resource-purchase',
      resourceType,
      skuId,
      configuration: structuredClone(configuration) as unknown as Readonly<Record<string, unknown>>,
    },
  });
  const completedOrder =
    priceSnapshot.billingMode === 'pay-as-you-go'
      ? await fulfillPostpaidOrder(order.id)
      : order;
  return {
    orderId: order.id,
    orderStatus:
      completedOrder.status === 'completed' ? 'completed' : 'awaiting-payment',
    resourceType,
    productName,
    summary,
    priceSnapshot,
    quote,
  };
}

function draftKey(productId: string) {
  return `purchase-draft:v${DRAFT_VERSION}:${productId}`;
}

export function savePurchaseDraft<T extends PurchaseConfiguration>(
  productId: string,
  resourceType: MarketplaceResourceType,
  configuration: T,
  step: 'configuration' | 'confirmation' = 'configuration',
) {
  const envelope: PurchaseDraftEnvelope<T> = {
    version: DRAFT_VERSION,
    productId,
    resourceType,
    productKind: 'compute',
    step,
    updatedAt: new Date().toISOString(),
    configuration,
  };
  const serialized = JSON.stringify(envelope);
  draftMemory.set(draftKey(productId), serialized);
  try {
    window.sessionStorage.setItem(draftKey(productId), serialized);
  } catch {
    // The current-page draft remains available from memory.
  }
}

export function loadPurchaseDraft<T extends PurchaseConfiguration>(
  productId: string,
  resourceType: MarketplaceResourceType,
): PurchaseDraftEnvelope<T> | undefined {
  const key = draftKey(productId);
  let raw = draftMemory.get(key);
  if (!raw) {
    try {
      raw = window.sessionStorage.getItem(key) ?? undefined;
    } catch {
      raw = undefined;
    }
  }
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<PurchaseDraftEnvelope<T>>;
    if (
      parsed.version !== DRAFT_VERSION ||
      parsed.productId !== productId ||
      parsed.resourceType !== resourceType ||
      parsed.productKind !== 'compute' ||
      (parsed.step !== 'configuration' && parsed.step !== 'confirmation') ||
      typeof parsed.updatedAt !== 'string' ||
      !parsed.configuration
    ) {
      clearPurchaseDraft(productId);
      return undefined;
    }
    return parsed as PurchaseDraftEnvelope<T>;
  } catch {
    clearPurchaseDraft(productId);
    return undefined;
  }
}

export function clearPurchaseDraft(productId: string) {
  const key = draftKey(productId);
  draftMemory.delete(key);
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // The in-memory draft has already been cleared.
  }
}

export function isCloudDraft(
  configuration: unknown,
): configuration is CloudPurchaseConfiguration {
  if (!isRecord(configuration) || !isNetworkConfiguration(configuration.network)) {
    return false;
  }
  return (
    typeof configuration.instanceName === 'string' &&
    typeof configuration.quantity === 'string' &&
    typeof configuration.purpose === 'string' &&
    typeof configuration.systemDiskGb === 'number' &&
    (configuration.storageType === 'none' ||
      configuration.storageType === 'new' ||
      configuration.storageType === 'existing') &&
    (configuration.newStorageType === 'cloud-disk' || configuration.newStorageType === 'shared') &&
    typeof configuration.newStorageSkuId === 'string' &&
    typeof configuration.newStorageCapacityGb === 'number' &&
    typeof configuration.storageSpaceId === 'string' &&
    typeof configuration.storageMountPath === 'string' &&
    typeof configuration.storageReadOnly === 'boolean' &&
    (configuration.imageId === null || typeof configuration.imageId === 'string')
    && (configuration.billingMode === 'subscription' || configuration.billingMode === 'pay-as-you-go')
    && typeof configuration.periodMonths === 'string'
    && ['1', '3', '6', '12'].includes(configuration.periodMonths)
    && typeof configuration.autoRenewalEnabled === 'boolean'
  );
}

export function isPhysicalDraft(
  configuration: unknown,
): configuration is PhysicalPurchaseConfiguration {
  return (
    isRecord(configuration) &&
    typeof configuration.resourceName === 'string' &&
    typeof configuration.quantity === 'string' &&
    typeof configuration.purpose === 'string' &&
    typeof configuration.periodMonths === 'string' &&
    ['1', '3', '6', '12'].includes(configuration.periodMonths) &&
    isNetworkConfiguration(configuration.network)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNetworkConfiguration(value: unknown) {
  if (!isRecord(value) || !Array.isArray(value.portRules)) return false;
  return (
    typeof value.sshEnabled === 'boolean' &&
    typeof value.sourceCidr === 'string' &&
    value.portRules.every(
      (rule) =>
        isRecord(rule) &&
        typeof rule.id === 'string' &&
        (rule.protocol === 'TCP' || rule.protocol === 'UDP') &&
        typeof rule.ruleName === 'string' &&
        typeof rule.port === 'number' &&
        (rule.sourceType === 'ip' || rule.sourceType === 'cidr' || rule.sourceType === 'all') &&
        typeof rule.sourceValue === 'string' &&
        typeof rule.description === 'string',
    )
  );
}
