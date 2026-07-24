import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const read = (relativePath) =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');
const catalog = JSON.parse(
  read('src/features/pricing/data/priceCatalog.json'),
);
const source = {
  marketplace: read('src/features/marketplace/data/marketplaceProducts.ts'),
  calculate: read('src/features/pricing/calculatePrice.ts'),
  orders: read('src/features/orders/state/orderStore.ts'),
  orderTypes: read('src/features/orders/types.ts'),
  resources: read('src/features/resources/data/resourceCatalog.ts'),
  resourceStore: read('src/features/resources/state/resourceStore.ts'),
  storage: read('src/features/storage/state/storageStore.ts'),
};
const errors = [];
const matches = (text, expression, group = 1) =>
  [...text.matchAll(expression)].map((match) => match[group]);
const computeBySku = new Map(
  catalog.compute.map((entry) => [entry.skuId, entry]),
);
const storageBySku = new Map(
  catalog.storage.map((entry) => [entry.skuId, entry]),
);
const validSkuIds = new Set([...computeBySku.keys(), ...storageBySku.keys()]);

function require(condition, message) {
  if (!condition) errors.push(message);
}

function validateFenValues(value, pathParts = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      validateFenValues(item, [...pathParts, String(index)]),
    );
    return;
  }
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, item]) => {
    const itemPath = [...pathParts, key];
    if (key.endsWith('Fen')) {
      require(
        Number.isSafeInteger(item) && item >= 0,
        `${itemPath.join('.')} 必须是非负整数分。`,
      );
    }
    validateFenValues(item, itemPath);
  });
}

validateFenValues(catalog);
require(catalog.currency === 'CNY', '价格目录币种必须为 CNY。');

const marketplaceSkuIds = matches(
  source.marketplace,
  /\bskuId:\s*'([^']+)'/g,
);
require(marketplaceSkuIds.length === 10, '商城必须包含 10 个明确 SKU。');
marketplaceSkuIds.forEach((skuId) =>
  require(computeBySku.has(skuId), `商城 SKU 缺少价格：${skuId}`),
);

const cloudPrices = catalog.compute.filter(
  (entry) => entry.resourceType === 'cloud-server',
);
const physicalPrices = catalog.compute.filter(
  (entry) => entry.resourceType === 'physical-machine',
);
require(cloudPrices.length === 6, '云服务器价格目录必须覆盖 6 个 SKU。');
require(physicalPrices.length === 4, '物理机价格目录必须覆盖 4 个 SKU。');
cloudPrices.forEach((entry) => {
  require(
    Number.isSafeInteger(entry.monthlyPriceFen) && entry.monthlyPriceFen > 0,
    `云服务器 SKU 缺少有效月价：${entry.skuId}`,
  );
  require(
    Number.isSafeInteger(entry.hourlyPriceFen) && entry.hourlyPriceFen > 0,
    `云服务器 SKU 缺少有效小时价：${entry.skuId}`,
  );
});
physicalPrices.forEach((entry) =>
  require(
    Number.isSafeInteger(entry.monthlyPriceFen) && entry.monthlyPriceFen > 0,
    `物理机 SKU 缺少有效月租价：${entry.skuId}`,
  ),
);
catalog.storage.forEach((entry) =>
  require(
    Number.isSafeInteger(entry.unitPriceFen) && entry.unitPriceFen > 0,
    `可收费存储缺少有效单价：${entry.skuId}`,
  ),
);
catalog.images
  .filter((entry) => entry.policy === 'free' || entry.policy === 'included')
  .forEach((entry) =>
    require(entry.monthlyPriceFen === 0, `免费或包含镜像不得重复计费：${entry.imageId}`),
  );
catalog.software
  .filter((entry) => entry.policy !== 'monthly')
  .forEach((entry) =>
    require(entry.monthlyPriceFen === 0, `非月费软件不得写入金额：${entry.softwareId}`),
  );

for (const [label, text] of [
  ['资源', source.resources],
  ['存储', source.storage],
]) {
  matches(text, /\bskuId:\s*'([^']+)'/g).forEach((skuId) =>
    require(validSkuIds.has(skuId), `${label}引用无效价格 SKU：${skuId}`),
  );
}

require(
  source.calculate.includes("category: 'systemDisk'") &&
    source.calculate.includes('unitPriceFen: 0') &&
    source.calculate.includes('included: true'),
  '30 GB 系统盘必须作为已包含项且金额为零。',
);
require(
  source.calculate.includes(
    'lineItems.reduce((total, value) => total + value.amountFen',
  ) || source.calculate.includes(
    'values.reduce((total, value) => total + value.amountFen',
  ),
  '报价总额必须由费用明细使用整数分求和。',
);
require(
  /priceSnapshot:\s*PriceSnapshot/.test(source.orderTypes),
  '订单必须包含价格快照。',
);
require(
  source.orders.includes('Array.isArray(order.priceSnapshot?.lineItems)') &&
    source.orders.includes('Number.isSafeInteger(order.priceSnapshot?.total?.amountFen)'),
  '订单持久化校验必须拒绝缺失或无效价格快照。',
);
require(
  source.orders.includes('structuredClone(input.priceSnapshot)') &&
    source.orders.includes('createZeroPriceSnapshot'),
  '订单必须保存独立价格快照，非计费申请也必须有明确快照。',
);
require(
  source.resources.includes('priceSnapshot') &&
    source.resources.includes('createPriceSnapshot'),
  '已有资源必须保存创建时价格快照。',
);
require(
  source.resourceStore.includes("applicationType: 'cloud-renewal'") &&
    source.resourceStore.includes("current.resourceType !== 'cloud-server'") &&
    source.resourceStore.includes('createRenewalQuote'),
  '续费订单必须关联有效云服务器并按提交时价格生成快照。',
);
require(
  source.resourceStore.includes("applicationType: 'physical-extension'") &&
    source.resourceStore.includes("current.resourceType !== 'physical-machine'") &&
    source.resourceStore.includes('createExtensionQuote'),
  '延期订单必须关联有效物理机并按提交时价格生成快照。',
);
require(
  source.storage.includes("applicationType: 'storage-expansion'") &&
    source.storage.includes('priceSnapshot'),
  '存储扩容订单必须包含价格快照。',
);

if (errors.length) {
  console.error('价格完整性验证失败：');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `价格完整性验证通过：${cloudPrices.length} 个云服务器 SKU、${physicalPrices.length} 个物理机 SKU、${catalog.storage.length} 个存储 SKU；价格快照、整数分汇总和跨模块引用有效。`,
);
