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

const types = read('src/features/network/types.ts');
const store = read('src/features/network/state/networkStore.ts');
const page = read('src/pages/NetworkAccessPage.tsx');
const purchaseEditor = read(
  'src/features/purchase/components/NetworkRulesEditor.tsx',
);
const resourcePanel = read(
  'src/features/resources/components/ResourceDetailPanels.tsx',
);

for (const field of ['ruleName', 'port', 'sourceType', 'sourceValue', 'status']) {
  check(types.includes(`${field}:`), `网络规则字段缺失：${field}`);
}
check(
  !types.includes('servicePort') &&
    !types.includes('mappedPort') &&
    types.includes("'enabled' | 'disabled'"),
  '正式网络模型仍暴露双端口或混合执行状态。',
);
for (const template of ['SSH', 'RDP', 'HTTP', 'HTTPS', '自定义']) {
  check(page.includes(template), `网络页面缺少常用模板：${template}`);
  check(purchaseEditor.includes(template), `购买网络配置缺少常用模板：${template}`);
}
check(
  page.includes("searchParams.get('resourceId')") &&
    page.includes('全部来源') &&
    page.includes('network-risk-warning'),
  '资源筛选、全部来源或风险提示未实现。',
);
check(
  !store.includes('createCommerceOrder') &&
    store.includes('recordOperation') &&
    store.includes('setNetworkRuleEnabled') &&
    store.includes('deleteNetworkRule'),
  '免费网络规则错误进入交易流程，或增删改启停不完整。',
);
check(
  !page.includes('title="操作记录"') &&
    page.includes('查看网络操作记录') &&
    !resourcePanel.includes('title="操作记录"'),
  '网络页面或资源详情仍维护局部操作记录表。',
);

if (failures.length) {
  console.error(`网络模型验证失败（${failures.length} 项）：`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const tests = spawnSync(
  process.execPath,
  [
    path.join(root, 'node_modules/vitest/vitest.mjs'),
    'run',
    'src/features/network/state/networkStore.test.ts',
    '--reporter=dot',
  ],
  { cwd: root, encoding: 'utf8', env: { ...process.env, CI: '1' } },
);
if (tests.status !== 0) {
  console.error('网络模型验证失败：网络规则 Store 测试未通过。');
  console.error(tests.stdout);
  console.error(tests.stderr);
  process.exit(1);
}

console.log('网络模型验证通过：单端口、模板、来源、启停、免费边界和全局记录归属完整。');
