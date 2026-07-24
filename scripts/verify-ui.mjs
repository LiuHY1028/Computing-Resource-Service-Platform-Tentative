import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function check(condition, message) {
  if (!condition) failures.push(message);
}

function filesUnder(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDirectory, entry.name);
    return entry.isDirectory() ? filesUnder(relativePath) : [relativePath];
  });
}

const runtimeFiles = filesUnder('src')
  .filter((file) => /\.(?:ts|tsx|css)$/.test(file))
  .filter((file) => !/\.test\./.test(file));
const runtimeSource = runtimeFiles.map((file) => read(file)).join('\n');
const formalPageFiles = filesUnder('src/pages')
  .filter((file) => /\.tsx$/.test(file))
  .filter((file) => !/\.test\./.test(file))
  .filter((file) => !/(UiSpec|FoundationComponents|AdvancedComponents)Page\.tsx$/.test(file));
const formalPageSource = formalPageFiles.map((file) => read(file)).join('\n');
const packageJson = JSON.parse(read('package.json'));

check(
  (runtimeSource.match(/<table(?:\s|>)/g) ?? []).length === 1
    && read('src/components/ui/Table/Table.tsx').includes('<table'),
  '正式运行代码只能通过公共 Table 渲染原生 table。',
);
check(!runtimeSource.includes('<progress'), '不得使用原生 progress 默认外观。');
check(!formalPageSource.includes('PageTitleBar'), '正式页面不得自行重复 PageTitleBar。');
check(
  (read('src/app/shell/MainContent.tsx').match(/<PageTitleBar/g) ?? []).length === 1,
  'AppShell 应只渲染一个 PageTitleBar。',
);
check(
  !formalPageSource.match(/演示|示例|Mock|测试|原型|占位|任务编号/),
  '正式页面存在暴露开发状态的用户可见文案。',
);
check(
  !runtimeSource.match(/(?:src|href)=["'{`]https?:\/\//),
  '运行代码不得引用外部运行时资源。',
);
check(
  !read('src/pages/FileManagerPage.tsx').includes('file-manager-toolbar-actions'),
  '文件管理器仍包含旧的孤立工具栏。',
);
check(
  read('src/pages/FileManagerPage.tsx').includes('useState(false)')
    && read('src/pages/FileManagerPage.tsx').includes('file-task-drawer')
    && read('src/pages/FileManagerPage.tsx').includes('ContextMenu'),
  '文件管理器必须默认折叠 Inspector，并使用任务抽屉和上下文菜单。',
);
check(
  !read('src/pages/FileManagerPage.tsx').includes("type: 'tasks'"),
  '任务中心不得继续使用阻断式 ActionDialog。',
);
check(
  read('src/pages/StoragePage.tsx').includes('<UsageMeter')
    && read('src/pages/FileManagerPage.tsx').includes('<UsageMeter')
    && read('src/features/resources/components/ResourceDetailPanels.tsx').includes('<UsageMeter'),
  '存储列表、资源详情和文件管理器必须使用统一容量组件。',
);
check(
  !formalPageSource.includes('storageUsagePercent('),
  '正式页面不得绕过统一容量组件直接拼装存储使用率。',
);
check(
  Object.keys(packageJson.dependencies ?? {}).every((dependency) => [
    'react',
    'react-dom',
    'react-router-dom',
  ].includes(dependency)),
  '检测到新的外部 UI、表格、文件管理或状态依赖。',
);

if (failures.length) {
  console.error(`UI 验证失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`UI 验证通过：检查 ${formalPageFiles.length} 个正式页面与 ${runtimeFiles.length} 个运行文件。`);
