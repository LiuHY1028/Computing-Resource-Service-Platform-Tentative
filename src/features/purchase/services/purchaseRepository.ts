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
const DEFAULT_READ_DELAY_MS = 180;
const DEFAULT_SUBMIT_DELAY_MS = 520;

export class PurchaseRepositoryError extends Error {
  constructor(message = '商品读取失败，请重试。') {
    super(message);
    this.name = 'PurchaseRepositoryError';
  }
}

async function wait(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  await new Promise<void>((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, Math.max(0, delayMs));
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

export async function loadPurchaseProduct(
  productId: string,
  options: Readonly<{
    delayMs?: number;
    simulateError?: boolean;
    signal?: AbortSignal;
  }> = {},
) {
  await wait(options.delayMs ?? DEFAULT_READ_DELAY_MS, options.signal);
  if (options.simulateError) throw new PurchaseRepositoryError();
  return getMarketplaceProductById(productId);
}

export async function submitConfiguration(
  resourceType: MarketplaceResourceType,
  productName: string,
  summary: readonly PurchaseSummaryItem[],
  options: Readonly<{ delayMs?: number }> = {},
): Promise<PurchaseSubmissionResult> {
  await wait(options.delayMs ?? DEFAULT_SUBMIT_DELAY_MS);
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
  window.sessionStorage.setItem(draftKey(productId), JSON.stringify(envelope));
}

export function loadPurchaseDraft<T extends PurchaseConfiguration>(
  productId: string,
  resourceType: MarketplaceResourceType,
): T | undefined {
  const raw = window.sessionStorage.getItem(draftKey(productId));
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw) as Partial<PurchaseDraftEnvelope<T>>;
    if (
      parsed.version !== DRAFT_VERSION ||
      parsed.productId !== productId ||
      parsed.resourceType !== resourceType ||
      !parsed.configuration
    ) {
      window.sessionStorage.removeItem(draftKey(productId));
      return undefined;
    }
    return parsed.configuration;
  } catch {
    window.sessionStorage.removeItem(draftKey(productId));
    return undefined;
  }
}

export function clearPurchaseDraft(productId: string) {
  window.sessionStorage.removeItem(draftKey(productId));
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
