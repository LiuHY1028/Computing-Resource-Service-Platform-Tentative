import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const source = {
  resources: read('src/features/resources/data/resourceCatalog.ts'),
  resourceStore: read('src/features/resources/state/resourceStore.ts'),
  orders: read('src/features/orders/state/orderStore.ts'),
  bills: read('src/features/bills/state/billStore.ts'),
  storage: read('src/features/storage/state/storageStore.ts'),
  images: read('src/features/images/state/imageStore.ts'),
  software: read('src/features/software/state/softwareStore.ts'),
  network: read('src/features/network/state/networkStore.ts'),
  operations: read('src/features/operations/state/operationsStore.ts'),
};

function matches(text, expression, group = 1) {
  return [...text.matchAll(expression)].map((match) => match[group]);
}

const resourceIds = new Set(matches(source.resources, /\bid:\s*'(cs-[^']+|pm-[^']+)'/g));
const cloudIds = new Set([...resourceIds].filter((id) => id.startsWith('cs-')));
const physicalIds = new Set([...resourceIds].filter((id) => id.startsWith('pm-')));
const imageIds = new Set(matches(source.images, /\bid:\s*'((?:preset|image)-[^']+)'/g));
const storageIds = new Set(matches(source.storage, /\bid:\s*'(storage-[^']+)'/g));
const orderIds = new Set(matches(source.orders, /\bid:\s*'(ORD-[^']+)'/g));
const errors = [];

function requireReferences(label, ids, validIds) {
  ids.forEach((id) => {
    if (!validIds.has(id)) errors.push(`${label} 引用了不存在的对象：${id}`);
  });
}

requireReferences('订单', matches(source.orders, /\bresourceId:\s*'(cs-[^']+|pm-[^']+)'/g), resourceIds);
requireReferences('账单', matches(source.bills, /\borderId:\s*'(ORD-[^']+)'/g), orderIds);
requireReferences('存储挂载', matches(source.storage, /\bresourceId:\s*'(cs-[^']+|pm-[^']+)'/g), resourceIds);
requireReferences('镜像关联', matches(source.images, /'(cs-[^']+|pm-[^']+)'/g), resourceIds);
requireReferences('软件安装', matches(source.software, /\bresourceId:\s*'(cs-[^']+|pm-[^']+)'/g), resourceIds);
requireReferences('网络规则', matches(source.network, /\bresourceId:\s*'(cs-[^']+|pm-[^']+)'/g), resourceIds);
requireReferences('资源操作记录', matches(source.operations, /\btargetId:\s*'(cs-[^']+|pm-[^']+)'/g), resourceIds);
requireReferences('资源镜像', matches(source.resources, /\bimageId:\s*'([^']+)'/g), imageIds);
requireReferences('资源存储', matches(source.resources, /\bstorageId:\s*'([^']+)'/g), storageIds);

const allSourceFiles = fs.readdirSync(path.join(root, 'src'), { recursive: true })
  .filter((entry) => typeof entry === 'string' && /\.(?:ts|tsx)$/.test(entry))
  .map((entry) => read(path.join('src', entry)))
  .join('\n');
requireReferences(
  '详情页内置路由',
  matches(allSourceFiles, /\/resources\/(?:cloud-servers|physical-machines)\/(cs-[A-Za-z0-9-]+|pm-[A-Za-z0-9-]+)/g),
  resourceIds,
);

if (!source.resourceStore.includes("orderType: 'renewal'") || !source.resourceStore.includes("current.resourceType !== 'cloud-server'")) {
  errors.push('云服务器续费订单缺少资源类型与存在性校验。');
}
if (!source.resourceStore.includes("orderType: 'rentalRenewal'") || !source.resourceStore.includes("current.resourceType !== 'physical-machine'")) {
  errors.push('物理机续租订单缺少资源类型与存在性校验。');
}
if (
  !source.resourceStore.includes("? 'releasing'") ||
  !source.storage.includes("status: 'releasing'") ||
  !source.storage.includes("action: '释放存储'")
) {
  errors.push('资源或存储释放缺少单一释放中状态与操作记录。');
}
if (
  !source.orders.includes('createBillForOrder(order)') ||
  !source.bills.includes('structuredClone(order.pricingSnapshot.total)')
) {
  errors.push('订单与账单关系或金额快照未集中维护。');
}
if (cloudIds.size === 0 || physicalIds.size === 0) {
  errors.push('资源目录必须同时包含云服务器和物理机。');
}

if (errors.length) {
  console.error('关系完整性验证失败：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`关系完整性验证通过：${cloudIds.size} 台云服务器、${physicalIds.size} 台物理机；订单、账单、存储、镜像、软件、网络、操作记录与详情路由引用有效。`);
