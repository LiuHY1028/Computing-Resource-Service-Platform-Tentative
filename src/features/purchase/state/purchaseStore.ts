import {
  getMarketplaceProductById,
  type MarketplaceResourceType,
} from '../../marketplace';
import { createPurchaseOrder } from '../../orders';
import type {
  CloudPurchaseConfiguration,
  PurchaseSubmissionResult,
  PhysicalPurchaseConfiguration,
  PurchaseConfiguration,
  PurchaseDraftEnvelope,
  PurchaseSummaryItem,
} from '../types';

const DRAFT_VERSION = 1;
const draftMemory = new Map<string, string>();

export function loadPurchaseProduct(productId: string) {
  return getMarketplaceProductById(productId);
}

export async function submitConfiguration(
  resourceType: MarketplaceResourceType,
  productName: string,
  summary: readonly PurchaseSummaryItem[],
): Promise<PurchaseSubmissionResult> {
  const order = await createPurchaseOrder({
    resourceType,
    productName,
    summary,
  });
  return {
    applicationId: order.id,
    orderId: order.id,
    resourceType,
    productName,
    summary,
  };
}

function draftKey(productId: string) {
  return `purchase-draft:v${DRAFT_VERSION}:${productId}`;
}

export function savePurchaseDraft<T extends PurchaseConfiguration>(
  productId: string,
  resourceType: MarketplaceResourceType,
  configuration: T,
) {
  const envelope: PurchaseDraftEnvelope<T> = {
    version: DRAFT_VERSION,
    productId,
    resourceType,
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
): T | undefined {
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
      !parsed.configuration
    ) {
      clearPurchaseDraft(productId);
      return undefined;
    }
    return parsed.configuration;
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
      configuration.storageType === 'host-path' ||
      configuration.storageType === 'shared') &&
    typeof configuration.hostPath === 'string' &&
    typeof configuration.hostMountPath === 'string' &&
    typeof configuration.hostReadOnly === 'boolean' &&
    typeof configuration.storageSpaceId === 'string' &&
    typeof configuration.sharedMountPath === 'string' &&
    typeof configuration.sharedReadOnly === 'boolean' &&
    (configuration.imageId === null || typeof configuration.imageId === 'string')
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
        typeof rule.servicePort === 'number' &&
        typeof rule.mappedPort === 'number' &&
        typeof rule.source === 'string' &&
        typeof rule.description === 'string',
    )
  );
}
