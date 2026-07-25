import {
  createPostpaidBillForOrder,
  updateBillRelations,
  updateBillForOrder,
  type BillPaymentMethod,
} from '../../bills';
import { recordOperation } from '../../operations';
import {
  getOrder,
  updateOrderRelations,
  updateOrderStatus,
  type CommerceOrder,
} from '../../orders';
import { fulfillResourceCommerceOrder } from '../../resources/state/resourceStore';
import { getResourceByAnyId } from '../../resources/state/resourceStore';
import { fulfillStorageCommerceOrder } from '../../storage';
import { mountStorage, type PurchaseStorageInput } from '../../storage';
import { createNetworkRule } from '../../network';
import { fulfillSoftwareCommerceOrder } from '../../software';

export type PaymentMethod = BillPaymentMethod;

function fulfill(order: CommerceOrder) {
  if (
    order.productType === 'cloud-server' ||
    order.productType === 'physical-machine'
  ) {
    return fulfillResourceCommerceOrder(order);
  }
  if (order.productType === 'storage') {
    return fulfillStorageCommerceOrder(order);
  }
  if (order.productType === 'software') {
    return fulfillSoftwareCommerceOrder(order);
  }
  return [];
}

async function fulfillPurchasedConfiguration(
  order: CommerceOrder,
  resourceIds: readonly string[],
) {
  if (
    order.fulfillment?.kind !== 'resource-purchase' ||
    !resourceIds.length
  ) return;
  const configuration = order.fulfillment.configuration;
  const network = configuration.network as
    | {
        sshEnabled?: unknown;
        sourceCidr?: unknown;
        portRules?: unknown;
      }
    | undefined;
  for (const resourceId of resourceIds) {
    if (network?.sshEnabled === true && typeof network.sourceCidr === 'string') {
      await createNetworkRule({
        resourceId,
        ruleName: 'SSH 远程访问',
        protocol: 'TCP',
        port: 22,
        sourceType: network.sourceCidr.includes('/') ? 'cidr' : 'ip',
        sourceValue: network.sourceCidr,
        description: '购买配置中的 SSH 访问规则',
      });
    }
    if (Array.isArray(network?.portRules)) {
      for (const candidate of network.portRules) {
        if (!candidate || typeof candidate !== 'object') continue;
        const rule = candidate as Record<string, unknown>;
        if (
          typeof rule.ruleName !== 'string' ||
          (rule.protocol !== 'TCP' && rule.protocol !== 'UDP') ||
          typeof rule.port !== 'number' ||
          (rule.sourceType !== 'ip' &&
            rule.sourceType !== 'cidr' &&
            rule.sourceType !== 'all') ||
          typeof rule.sourceValue !== 'string'
        ) continue;
        await createNetworkRule({
          resourceId,
          ruleName: rule.ruleName,
          protocol: rule.protocol,
          port: rule.port,
          sourceType: rule.sourceType,
          sourceValue: rule.sourceValue,
          description: typeof rule.description === 'string' ? rule.description : '',
        });
      }
    }
  }

  if (configuration.storageType === 'new') {
    const storageType =
      configuration.newStorageType === 'shared' ? 'shared' : 'cloud-disk';
    const quantity = storageType === 'cloud-disk' ? resourceIds.length : 1;
    const path =
      typeof configuration.storageMountPath === 'string'
        ? configuration.storageMountPath
        : storageType === 'shared'
          ? '/data/shared'
          : '/data/storage';
    const readOnly = configuration.storageReadOnly === true;
    const storageInput: PurchaseStorageInput = {
      name: `${order.productName}数据存储`,
      type: storageType,
      skuId:
        typeof configuration.newStorageSkuId === 'string'
          ? configuration.newStorageSkuId
          : storageType === 'shared'
            ? 'storage-shared-standard-gb-month'
            : 'storage-cloud-standard-gb-month',
      performanceTier:
        typeof configuration.newStorageSkuId === 'string' &&
        configuration.newStorageSkuId.includes('performance')
          ? 'performance'
          : 'standard',
      site: order.site,
      capacityGb:
        typeof configuration.newStorageCapacityGb === 'number'
          ? configuration.newStorageCapacityGb
          : 100,
      quantity,
      durationMonths:
        order.pricingSnapshot.duration === 3 ||
        order.pricingSnapshot.duration === 6 ||
        order.pricingSnapshot.duration === 12
          ? order.pricingSnapshot.duration
          : 1,
      autoRenew: configuration.autoRenewalEnabled === true,
      protocol: storageType === 'shared' ? 'NFS' : undefined,
      mountPlan:
        storageType === 'shared'
          ? {
              mode: 'shared',
              targets: resourceIds.map((resourceId, index) => ({
                resourceId,
                resourceType: order.productType as 'cloud-server',
                mountPath: resourceIds.length > 1 ? `${path}-${index + 1}` : path,
                readOnly,
              })),
            }
          : {
              mode: 'cloud-disks',
              units: resourceIds.map((resourceId, unitIndex) => ({
                unitIndex,
                mount: {
                  resourceId,
                  resourceType: 'cloud-server',
                  mountPath: resourceIds.length > 1 ? `${path}-${unitIndex + 1}` : path,
                  deviceName: `/dev/vd${String.fromCharCode(98 + unitIndex)}`,
                  readOnly,
                },
              })),
            },
    };
    fulfillStorageCommerceOrder({
      ...order,
      fulfillment: {
        kind: 'storage-purchase',
        configuration: storageInput as unknown as Readonly<Record<string, unknown>>,
      },
    });
  } else if (
    configuration.storageType === 'existing' &&
    typeof configuration.storageSpaceId === 'string' &&
    configuration.storageSpaceId
  ) {
    const targets =
      configuration.newStorageType === 'cloud-disk'
        ? resourceIds.slice(0, 1)
        : resourceIds;
    for (const [index, resourceId] of targets.entries()) {
      const target = getResourceByAnyId(resourceId);
      if (!target) continue;
      await mountStorage(configuration.storageSpaceId, {
        resourceId,
        resourceName: target.name,
        resourceType: target.resourceType,
        mountPath:
          typeof configuration.storageMountPath === 'string'
            ? configuration.storageMountPath
            : `/data/storage-${index + 1}`,
        readOnly: configuration.storageReadOnly === true,
      });
    }
  }
}

export async function payAndFulfillOrder(
  orderId: string,
  paymentMethod: PaymentMethod,
) {
  const current = getOrder(orderId);
  if (!current) throw new Error('未找到订单。');
  if (
    current.status !== 'awaiting-payment' &&
    current.status !== 'payment-failed'
  ) {
    throw new Error('当前订单不可支付。');
  }
  updateOrderStatus(orderId, 'paying', '正在确认付款结果。');
  updateBillForOrder(orderId, 'paying');
  await Promise.resolve();
  updateBillForOrder(orderId, 'paid', paymentMethod);
  updateOrderStatus(orderId, 'paid', '关联账单已支付。');
  const fulfilling = updateOrderStatus(
    orderId,
    'fulfilling',
    '正在执行资源履约。',
  );
  const resourceIds = fulfill(fulfilling);
  await fulfillPurchasedConfiguration(fulfilling, resourceIds);
  if (resourceIds.length) {
    updateOrderRelations(orderId, resourceIds);
    updateBillRelations(orderId, resourceIds[0]!);
  }
  const completed = updateOrderStatus(
    orderId,
    'completed',
    '资源开通或变更已完成。',
  );
  recordOperation({
    module: 'order',
    action: '订单完成',
    targetId: completed.id,
    targetName: completed.productName,
    status: 'completed',
    message: '支付与应用内履约状态已完成。',
  });
  return getOrder(orderId)!;
}

export function failOrderPayment(orderId: string) {
  const current = getOrder(orderId);
  if (!current) throw new Error('未找到订单。');
  if (
    current.status !== 'awaiting-payment' &&
    current.status !== 'paying'
  ) {
    throw new Error('当前订单不在可记录支付失败的阶段。');
  }
  updateBillForOrder(orderId, 'unpaid');
  return updateOrderStatus(
    orderId,
    'payment-failed',
    '付款未完成，可重新支付或取消订单。',
  );
}

export async function fulfillPostpaidOrder(orderId: string) {
  const current = getOrder(orderId);
  if (!current) throw new Error('未找到订单。');
  if (current.billingMode !== 'pay-as-you-go') {
    throw new Error('仅按量订单可直接开通。');
  }
  const resourceIds = fulfill(current);
  await fulfillPurchasedConfiguration(current, resourceIds);
  if (resourceIds.length) updateOrderRelations(orderId, resourceIds);
  const completed = updateOrderStatus(
    orderId,
    'completed',
    '资源已开通，费用将按账期结算。',
  );
  createPostpaidBillForOrder(completed);
  return getOrder(orderId)!;
}
