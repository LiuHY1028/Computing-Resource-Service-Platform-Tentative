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

console.log(`视觉结构验证通过：${formalTableOwners.length} 个正式表格入口已迁移，存储与文件样板结构有效。`);
