import { beforeEach, describe, expect, it } from 'vitest';
import { resetOperationsStore } from '../../operations';
import {
  createStorageSpace,
  deleteStorageSpace,
  getStorageMountsForResource,
  queryStorageSpaces,
  requestStorageExpansion,
  requestStorageMount,
  resetStorageStore,
} from './storageStore';

const storage = new Map<string, string>();

describe('storageStore', () => {
  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
    resetStorageStore();
    resetOperationsStore();
  });

  it('filters storage spaces and exposes canonical resource mounts', async () => {
    const shared = await queryStorageSpaces({ type: 'shared', mounted: 'yes' });
    expect(shared).toHaveLength(1);
    expect(getStorageMountsForResource('cs-east-001')).toHaveLength(2);
  });

  it('persists a submitted storage request and keeps capacity unchanged on expansion', async () => {
    const created = await createStorageSpace({
      name: '项目共享空间',
      type: 'shared',
      site: '东部算力中心',
      capacityGb: 800,
    });
    expect(created.status).toBe('processing');
    expect((await queryStorageSpaces({ search: created.id }))[0]?.name).toBe('项目共享空间');

    await requestStorageExpansion(created.id, 1000);
    expect((await queryStorageSpaces({ search: created.id }))[0]?.capacityGb).toBe(800);
  });

  it('blocks deletion while a mount relation exists', async () => {
    await requestStorageMount('storage-shared-west-001', {
      resourceId: 'cs-west-001',
      resourceName: '西部计算节点',
      resourceType: 'cloud-server',
      mountPath: '/data/shared',
      readOnly: false,
    });
    await expect(deleteStorageSpace('storage-shared-west-001')).rejects.toThrow(
      '存在挂载关系',
    );
  });
});
