import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetOperationsStore } from '../../operations';
import { getStorageSpace, resetStorageStore } from '../../storage';
import {
  copyNodes,
  canUndoFileOperation,
  createFolder,
  deleteNodes,
  getNodePath,
  getRootFolder,
  listDirectory,
  listFileTasks,
  moveNodes,
  renameNode,
  resetFileStore,
  uploadFiles,
  undoLastFileOperation,
} from './fileStore';

const memory = new Map<string, string>();

describe('fileStore', () => {
  beforeEach(() => {
    memory.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        removeItem: (key: string) => memory.delete(key),
        setItem: (key: string, value: string) => memory.set(key, value),
      },
    });
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:local-file'),
      revokeObjectURL: vi.fn(),
    });
    resetStorageStore();
    resetOperationsStore();
    resetFileStore();
  });

  it('navigates, creates and renames folders with unique sibling names', () => {
    const root = getRootFolder('storage-shared-east-001')!;
    const created = createFolder(root.storageId, root.nodeId, '团队资料');
    expect(getNodePath(created.nodeId)).toBe('/团队资料');
    expect(renameNode(created.nodeId, '共享资料').name).toBe('共享资料');
    expect(() => createFolder(root.storageId, root.nodeId, '共享资料')).toThrow('已存在');
  });

  it('uploads multiple files, records tasks and synchronizes storage capacity', async () => {
    const root = getRootFolder('storage-shared-east-001')!;
    const before = getStorageSpace(root.storageId)!.usedGb;
    const uploaded = await uploadFiles(root.storageId, root.nodeId, [
      new File(['alpha'], 'alpha.txt', { type: 'text/plain' }),
      new File(['{"ready":true}'], 'state.json', { type: 'application/json' }),
    ]);
    expect(uploaded).toHaveLength(2);
    expect(listDirectory(root.storageId, root.nodeId).map((item) => item.name)).toEqual(expect.arrayContaining(['alpha.txt', 'state.json']));
    expect(listFileTasks(root.storageId)[0]).toMatchObject({ operation: '上传', progress: 100, status: 'completed' });
    expect(getStorageSpace(root.storageId)!.usedGb).toBeGreaterThanOrEqual(before);
    await expect(uploadFiles(root.storageId, root.nodeId, [new File(['again'], 'alpha.txt')])).rejects.toThrow('已存在');
  });

  it('copies, moves and deletes trees while preventing directory cycles', () => {
    const root = getRootFolder('storage-shared-east-001')!;
    const source = createFolder(root.storageId, root.nodeId, '源目录');
    const child = createFolder(root.storageId, source.nodeId, '子目录');
    const target = createFolder(root.storageId, root.nodeId, '目标目录');
    expect(() => moveNodes([source.nodeId], child.nodeId)).toThrow('自身或其子目录');

    copyNodes([source.nodeId], target.nodeId);
    expect(listDirectory(root.storageId, target.nodeId).map((item) => item.name)).toContain('源目录');
    moveNodes([child.nodeId], target.nodeId);
    expect(getNodePath(child.nodeId)).toBe('/目标目录/子目录');
    deleteNodes([target.nodeId]);
    expect(listDirectory(root.storageId, root.nodeId).map((item) => item.name)).not.toContain('目标目录');
    expect(listFileTasks(root.storageId).map((task) => task.operation)).toEqual(expect.arrayContaining(['复制', '移动', '删除']));
  });

  it('restores the most recent local mutation and capacity state', () => {
    const root = getRootFolder('storage-shared-east-001')!;
    const created = createFolder(root.storageId, root.nodeId, '待撤销目录');
    expect(canUndoFileOperation(root.storageId)).toBe(true);
    expect(listDirectory(root.storageId, root.nodeId).some((item) => item.nodeId === created.nodeId)).toBe(true);
    expect(undoLastFileOperation(root.storageId)).toContain('新建文件夹');
    expect(listDirectory(root.storageId, root.nodeId).some((item) => item.nodeId === created.nodeId)).toBe(false);
  });
});
