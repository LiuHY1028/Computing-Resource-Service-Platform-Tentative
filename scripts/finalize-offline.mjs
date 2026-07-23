import { copyFile, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const projectRoot = process.cwd();
const buildDirectory = path.join(projectRoot, '.offline-build');
const sourceHtml = path.join(buildDirectory, 'index.html');
const releaseDirectory = path.join(projectRoot, 'release');
const releaseHtml = path.join(releaseDirectory, '算力资源服务平台.html');

await mkdir(releaseDirectory, { recursive: true });
await copyFile(sourceHtml, releaseHtml);
await rm(buildDirectory, { recursive: true, force: true });

console.log(`Offline application: ${releaseHtml}`);
