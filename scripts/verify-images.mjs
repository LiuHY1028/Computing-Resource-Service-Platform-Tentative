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

const types = read('src/features/images/types.ts');
const store = read('src/features/images/state/imageStore.ts');
const page = read('src/pages/ImagesPage.tsx');
const purchase = read('src/features/purchase/data/presetImages.ts');
const resourceList = read('src/pages/ResourceListPage.tsx');

check(
  types.includes("export type ImageType = 'public' | 'custom'") &&
    !types.includes("'platform'"),
  '镜像一级分类不是公共镜像和自定义镜像两类。',
);
for (const status of ['creating', 'importing', 'available', 'failed']) {
  check(types.includes(`'${status}'`), `自定义镜像状态缺失：${status}`);
}
for (const sourceKind of ['public', 'resource', 'file']) {
  check(types.includes(`kind: '${sourceKind}'`), `镜像来源缺失：${sourceKind}`);
}
check(
  store.includes("['.qcow2', '.raw', '.img', '.vhd', '.vhdx']") &&
    store.includes('30 * 1024 * 1024 * 1024'),
  '导入镜像文件类型或 30 GiB 容量边界缺失。',
);
check(
    store.includes('createImageFromResource') &&
    store.includes('importCustomImage') &&
    store.includes("target.type !== 'custom'") &&
    store.includes("target.status === 'creating' || target.status === 'importing'"),
  '镜像制作、导入或删除权限边界不完整。',
);
check(
  page.includes("value: 'public'") &&
    page.includes("value: 'custom'") &&
    !page.includes('平台镜像'),
  '镜像页面仍存在第三类镜像或缺少两类入口。',
);
check(
  purchase.includes('getCompatibleImages(computeType)') &&
    store.includes("image.status === 'available'") &&
    resourceList.includes("create=resource&resourceId="),
  '购买镜像兼容筛选或从云服务器制作入口未联动。',
);

if (failures.length) {
  console.error(`镜像模型验证失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const tests = spawnSync(
  process.execPath,
  [
    path.join(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    'src/features/images/state/imageStore.test.ts',
    'src/pages/ImagesPage.test.tsx',
    '--reporter=dot',
  ],
  { cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1' } },
);
if (tests.status !== 0) {
  console.error('镜像模型验证失败：镜像 Store 或正式页面测试未通过。');
  console.error(tests.stdout);
  console.error(tests.stderr);
  process.exit(1);
}

console.log('镜像模型验证通过：仅保留公共/自定义两类，制作、导入、权限和购买关联完整。');
