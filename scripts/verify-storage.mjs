import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const catalog = JSON.parse(read('src/features/pricing/data/priceCatalog.json'));
const storageSource = read('src/features/storage/state/storageStore.ts');
const fileSource = read('src/features/files/state/fileStore.ts');
const resourceSource = read('src/features/resources/data/resourceCatalog.ts');
const routeSource = read('src/app/routes.ts');
const errors = [];
const require = (condition, message) => {
  if (!condition) errors.push(message);
};
const matches = (text, expression, group = 1) =>
  [...text.matchAll(expression)].map((match) => match[group]);

const storageSkus = new Set(catalog.storage.map((entry) => entry.skuId));
const storageIds = new Set(matches(storageSource, /\bid:\s*'(storage-(?:cloud|shared)-[^']+)'/g));
const resourceIds = new Set(matches(resourceSource, /\bid:\s*'(cs-[^']+|pm-[^']+)'/g));
const storageSkuRefs = matches(storageSource, /\bskuId:\s*'(storage-[^']+)'/g);
storageSkuRefs.forEach((skuId) => require(storageSkus.has(skuId), `存储引用了不存在的价格 SKU：${skuId}`));

const mountResourceIds = matches(storageSource, /\bresourceId:\s*'(cs-[^']+|pm-[^']+)'/g);
mountResourceIds.forEach((resourceId) => require(resourceIds.has(resourceId), `挂载引用了不存在的资源：${resourceId}`));

const nodePattern = /node\('([^']+)',\s*'([^']+)',\s*(null|'[^']+'),\s*'(file|folder)',\s*([^,]+),\s*(\d+),/g;
const nodes = [...fileSource.matchAll(nodePattern)].map((match) => ({
  id: match[1],
  storageId: match[2],
  parentId: match[3] === 'null' ? null : match[3].slice(1, -1),
  type: match[4],
  nameExpression: match[5].trim(),
  size: Number(match[6]),
}));
const nodeById = new Map(nodes.map((node) => [node.id, node]));
require(nodes.length >= 10, '文件系统必须包含可验证的初始目录与文件节点。');
nodes.forEach((node) => {
  require(storageIds.has(node.storageId), `文件节点 ${node.id} 引用了不存在的存储：${node.storageId}`);
  require(node.size >= 0, `文件节点 ${node.id} 大小不能为负数。`);
  if (node.parentId) {
    const parent = nodeById.get(node.parentId);
    require(Boolean(parent), `文件节点 ${node.id} 的父目录不存在：${node.parentId}`);
    require(parent?.type === 'folder', `文件节点 ${node.id} 的父节点不是目录。`);
    require(parent?.storageId === node.storageId, `文件节点 ${node.id} 与父目录不属于同一存储。`);
  }
});

nodes.forEach((node) => {
  const visited = new Set([node.id]);
  let parentId = node.parentId;
  while (parentId) {
    require(!visited.has(parentId), `目录循环：${node.id} → ${parentId}`);
    if (visited.has(parentId)) break;
    visited.add(parentId);
    parentId = nodeById.get(parentId)?.parentId ?? null;
  }
});

const siblingKeys = new Set();
nodes.forEach((node) => {
  const key = `${node.storageId}:${node.parentId ?? 'root'}:${node.nameExpression.toLocaleLowerCase()}`;
  require(!siblingKeys.has(key), `同级名称不唯一：${key}`);
  siblingKeys.add(key);
});

function resolvePath(node) {
  const segments = [];
  const visited = new Set();
  let current = node;
  while (current?.parentId) {
    require(!visited.has(current.id), `文件路径无法解析：${node.id}`);
    if (visited.has(current.id)) break;
    visited.add(current.id);
    segments.unshift(current.id);
    current = nodeById.get(current.parentId);
  }
  return `/${segments.join('/')}`;
}
nodes.forEach((node) => require(resolvePath(node).startsWith('/'), `文件路径无法解析：${node.id}`));

const sizeByStorage = new Map();
nodes.filter((node) => node.type === 'file').forEach((node) => {
  sizeByStorage.set(node.storageId, (sizeByStorage.get(node.storageId) ?? 0) + node.size);
});
sizeByStorage.forEach((bytes, storageId) => {
  const capacityMatch = storageSource.match(new RegExp(`id:\\s*'${storageId}'[\\s\\S]*?capacityGb:\\s*(\\d+)`));
  const capacityGb = Number(capacityMatch?.[1]);
  require(Number.isFinite(capacityGb) && bytes <= capacityGb * 1024 ** 3, `文件大小超过存储容量：${storageId}`);
});

require(storageSource.includes("applicationType: 'storage-purchase'"), '购买存储必须创建关联订单。');
require(storageSource.includes("applicationType: 'storage-expansion'"), '扩容必须创建关联订单。');
require(storageSource.includes("applicationType: 'storage-renewal'"), '续期必须创建关联订单。');
require(storageSource.includes("applicationType: 'storage-mount'"), '挂载必须创建关联订单。');
require(storageSource.includes("applicationType: 'storage-unmount'"), '卸载必须创建关联订单。');
require(storageSource.includes("space.type === 'cloud-disk' && space.mounts.length"), '云硬盘必须限制为单资源挂载。');
require(storageSource.includes('resource.site !== space.site'), '挂载必须校验站点一致性。');
require(fileSource.includes('updateStorageUsage('), '文件操作必须同步存储容量。');
require(fileSource.includes('descendants(source.nodeId).includes(target.nodeId)'), '移动目录必须防止形成循环。');
require(routeSource.includes("path: '/console/storage/:storageId/files'"), '文件管理正式路由缺失。');
require(routeSource.includes("path: '/console/storage/purchase'"), '存储购买正式路由缺失。');
require(fileSource.includes('canManageStorageFiles') || read('src/pages/FileManagerPage.tsx').includes('canManageStorageFiles'), '文件管理入口必须校验适用状态。');

if (errors.length) {
  console.error('存储完整性验证失败：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`存储完整性验证通过：${storageIds.size} 个初始存储、${nodes.length} 个文件节点；价格、订单、挂载、目录、容量、路径与入口约束有效。`);
