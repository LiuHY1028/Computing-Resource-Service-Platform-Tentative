import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const releaseDirectory = path.join(projectRoot, 'release');
const releaseHtml = path.join(releaseDirectory, '算力资源服务平台.html');
const failures = [];

let html = '';
let fileSize = 0;

try {
  html = await readFile(releaseHtml, 'utf8');
  fileSize = (await stat(releaseHtml)).size;
} catch {
  failures.push('目标 HTML 不存在。');
}

if (html) {
  const checks = [
    [fileSize > 1_000_000, 'HTML 文件体积低于合理下限。'],
    [/<div[^>]+id=["']root["'][^>]*>/i.test(html), '缺少应用入口。'],
    [/<script(?![^>]+\bsrc=)[^>]*>[\s\S]+?<\/script>/i.test(html), '缺少内联 JavaScript。'],
    [/<style[^>]*>[\s\S]+?<\/style>/i.test(html), '缺少内联 CSS。'],
    [/data:font\/woff2;base64,/i.test(html), '缺少内联 MiSans VF 字体。'],
    [!/<script[^>]+\bsrc\s*=/i.test(html), '存在外部 script 地址。'],
    [!/<link[^>]+rel=["']stylesheet["'][^>]+\bhref\s*=/i.test(html), '存在外部 stylesheet 地址。'],
    [!/(?:src|href)=["']\/assets\//i.test(html), '存在 /assets/ 运行依赖。'],
    [!/(?:src|href)=["']https?:\/\//i.test(html), '存在 HTTP(S) 运行资源。'],
    [!/url\(\s*["']?https?:\/\//i.test(html), 'CSS 存在 HTTP(S) 运行资源。'],
    [!/\b(?:https?:\/\/[^"']*\/api\/|\/api\/)/i.test(html), '产物包含 API 地址。'],
    [
      !/\bimport\s*\(\s*["'][^"']+\.js(?:\?[^"']*)?["']\s*\)/i.test(html),
      '产物包含动态 Chunk 引用。',
    ],
    [!/__dev\//i.test(html), '开发路由进入正式产物。'],
  ];

  for (const [passed, message] of checks) {
    if (!passed) failures.push(message);
  }
}

try {
  const requiredAssets = (await readdir(releaseDirectory)).filter(
    (entry) => entry !== '算力资源服务平台.html',
  );
  if (requiredAssets.length > 0) {
    failures.push(`release 中存在额外文件：${requiredAssets.join(', ')}`);
  }
} catch {
  // Missing release directory is already reported through the target check.
}

if (failures.length > 0) {
  console.error(failures.map((failure) => `- ${failure}`).join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Offline verification passed: ${(fileSize / 1024 / 1024).toFixed(2)} MiB`,
  );
}
