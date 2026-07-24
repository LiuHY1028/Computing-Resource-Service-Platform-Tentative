import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');
const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const resourceTypes = read('src/features/resources/types.ts');
const resourceFormatters = read('src/features/resources/formatters.ts');
const resourceTable = read('src/features/resources/components/ResourceTable.tsx');
const resourceDetail = read('src/features/resources/components/ResourceDetailPanels.tsx');
const storageTypes = read('src/features/storage/types.ts');
const storagePage = read('src/pages/StoragePage.tsx');
const orderTypes = read('src/features/orders/types.ts');
const orderPage = read('src/pages/OrdersPage.tsx');
const billTypes = read('src/features/bills/types.ts');
const billPage = read('src/pages/BillsPage.tsx');
const softwareTypes = read('src/features/software/types.ts');
const softwarePage = read('src/pages/SoftwarePage.tsx');
const fileTypes = read('src/features/files/types.ts');
const filePage = read('src/pages/FileManagerPage.tsx');
const operationTypes = read('src/features/operations/types.ts');
const operationFormatters = read('src/features/operations/formatters.ts');

const requiredResourceStatuses = [
  'creating',
  'running',
  'stopped',
  'restarting',
  'resizing',
  'preparing',
  'powered-off',
  'maintenance',
  'expiring',
  'expired',
  'releasing',
  'abnormal',
];
requiredResourceStatuses.forEach((status) => {
  check(
    resourceTypes.includes(`'${status}'`) &&
      resourceFormatters.includes(`${status.includes('-') ? `'${status}'` : status}:`),
    `资源主状态缺少统一类型或文案映射：${status}`,
  );
});

const requiredStorageStatuses = [
  'creating',
  'available',
  'attaching',
  'attached',
  'detaching',
  'expanding',
  'renewing',
  'expiring',
  'expired',
  'releasing',
  'abnormal',
];
requiredStorageStatuses.forEach((status) =>
  check(storageTypes.includes(`'${status}'`), `存储主状态缺失：${status}`),
);

const requiredOrderStatuses = [
  'awaiting-payment',
  'paying',
  'paid',
  'provisioning',
  'completed',
  'cancelled',
  'payment-failed',
  'refunding',
  'refunded',
];
requiredOrderStatuses.forEach((status) =>
  check(orderTypes.includes(`'${status}'`), `订单主状态缺失：${status}`),
);

const requiredTaskStatuses = [
  'waiting',
  'executing',
  'completed',
  'failed',
  'cancelled',
];
for (const [label, source] of [
  ['软件安装任务', softwareTypes],
  ['文件任务', fileTypes],
  ['操作记录', operationTypes],
]) {
  requiredTaskStatuses.forEach((status) =>
    check(source.includes(`'${status}'`), `${label}主状态缺失：${status}`),
  );
}
for (const [status, label] of [
  ['waiting', '等待执行'],
  ['executing', '执行中'],
  ['completed', '已完成'],
  ['failed', '失败'],
  ['cancelled', '已取消'],
]) {
  check(
    operationFormatters.includes(`${status}: { label: '${label}'`) &&
      softwarePage.includes(`${status}: '${label}'`) &&
      filePage.includes(`${status}: { label: '${label}'`),
    `任务状态文案或视觉映射不一致：${label}`,
  );
}

for (const status of [
  'unpaid',
  'paying',
  'paid',
  'cancelled',
  'refunding',
  'refunded',
]) {
  check(billTypes.includes(`'${status}'`), `账单主状态缺失：${status}`);
}
check(
  resourceTable.includes('<ResourceStatusBadge status={resource.status} />') &&
    resourceTable.includes('resource-table__auxiliary') &&
    !resourceTable.match(/resource-table__status-stack[\s\S]{0,400}<StatusBadge/),
  '资源列表必须只用一个主状态徽标，健康信息应为普通辅助文字。',
);
check(
  (resourceDetail.match(/<ResourceStatusBadge/g) ?? []).length === 1 &&
    resourceDetail.includes("['运行状态', RESOURCE_STATUS_LABELS[resource.status]]") &&
    resourceDetail.includes("['实例健康'") === false,
  '资源详情顶部之外仍存在重复主状态徽标。',
);
check(
  storagePage.includes("return <StatusBadge tone={view.tone}>{view.label}</StatusBadge>") &&
    !storagePage.includes('<StatusBadge tone={mount.status'),
  '存储列表或挂载关系仍并列显示多个主状态。',
);
check(
  orderPage.includes('ORDER_STATUS_VIEWS[order.status]') &&
    !orderPage.match(/paymentStatus|provisionStatus|applicationStatus|requestStatus/),
  '订单页面未使用统一单一状态映射。',
);
check(
  billPage.includes('BILL_STATUS_VIEWS[bill.status]'),
  '账单页面未使用统一单一状态映射。',
);
check(
  (softwarePage.match(/<StatusBadge/g) ?? []).length === 1 &&
    softwarePage.includes('software-card__compatibility'),
  '软件卡片的兼容性仍被误作第二个状态徽标。',
);

const forbiddenLegacyFields =
  /lifecycleRequestState|pendingExpiresAt|extensionStatus|applicationStatus|requestStatus|paymentStatus|provisionStatus|runtimeStatus/;
const statusSources = [
  resourceTypes,
  resourceTable,
  resourceDetail,
  storageTypes,
  storagePage,
  orderTypes,
  orderPage,
  billTypes,
  billPage,
];
check(
  statusSources.every((source) => !forbiddenLegacyFields.test(source)),
  '正式状态模型仍残留旧的并列状态字段。',
);

if (failures.length) {
  console.error(`状态模型验证失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const componentVerification = spawnSync(
  process.execPath,
  [
    path.join(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    'src/pages/CommerceStatus.test.tsx',
    '--reporter=dot',
  ],
  { cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1' } },
);
if (componentVerification.status !== 0) {
  console.error('状态模型验证失败：正式列表或详情的单一状态组件测试未通过。');
  console.error(componentVerification.stdout);
  console.error(componentVerification.stderr);
  process.exit(1);
}

console.log('状态模型验证通过：资源、存储、订单、账单和任务均使用单一主状态；健康、到期与兼容性为辅助信息。');
