import { storageFilesPath } from '../../../app/routes';
import { recordOperation } from '../../operations';
import { getStorageSpace, updateStorageUsage } from '../../storage';
import type { DirectorySummary, FileNode, FileSort, FileTask } from '../types';

const ROOT_NAMES = new Map<string, string>([
  ['storage-shared-east-001', '研发共享存储'],
  ['storage-cloud-east-001', '数据库数据盘'],
  ['storage-shared-west-001', '西部共享空间'],
]);

function initialNodes(): FileNode[] {
  const now = '2026-07-21T09:30:00.000Z';
  return [
    node('root-east', 'storage-shared-east-001', null, 'folder', ROOT_NAMES.get('storage-shared-east-001')!, 0, '', now),
    node('folder-projects', 'storage-shared-east-001', 'root-east', 'folder', '项目', 0, '', now),
    node('folder-datasets', 'storage-shared-east-001', 'root-east', 'folder', '数据集', 0, '', now),
    node('folder-models', 'storage-shared-east-001', 'root-east', 'folder', '模型', 0, '', now),
    node('folder-reports', 'storage-shared-east-001', 'root-east', 'folder', '报告', 0, '', now),
    node('file-readme', 'storage-shared-east-001', 'folder-projects', 'file', 'README.md', 1804, 'text/markdown', now, '# 研发共享目录\n\n此目录用于团队项目文件协作。'),
    node('file-config', 'storage-shared-east-001', 'folder-projects', 'file', 'pipeline.json', 942, 'application/json', now, '{\n  "name": "training-pipeline",\n  "status": "ready"\n}'),
    node('file-report', 'storage-shared-east-001', 'folder-reports', 'file', '容量报告.txt', 624, 'text/plain', now, '当前存储容量与使用情况由存储管理统一统计。'),
    node('root-cloud', 'storage-cloud-east-001', null, 'folder', ROOT_NAMES.get('storage-cloud-east-001')!, 0, '', now),
    node('folder-db', 'storage-cloud-east-001', 'root-cloud', 'folder', 'database', 0, '', now),
    node('file-db-info', 'storage-cloud-east-001', 'folder-db', 'file', 'maintenance.txt', 386, 'text/plain', now, '数据库维护窗口记录。'),
    node('root-west', 'storage-shared-west-001', null, 'folder', ROOT_NAMES.get('storage-shared-west-001')!, 0, '', now),
    node('folder-team', 'storage-shared-west-001', 'root-west', 'folder', '团队目录', 0, '', now),
  ];
}

function node(
  nodeId: string,
  storageId: string,
  parentId: string | null,
  type: FileNode['type'],
  name: string,
  sizeBytes: number,
  mimeType: string,
  timestamp: string,
  content?: string,
): FileNode {
  const extension = type === 'file' && name.includes('.') ? name.split('.').pop()?.toLocaleLowerCase() ?? '' : '';
  return {
    nodeId,
    storageId,
    parentId,
    type,
    name,
    extension,
    sizeBytes,
    mimeType,
    createdAt: timestamp,
    updatedAt: timestamp,
    owner: '当前用户',
    permissions: type === 'folder' ? 'rwxr-xr-x' : 'rw-r--r--',
    content,
  };
}

let nodes = initialNodes();
let tasks: FileTask[] = [];
let sequence = 100;
const uploadedFiles = new Map<string, File>();
type FileSnapshot = {
  storageId: string;
  label: string;
  nodes: FileNode[];
  uploadedFiles: Map<string, File>;
};
let undoStack: FileSnapshot[] = [];

function now() {
  return new Date().toISOString();
}

function nextId(prefix: string) {
  sequence += 1;
  return `${prefix}-${Date.now()}-${sequence}`;
}

function storageNodes(storageId: string) {
  return nodes.filter((item) => item.storageId === storageId);
}

function assertStorage(storageId: string) {
  if (!getStorageSpace(storageId)) throw new Error('未找到有效存储。');
}

function root(storageId: string) {
  return storageNodes(storageId).find((item) => item.parentId === null && item.type === 'folder');
}

function assertFolder(storageId: string, nodeId: string) {
  const folder = nodes.find((item) => item.storageId === storageId && item.nodeId === nodeId && item.type === 'folder');
  if (!folder) throw new Error('未找到目标目录。');
  return folder;
}

function ensureUnique(storageId: string, parentId: string, name: string, excludedId?: string) {
  const normalized = name.trim().toLocaleLowerCase();
  if (!normalized) throw new Error('名称不能为空。');
  if (name.includes('/')) throw new Error('名称不能包含“/”。');
  if (nodes.some((item) => item.storageId === storageId && item.parentId === parentId && item.nodeId !== excludedId && item.name.toLocaleLowerCase() === normalized)) {
    throw new Error(`“${name}”已存在于当前目录。`);
  }
}

function descendants(nodeId: string): string[] {
  const children = nodes.filter((item) => item.parentId === nodeId);
  return children.flatMap((child) => [child.nodeId, ...descendants(child.nodeId)]);
}

function syncUsage(storageId: string) {
  const scoped = storageNodes(storageId);
  const size = scoped.filter((item) => item.type === 'file').reduce((total, item) => total + item.sizeBytes, 0);
  updateStorageUsage(
    storageId,
    size,
    scoped.filter((item) => item.type === 'file').length,
    scoped.filter((item) => item.type === 'folder').length,
  );
}

function remember(storageId: string, label: string) {
  undoStack = [
    ...undoStack.slice(-19),
    {
      storageId,
      label,
      nodes: structuredClone(nodes),
      uploadedFiles: new Map(uploadedFiles),
    },
  ];
}

function pathForNode(nodeId: string): string {
  const item = nodes.find((candidate) => candidate.nodeId === nodeId);
  if (!item) return '/';
  if (item.parentId === null) return '/';
  const parentPath = pathForNode(item.parentId);
  return `${parentPath === '/' ? '' : parentPath}/${item.name}`;
}

function task(
  storageId: string,
  operation: FileTask['operation'],
  subject: string,
  targetPath?: string,
  error?: string,
) {
  const created: FileTask = {
    id: nextId('task'),
    storageId,
    operation,
    subject,
    targetPath,
    progress: error ? 0 : 100,
    status: error ? 'failed' : 'completed',
    completedAt: now(),
    error,
  };
  tasks = [created, ...tasks];
  return created;
}

function log(storageId: string, action: string, objectPath: string, message: string) {
  recordOperation({
    module: 'storage',
    action,
    targetId: storageId,
    targetName: objectPath,
    status: 'completed',
    message,
    targetPath: storageFilesPath(storageId),
  });
}

export function listFileNodes(storageId: string) {
  return structuredClone(storageNodes(storageId));
}

export function getRootFolder(storageId: string) {
  assertStorage(storageId);
  return structuredClone(root(storageId));
}

export function getFileNode(nodeId: string) {
  const item = nodes.find((candidate) => candidate.nodeId === nodeId);
  return item ? structuredClone(item) : undefined;
}

export function getNodePath(nodeId: string) {
  return pathForNode(nodeId);
}

export function getPathNodes(nodeId: string) {
  const result: FileNode[] = [];
  let current = nodes.find((item) => item.nodeId === nodeId);
  while (current) {
    result.unshift(current);
    current = current.parentId ? nodes.find((item) => item.nodeId === current?.parentId) : undefined;
  }
  return structuredClone(result);
}

export function listDirectory(storageId: string, parentId: string, search = '', sort: FileSort = 'name-asc') {
  const term = search.trim().toLocaleLowerCase();
  let result = storageNodes(storageId).filter((item) => item.parentId === parentId);
  if (term) result = storageNodes(storageId).filter((item) => item.parentId !== null && item.name.toLocaleLowerCase().includes(term));
  return structuredClone([...result].sort((left, right) => {
    if (left.type !== right.type) return left.type === 'folder' ? -1 : 1;
    if (sort === 'name-desc') return right.name.localeCompare(left.name, 'zh-CN');
    if (sort === 'updated-desc') return right.updatedAt.localeCompare(left.updatedAt);
    if (sort === 'size-desc') return right.sizeBytes - left.sizeBytes;
    return left.name.localeCompare(right.name, 'zh-CN');
  }));
}

export function directorySummary(nodeId: string): DirectorySummary {
  const ids = descendants(nodeId);
  const scoped = nodes.filter((item) => ids.includes(item.nodeId));
  return {
    files: scoped.filter((item) => item.type === 'file').length,
    folders: scoped.filter((item) => item.type === 'folder').length,
    sizeBytes: scoped.filter((item) => item.type === 'file').reduce((total, item) => total + item.sizeBytes, 0),
  };
}

export function createFolder(storageId: string, parentId: string, folderName: string) {
  assertFolder(storageId, parentId);
  const name = folderName.trim();
  ensureUnique(storageId, parentId, name);
  remember(storageId, `新建文件夹“${name}”`);
  const timestamp = now();
  const created = node(nextId('folder'), storageId, parentId, 'folder', name, 0, '', timestamp);
  nodes = [...nodes, created];
  syncUsage(storageId);
  log(storageId, '新建文件夹', pathForNode(created.nodeId), '文件夹已在当前本地状态中创建。');
  return structuredClone(created);
}

function readTextFile(file: File) {
  if (typeof file.text === 'function') return file.text();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(typeof reader.result === 'string' ? reader.result : ''));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('无法读取文件内容。')));
    reader.readAsText(file);
  });
}

export async function uploadFiles(storageId: string, parentId: string, files: readonly File[]) {
  assertFolder(storageId, parentId);
  if (!files.length) throw new Error('请选择要上传的文件。');
  const created: FileNode[] = [];
  try {
    const incomingNames = new Set<string>();
    files.forEach((file) => {
      ensureUnique(storageId, parentId, file.name);
      const normalized = file.name.trim().toLocaleLowerCase();
      if (incomingNames.has(normalized)) throw new Error(`所选文件中存在同名项：“${file.name}”。`);
      incomingNames.add(normalized);
    });
    remember(storageId, `上传 ${files.length} 个文件`);
    for (const file of files) {
      const timestamp = now();
      const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLocaleLowerCase() ?? '' : '';
      const content = file.type.startsWith('text/')
        || file.type === 'application/json'
        || ['md', 'json', 'txt'].includes(extension)
        ? await readTextFile(file)
        : undefined;
      const item: FileNode = {
        ...node(nextId('file'), storageId, parentId, 'file', file.name, file.size, file.type || 'application/octet-stream', timestamp),
        objectUrl: URL.createObjectURL(file),
        content,
      };
      nodes = [...nodes, item];
      uploadedFiles.set(item.nodeId, file);
      created.push(item);
    }
    syncUsage(storageId);
    task(storageId, '上传', created.map((item) => item.name).join('、'), pathForNode(parentId));
    created.forEach((item) => log(storageId, '上传文件', pathForNode(item.nodeId), '文件已加入当前本地文件树。'));
    return structuredClone(created);
  } catch (error) {
    task(storageId, '上传', files.map((file) => file.name).join('、'), pathForNode(parentId), error instanceof Error ? error.message : '上传失败');
    throw error;
  }
}

export function renameNode(nodeId: string, nextName: string) {
  const current = nodes.find((item) => item.nodeId === nodeId);
  if (!current || current.parentId === null) throw new Error('根目录不能重命名。');
  const name = nextName.trim();
  ensureUnique(current.storageId, current.parentId, name, current.nodeId);
  remember(current.storageId, `重命名“${current.name}”`);
  nodes = nodes.map((item) => item.nodeId === nodeId ? {
    ...item,
    name,
    extension: item.type === 'file' && name.includes('.') ? name.split('.').pop()?.toLocaleLowerCase() ?? '' : '',
    updatedAt: now(),
  } : item);
  log(current.storageId, '重命名', pathForNode(nodeId), '名称已更新。');
  return getFileNode(nodeId)!;
}

export function copyNodes(nodeIds: readonly string[], targetFolderId: string) {
  const target = nodes.find((item) => item.nodeId === targetFolderId && item.type === 'folder');
  if (!target) throw new Error('未找到目标目录。');
  const sources = nodeIds.map((id) => nodes.find((item) => item.nodeId === id)).filter((item): item is FileNode => Boolean(item));
  sources.forEach((source) => ensureUnique(target.storageId, target.nodeId, source.name));
  remember(target.storageId, `复制 ${sources.length} 个对象`);
  const cloneBranch = (source: FileNode, parentId: string): FileNode => {
    const copiedFile = uploadedFiles.get(source.nodeId);
    const copy: FileNode = {
      ...source,
      nodeId: nextId(source.type),
      parentId,
      createdAt: now(),
      updatedAt: now(),
      objectUrl: copiedFile ? URL.createObjectURL(copiedFile) : source.objectUrl,
    };
    nodes = [...nodes, copy];
    if (copiedFile) uploadedFiles.set(copy.nodeId, copiedFile);
    nodes.filter((item) => item.parentId === source.nodeId).forEach((child) => cloneBranch(child, copy.nodeId));
    return copy;
  };
  sources.forEach((source) => cloneBranch(source, target.nodeId));
  syncUsage(target.storageId);
  task(target.storageId, '复制', sources.map((item) => item.name).join('、'), pathForNode(target.nodeId));
  log(target.storageId, '复制文件', pathForNode(target.nodeId), `已复制 ${sources.length} 个对象。`);
}

export function moveNodes(nodeIds: readonly string[], targetFolderId: string) {
  const target = nodes.find((item) => item.nodeId === targetFolderId && item.type === 'folder');
  if (!target) throw new Error('未找到目标目录。');
  const sources = nodeIds.map((id) => nodes.find((item) => item.nodeId === id)).filter((item): item is FileNode => Boolean(item));
  sources.forEach((source) => {
    if (source.storageId !== target.storageId) throw new Error('不能跨存储移动文件。');
    if (source.nodeId === target.nodeId || descendants(source.nodeId).includes(target.nodeId)) throw new Error('不能将目录移动到自身或其子目录。');
    ensureUnique(target.storageId, target.nodeId, source.name, source.nodeId);
  });
  remember(target.storageId, `移动 ${sources.length} 个对象`);
  nodes = nodes.map((item) => nodeIds.includes(item.nodeId) ? { ...item, parentId: target.nodeId, updatedAt: now() } : item);
  task(target.storageId, '移动', sources.map((item) => item.name).join('、'), pathForNode(target.nodeId));
  log(target.storageId, '移动文件', pathForNode(target.nodeId), `已移动 ${sources.length} 个对象。`);
}

export function deleteNodes(nodeIds: readonly string[]) {
  const sources = nodeIds.map((id) => nodes.find((item) => item.nodeId === id)).filter((item): item is FileNode => Boolean(item));
  if (!sources.length) throw new Error('请选择要删除的对象。');
  if (sources.some((item) => item.parentId === null)) throw new Error('根目录不能删除。');
  const storageId = sources[0].storageId;
  remember(storageId, `删除 ${sources.length} 个对象`);
  const allIds = new Set(sources.flatMap((item) => [item.nodeId, ...descendants(item.nodeId)]));
  allIds.forEach((id) => {
    uploadedFiles.delete(id);
  });
  nodes = nodes.filter((item) => !allIds.has(item.nodeId));
  syncUsage(storageId);
  task(storageId, '删除', sources.map((item) => item.name).join('、'));
  log(storageId, '删除文件', '/', `已删除 ${sources.length} 个对象及其子项。`);
}

function zipCrc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zipDateTime(value: string) {
  const date = new Date(value);
  const year = Math.max(1980, date.getFullYear());
  return {
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
  };
}

function zipLocalHeader(
  nameLength: number,
  crc: number,
  size: number,
  date: number,
  time: number,
) {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x04034b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 0x0800, true);
  view.setUint16(8, 0, true);
  view.setUint16(10, time, true);
  view.setUint16(12, date, true);
  view.setUint32(14, crc, true);
  view.setUint32(18, size, true);
  view.setUint32(22, size, true);
  view.setUint16(26, nameLength, true);
  return bytes;
}

function zipCentralHeader(
  nameLength: number,
  crc: number,
  size: number,
  date: number,
  time: number,
  offset: number,
  folder: boolean,
) {
  const bytes = new Uint8Array(46);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x02014b50, true);
  view.setUint16(4, 20, true);
  view.setUint16(6, 20, true);
  view.setUint16(8, 0x0800, true);
  view.setUint16(10, 0, true);
  view.setUint16(12, time, true);
  view.setUint16(14, date, true);
  view.setUint32(16, crc, true);
  view.setUint32(20, size, true);
  view.setUint32(24, size, true);
  view.setUint16(28, nameLength, true);
  view.setUint32(38, folder ? 0x10 : 0, true);
  view.setUint32(42, offset, true);
  return bytes;
}

function zipEndRecord(entryCount: number, centralSize: number, centralOffset: number) {
  const bytes = new Uint8Array(22);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, entryCount, true);
  view.setUint16(10, entryCount, true);
  view.setUint32(12, centralSize, true);
  view.setUint32(16, centralOffset, true);
  return bytes;
}

async function createFolderArchive(folder: FileNode) {
  const encoder = new TextEncoder();
  const scoped = [folder, ...nodes.filter((item) => descendants(folder.nodeId).includes(item.nodeId))];
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let localOffset = 0;
  let centralSize = 0;

  for (const item of scoped) {
    const segments = getPathNodes(item.nodeId)
      .slice(getPathNodes(folder.nodeId).length)
      .map((pathNode) => pathNode.name);
    const path = [folder.name, ...segments].join('/') + (item.type === 'folder' ? '/' : '');
    const name = encoder.encode(path);
    const uploaded = item.type === 'file' ? uploadedFiles.get(item.nodeId) : undefined;
    const data = item.type === 'folder'
      ? new Uint8Array()
      : uploaded
        ? new Uint8Array(await uploaded.arrayBuffer())
        : encoder.encode(item.content ?? '');
    const crc = zipCrc32(data);
    const { date, time } = zipDateTime(item.updatedAt);
    const localHeader = zipLocalHeader(name.byteLength, crc, data.byteLength, date, time);
    const centralHeader = zipCentralHeader(
      name.byteLength,
      crc,
      data.byteLength,
      date,
      time,
      localOffset,
      item.type === 'folder',
    );
    localParts.push(localHeader, name, data);
    centralParts.push(centralHeader, name);
    localOffset += localHeader.byteLength + name.byteLength + data.byteLength;
    centralSize += centralHeader.byteLength + name.byteLength;
  }

  return new Blob(
    [...localParts, ...centralParts, zipEndRecord(scoped.length, centralSize, localOffset)],
    { type: 'application/zip' },
  );
}

export async function downloadNode(nodeId: string) {
  const item = nodes.find((candidate) => candidate.nodeId === nodeId);
  if (!item) throw new Error('未找到可下载对象。');
  const file = item.type === 'file' ? uploadedFiles.get(nodeId) : undefined;
  const blob = file
    ?? (item.type === 'folder'
      ? await createFolderArchive(item)
      : new Blob([item.content ?? ''], { type: item.mimeType || 'application/octet-stream' }));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = item.type === 'folder' ? `${item.name}.zip` : item.name;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  task(item.storageId, '下载', item.name, pathForNode(item.nodeId));
  log(item.storageId, '下载文件', pathForNode(item.nodeId), '下载已在当前浏览器中发起。');
}

export function listFileTasks(storageId: string) {
  return structuredClone(tasks.filter((item) => item.storageId === storageId));
}

export function clearCompletedTasks(storageId: string) {
  tasks = tasks.filter((item) => item.storageId !== storageId || item.status !== 'completed');
}

export function retryFileTask(taskId: string) {
  tasks = tasks.map((item) => item.id === taskId ? { ...item, status: 'completed', progress: 100, error: undefined, completedAt: now() } : item);
}

export function canUndoFileOperation(storageId: string) {
  return undoStack.some((snapshot) => snapshot.storageId === storageId);
}

export function undoLastFileOperation(storageId: string) {
  let index = -1;
  for (let current = undoStack.length - 1; current >= 0; current -= 1) {
    if (undoStack[current].storageId === storageId) {
      index = current;
      break;
    }
  }
  if (index < 0) throw new Error('当前没有可撤销的文件操作。');
  const snapshot = undoStack[index];
  undoStack = undoStack.filter((_, currentIndex) => currentIndex !== index);
  nodes = structuredClone(snapshot.nodes);
  uploadedFiles.clear();
  snapshot.uploadedFiles.forEach((file, nodeId) => uploadedFiles.set(nodeId, file));
  syncUsage(storageId);
  task(storageId, '撤销', snapshot.label);
  log(storageId, '撤销文件操作', '/', `已撤销：${snapshot.label}。`);
  return snapshot.label;
}

export function resetFileStore() {
  nodes.forEach((item) => {
    if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
  });
  nodes = initialNodes();
  tasks = [];
  undoStack = [];
  uploadedFiles.clear();
  sequence = 100;
}
