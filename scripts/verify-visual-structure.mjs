import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const check = (condition, message) => {
  if (!condition) failures.push(message);
};

const storage = read('src/pages/StoragePage.tsx');
const storageStyles = read('src/styles/storage.css');
const fileManager = read('src/pages/FileManagerPage.tsx');
const fileStyles = read('src/styles/file-manager.css');
const dataTable = read('src/components/ui/DataTable/DataTable.tsx');
const usageMeter = read('src/components/ui/UsageMeter/UsageMeter.tsx');
const statusBadge = read('src/components/ui/StatusBadge/StatusBadge.tsx');
const storagePurchase = read('src/pages/StoragePurchasePage.tsx');
const storagePurchaseStyles = read('src/styles/storage-purchase.css');
const marketplace = read('src/pages/MarketplacePage.tsx');
const marketplaceStyles = read('src/features/marketplace/marketplace.css');
const software = read('src/pages/SoftwarePage.tsx');
const softwareStyles = read('src/pages/software-center.css');
const productLayouts = read('src/app/layouts/product-layouts.css');
const marketplaceLayout = read('src/app/layouts/MarketplaceLayout.tsx');
const softwareLayout = read('src/app/layouts/SoftwareCenterLayout.tsx');
const packageJson = JSON.parse(read('package.json'));

check(
  storage.includes('storage-overview-band')
    && storage.includes('storage-workbench')
    && !storage.includes('management-capacity-summary')
    && !storage.includes('className="storage-table"')
    && !storageStyles.includes('.storage-table'),
  '存储列表必须使用概览带和统一工作区，且不得保留旧统计卡结构。',
);
check(
  !storage.match(/eyebrow="容量、挂载与费用"|title="存储空间"\s+description=/),
  '存储列表不得恢复正文重复标题。',
);
check(
  storage.includes('filterSummary=')
    && storage.includes('selectionActions=')
    && storage.includes('enableColumnSettings') === false,
  '存储工作区必须保留筛选条件区和选择后操作区。',
);

const forbiddenFileStructures = [
  'file-manager-header',
  'file-manager-shell',
  'file-manager-toolbar',
  'file-manager-address-row',
  'file-manager-command-row',
  'file-manager-selection-bar',
  'file-manager-details',
  'file-task-drawer',
];
check(
  forbiddenFileStructures.every((token) => !fileManager.includes(token) && !fileStyles.includes(`.${token}`)),
  '文件管理器仍引用旧页面结构或旧 CSS 类。',
);
check(
  fileManager.includes('file-workbench-commandbar')
    && fileManager.includes('file-workbench-selection')
    && fileManager.includes('file-workbench-navigation')
    && fileManager.includes('file-workbench-content')
    && fileManager.includes('file-workbench-inspector'),
  '文件管理器必须由 Command Bar、Selection Bar、导航、文件区和按需 Inspector 构成。',
);
check(
  fileManager.includes('const [detailsOpen, setDetailsOpen] = useState(false)')
    && fileManager.includes('{detailsOpen && ('),
  'Inspector 必须默认关闭并按需挂载。',
);
check(
  fileManager.includes('file-workbench-task-popover')
    && !fileManager.match(/type:\s*['"]tasks['"]/),
  '任务中心必须使用浮层，不能占据页面行或使用阻断式操作对话框。',
);
check(
  fileManager.includes("kind: 'node'")
    && fileManager.includes("kind: 'folder'")
    && fileManager.includes("kind: 'blank'")
    && fileManager.includes('onContextMenu'),
  '文件、文件夹、目录树和空白区域必须具备上下文菜单入口。',
);
check(
  fileManager.includes('file-workbench-drop-zone')
    && fileManager.includes('file-workbench-drag-count')
    && fileManager.includes('data-drag-invalid'),
  '文件拖拽必须包含上传覆盖、数量和禁止目标反馈。',
);

check(
  dataTable.includes('data-version="2"')
    && dataTable.includes('ui-data-table__command')
    && dataTable.includes('ui-data-table__selection-bar')
    && dataTable.includes('ui-data-table__footer'),
  'DataTable V2 必须提供统一命令区、选择栏和结果分页区。',
);
check(
  usageMeter.includes('data-version="2"')
    && usageMeter.includes("variant?: UsageMeterVariant")
    && usageMeter.includes("role=\"progressbar\""),
  'UsageMeter V2 必须覆盖表格、概览和侧栏语义。',
);
check(
  statusBadge.includes('data-version="2"')
    && statusBadge.includes('ui-status-badge__mark')
    && !statusBadge.includes('<span aria-hidden="true" />'),
  'StatusBadge V2 不能只显示无语义彩色圆点。',
);

const formalTableOwners = [
  'src/pages/StoragePage.tsx',
  'src/pages/NetworkAccessPage.tsx',
  'src/pages/ImagesPage.tsx',
  'src/pages/OrdersPage.tsx',
  'src/pages/BillsPage.tsx',
  'src/features/resources/components/ResourceTable.tsx',
  'src/features/resources/components/ResourceDetailPanels.tsx',
  'src/features/purchase/components/NetworkRulesEditor.tsx',
];
formalTableOwners.forEach((file) => {
  const source = read(file);
  check(source.includes('DataTable'), `${file} 未迁移到 DataTable V2。`);
  check(!source.match(/<Table(?:\s|>)/), `${file} 仍直接使用旧 Table。`);
});

const storageActions = storage.match(/renderRowActions=\{\(space\) => \([\s\S]*?<DropdownMenu/)?.[0] ?? '';
check(
  (storageActions.match(/<TextButton/g) ?? []).length <= 3
    && storageActions.includes('canManageStorageFiles(space)')
    && storageActions.includes('!space.mounts.length')
    && storageActions.includes('<DropdownMenu'),
  '存储操作列必须按资源状态最多呈现两个直接操作，其余进入 DropdownMenu。',
);

check(
  storagePurchase.includes('storage-product-grid')
    && storagePurchase.includes('storage-tier-grid')
    && storagePurchase.includes('type="range"')
    && storagePurchase.includes('storage-capacity-presets')
    && storagePurchase.includes('storage-stepper')
    && storagePurchase.includes('<Switch')
    && storagePurchase.includes('attachAfterPurchase &&'),
  '存储购买页必须保留产品卡、规格卡、容量滑块与快捷项、Stepper、Switch 和条件挂载区。',
);
check(
  storagePurchase.includes('storage-quote')
    && storagePurchaseStyles.includes('.storage-quote { position: sticky;')
    && !storagePurchaseStyles.match(/\.storage-quote[^}]*overflow:\s*(?:auto|scroll)/s),
  '存储购买页必须使用无内部滚动的 Sticky 实时报价面板。',
);
check(
  storagePurchase.includes('storage-order-confirmation')
    && storagePurchase.includes('创建订单并支付')
    && storagePurchase.includes('确认订单'),
  '存储购买页必须提供独立确认订单阶段和正式支付入口。',
);
check(
  !storagePurchase.includes('storage-configurator__header')
    && !storagePurchase.match(/<h1[^>]*>\s*购买存储\s*<\/h1>/)
    && !storagePurchase.includes('storage-purchase-step')
    && !storagePurchase.match(/提交购买申请|提交申请/),
  '存储购买页不得保留重复标题、旧大数字区块或申请型提交动作。',
);

check(
  [
    'marketplace-hero',
    'marketplace-capability-strip',
    'marketplace-pricing-section',
    'marketplace-catalog-section',
    'marketplace-comparison-section',
    'marketplace-value-story',
  ].every((token) => marketplace.includes(token)),
  '资源商城必须保留 Hero、四项能力、价格矩阵、完整目录、规格对比和品牌能力叙事区。',
);
check(
  !marketplace.includes('marketplace-hero__compute-card')
    && !marketplace.includes('marketplace-hero__orbit')
    && !marketplaceStyles.match(/(?:linear|radial)-gradient|backdrop-filter/),
  '资源商城不得恢复旋转算力卡、轨道、光效、复杂渐变或玻璃拟态。',
);
check(
  marketplace.includes('<MarketplacePriceMatrix')
    && marketplace.includes('<MarketplaceSpecificationComparison')
    && marketplace.includes('marketplace-resource-orchestration.jpg')
    && marketplace.includes('把算力选择、购买配置和资源管理连成一条线')
    && marketplaceStyles.includes('grid-template-columns: repeat(3, minmax(0, 1fr))')
    && marketplaceStyles.includes('.marketplace-comparison-table td')
    && marketplaceStyles.includes('.marketplace-value-story__visual img'),
  '资源商城必须使用三列价格矩阵、可读规格对比表及原创能力宣传图文。',
);

check(
  [
    'software-hero',
    'software-capability-strip',
    'software-version-section',
    'software-catalog-section',
    'software-value-story',
  ].every((token) => software.includes(token)),
  '软件中心必须保留 Hero、四项能力、版本矩阵、完整目录和部署能力叙事区。',
);
check(
  !software.includes('software-featured__spotlight')
    && !software.includes('software-category-rail')
    && !softwareStyles.match(/(?:linear|radial)-gradient|backdrop-filter/),
  '软件中心不得恢复深色聚光卡、厚重分类轨道、复杂渐变或玻璃拟态。',
);
check(
  software.includes('<SoftwareVersionMatrix')
    && software.includes('software-version-card--featured')
    && software.includes('software-hero__package')
    && software.includes('software-hero__deployment-pipeline')
    && software.includes('getSoftwareCompatibility(item, resource)')
    && software.includes('software-deployment-management.jpg')
    && software.includes('让软件环境与算力资源真正对上号')
    && softwareStyles.includes('.software-value-story__visual img')
    && !software.includes('SoftwareAdaptationTable')
    && !software.includes('software-adaptation-table'),
  '软件精选、部署主题 Hero 和原创部署宣传图文必须保留，旧安装覆盖表必须删除。',
);
check(
  !software.includes('精选软件与版本')
    && !software.includes('费用策略和兼容范围来自当前软件目录')
    && !software.includes('软件适配与安装覆盖')
    && !software.includes('覆盖率按当前已关联资源数')
    && !software.includes('software-hero__visual-line')
    && softwareStyles.includes('.software-section-heading--centered > h2')
    && marketplaceStyles.includes('.marketplace-section-heading--centered > h2'),
  '软件精选区不得恢复冗长三级标题，两页居中标题和软件独立 Hero 语义必须保留。',
);

check(
  productLayouts.includes('--product-nav-height: 56px')
    && productLayouts.includes('--product-content-width: 1200px')
    && productLayouts.includes('.product-area-footer__body')
    && marketplaceLayout.includes('<ProductAreaFooter')
    && softwareLayout.includes('<ProductAreaFooter'),
  '商城与软件中心必须共用 56px 顶栏、1200px 版心和正式深色页尾。',
);

check(
  Object.keys(packageJson.dependencies ?? {}).every((dependency) => [
    'react',
    'react-dom',
    'react-router-dom',
  ].includes(dependency)),
  '检测到新增外部 UI、表格或文件管理依赖。',
);

const runtimeSource = fs.readdirSync(path.join(root, 'src'), { recursive: true })
  .filter((entry) => typeof entry === 'string' && /\.(?:ts|tsx|css)$/.test(entry) && !/\.test\./.test(entry))
  .map((entry) => read(path.join('src', entry)))
  .join('\n');
check(
  !runtimeSource.match(/(?:src|href)=["'{`]https?:\/\//),
  '运行代码不得包含外部运行时资源。',
);

if (failures.length) {
  console.error(`视觉结构验证失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`视觉结构验证通过：${formalTableOwners.length} 个正式表格入口已迁移，公共产品页、存储购买、存储管理与文件样板结构有效。`);
