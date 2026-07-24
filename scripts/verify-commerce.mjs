import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');
const filesUnder = (relativeDirectory) =>
  fs.readdirSync(path.join(root, relativeDirectory), { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = path.join(relativeDirectory, entry.name);
      return entry.isDirectory() ? filesUnder(relativePath) : [relativePath];
    });
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const functionBody = (source, start, end) => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  return from >= 0 && to > from ? source.slice(from, to) : '';
};

const formalFiles = [
  ...filesUnder('src/pages').filter((file) => /\.tsx$/.test(file) && !/\.test\./.test(file)),
  ...filesUnder('src/features').filter((file) =>
    /(?:components\/.*\.tsx|formatters\.ts)$/.test(file) && !/\.test\./.test(file)),
  'README.md',
];
const forbiddenCopy =
  /申请购买|提交申请|购买申请|续费申请|延期申请|扩容申请|挂载申请|卸载申请|变配申请|释放申请|申请编号|申请订单|申请记录|申请已受理|提交配置|配置已提交/;
formalFiles.forEach((file) => {
  check(!forbiddenCopy.test(read(file)), `${file} 仍包含申请型商业文案。`);
});

const orderTypes = read('src/features/orders/types.ts');
const orderStore = read('src/features/orders/state/orderStore.ts');
const billTypes = read('src/features/bills/types.ts');
const billStore = read('src/features/bills/state/billStore.ts');
const commerce = read('src/features/commerce/state/commerceFlow.ts');
const storage = read('src/features/storage/state/storageStore.ts');
const resources = read('src/features/resources/state/resourceStore.ts');
const software = read('src/features/software/state/softwareStore.ts');
const network = read('src/features/network/state/networkStore.ts');
const routes = read('src/app/routes.ts');

for (const orderType of [
  'purchase',
  'renewal',
  'rentalRenewal',
  'resize',
  'storageExpansion',
  'softwarePurchase',
  'refund',
]) {
  check(orderTypes.includes(`'${orderType}'`), `统一订单模型缺少类型：${orderType}`);
}
for (const billType of ['prepaid', 'postpaid', 'renewal', 'adjustment', 'refund']) {
  check(billTypes.includes(`'${billType}'`), `账单模型缺少类型：${billType}`);
}
check(
  orderStore.includes('structuredClone(input.pricingSnapshot)') &&
    billStore.includes('structuredClone(order.pricingSnapshot.total)') &&
    billStore.includes('structuredClone(order.pricingSnapshot.lineItems)'),
  '订单和账单没有保存独立的历史价格快照。',
);
check(
  orderStore.includes('if (requiresPayment) createBillForOrder(order)'),
  '预付费订单没有同步创建待支付账单。',
);
check(
  commerce.includes("updateOrderStatus(orderId, 'paying'") &&
    commerce.includes("updateBillForOrder(orderId, 'paid', paymentMethod)") &&
    /updateOrderStatus\(\s*orderId,\s*'provisioning'/.test(commerce) &&
    /updateOrderStatus\(\s*orderId,\s*'completed'/.test(commerce),
  '收银台未完整串联支付、开通与完成状态。',
);
check(
  orderStore.includes('cancelBillForOrder(orderId)') &&
    orderStore.includes("current.status !== 'awaiting-payment'"),
  '取消订单未限制在待支付阶段或未同步取消账单。',
);
check(
  resources.includes("orderType: 'renewal'") &&
    resources.includes("orderType: 'rentalRenewal'") &&
    resources.includes("orderType: 'resize'") &&
    resources.includes("kind: 'resource-renewal'") &&
    resources.includes("kind: 'resource-rental-renewal'") &&
    resources.includes("kind: 'resource-resize'"),
  '云服务器续费、物理机续租或收费变配未进入统一订单履约体系。',
);
check(
  storage.includes("orderType: 'purchase'") &&
    storage.includes("orderType: 'storageExpansion'") &&
    storage.includes("orderType: 'renewal'") &&
    storage.includes("kind: 'storage-expansion'") &&
    storage.includes("kind: 'storage-renewal'"),
  '存储购买、扩容或续费未进入统一订单履约体系。',
);

const mountBody = functionBody(
  storage,
  'export async function mountStorage',
  'export async function unmountStorage',
);
const unmountBody = functionBody(
  storage,
  'export async function unmountStorage',
  'export async function releaseStorage',
);
check(
  mountBody && unmountBody &&
    !mountBody.includes('createCommerceOrder') &&
    !unmountBody.includes('createCommerceOrder') &&
    mountBody.includes("status: 'completed'") &&
    unmountBody.includes("status: 'completed'"),
  '免费挂载或卸载错误创建了订单/账单，或未直接写入完成操作记录。',
);
check(
  !network.includes('createCommerceOrder') &&
    network.includes('recordOperation') &&
    network.includes("status: 'completed'"),
  '免费网络规则错误创建了订单/账单，或未直接写入完成操作记录。',
);
check(
  software.includes('fulfillSoftwareCommerceOrder') &&
    orderTypes.includes("kind: 'software-purchase'") &&
    commerce.includes('fulfillSoftwareCommerceOrder(order)'),
  '收费软件订单缺少统一履约入口。',
);
check(
  orderStore.includes("billingMode === 'pay-as-you-go'") &&
    orderStore.includes('billingPeriod: payAsYouGo') &&
    billStore.includes("billType: 'postpaid'"),
  '按量资源缺少账期或后付费账单能力。',
);
check(
  routes.includes("path: '/checkout/:orderId'") &&
    routes.includes("path: '/console/bills'") &&
    routes.includes("path: '/console/bills/:billId'"),
  '收银台或账单正式路由缺失。',
);
check(
  read('src/pages/StoragePurchasePage.tsx').includes('创建订单并支付') &&
    read('src/pages/CheckoutPage.tsx').includes('确认支付') &&
    read('src/pages/OrdersPage.tsx').includes('取消订单'),
  '购买确认、收银台或取消订单入口缺失。',
);
check(
  read('src/features/commerce/state/commerceFlow.test.ts').includes('postpaid') &&
    read('src/features/storage/state/storageStore.test.ts').includes('getBillForOrder') &&
    read('src/pages/CheckoutPage.test.tsx').includes('确认取消'),
  '交易、账单、按量和取消流程缺少自动化覆盖。',
);

if (failures.length) {
  console.error(`交易模型验证失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const invariantVerification = spawnSync(
  process.execPath,
  [
    path.join(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    'src/features/commerce/state/commerceInvariants.test.ts',
    'src/features/commerce/state/commerceFlow.test.ts',
    'src/features/resources/state/resourceStore.test.ts',
    '--reporter=dot',
  ],
  { cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1' } },
);
if (invariantVerification.status !== 0) {
  console.error('交易模型验证失败：订单、账单、价格快照或跨模块关系测试未通过。');
  console.error(invariantVerification.stdout);
  console.error(invariantVerification.stderr);
  process.exit(1);
}

console.log('交易模型验证通过：预付费订单、账单、收银台、续费、续租、存储扩容、软件履约、按量账期与免费运维边界完整。');
