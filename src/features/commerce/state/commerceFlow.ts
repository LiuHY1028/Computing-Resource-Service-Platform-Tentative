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
import { fulfillStorageCommerceOrder } from '../../storage';
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
  const provisioning = updateOrderStatus(
    orderId,
    'provisioning',
    '正在执行资源开通或变更。',
  );
  const resourceIds = fulfill(provisioning);
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
  if (resourceIds.length) updateOrderRelations(orderId, resourceIds);
  const completed = updateOrderStatus(
    orderId,
    'completed',
    '资源已开通，费用将按账期结算。',
  );
  createPostpaidBillForOrder(completed);
  return getOrder(orderId)!;
}
