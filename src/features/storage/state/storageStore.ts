import { recordOperation } from '../../operations';
import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import type {
  CreateStorageInput,
  StorageMount,
  StorageQuery,
  StorageSpace,
} from '../types';

const STORAGE_KEY = 'computing-platform:storage';
const VERSION = 1;

const INITIAL_SPACES: readonly StorageSpace[] = [
  {
    id: 'storage-shared-east-001',
    name: '研发共享存储',
    type: 'shared',
    site: '东部算力中心',
    technology: 'NFS',
    capacityGb: 2048,
    usedGb: 780,
    status: 'available',
    createdAt: '2026-06-18T02:20:00.000Z',
    updatedAt: '2026-07-21T09:30:00.000Z',
    mounts: [
      {
        id: 'mount-shared-east-001',
        resourceId: 'cs-east-001',
        resourceName: '研发计算节点-01',
        resourceType: 'cloud-server',
        mountPath: '/data/shared',
        readOnly: false,
        status: 'effective',
      },
    ],
  },
  {
    id: 'storage-local-east-001',
    name: '本地工作数据',
    type: 'local',
    site: '东部算力中心',
    technology: 'HostPath',
    capacityGb: 500,
    usedGb: 342,
    status: 'available',
    createdAt: '2026-07-02T06:10:00.000Z',
    updatedAt: '2026-07-20T11:00:00.000Z',
    mounts: [
      {
        id: 'mount-local-east-001',
        resourceId: 'cs-east-001',
        resourceName: '研发计算节点-01',
        resourceType: 'cloud-server',
        mountPath: '/data/local',
        readOnly: false,
        status: 'effective',
      },
    ],
  },
  {
    id: 'storage-shared-west-001',
    name: '西部共享空间',
    type: 'shared',
    site: '西部算力中心',
    technology: 'NFS',
    capacityGb: 4096,
    usedGb: 860,
    status: 'available',
    createdAt: '2026-06-25T03:40:00.000Z',
    updatedAt: '2026-07-19T05:20:00.000Z',
    mounts: [],
  },
];

function isSpace(value: unknown): value is StorageSpace {
  if (!value || typeof value !== 'object') return false;
  const space = value as Partial<StorageSpace>;
  return (
    typeof space.id === 'string' &&
    typeof space.name === 'string' &&
    (space.type === 'local' || space.type === 'shared') &&
    typeof space.site === 'string' &&
    typeof space.capacityGb === 'number' &&
    typeof space.usedGb === 'number' &&
    Array.isArray(space.mounts)
  );
}

function readSpaces() {
  return readVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is StorageSpace[] =>
      Array.isArray(value) && value.every(isSpace),
    () => structuredClone(INITIAL_SPACES) as StorageSpace[],
  );
}

function writeSpaces(spaces: readonly StorageSpace[]) {
  writeVersionedState(STORAGE_KEY, VERSION, spaces);
}

function updateSpace(
  storageId: string,
  update: (space: StorageSpace) => StorageSpace,
) {
  const spaces = readSpaces();
  const index = spaces.findIndex((space) => space.id === storageId);
  if (index < 0) throw new Error('未找到存储空间。');
  const next = update(spaces[index]);
  writeSpaces([...spaces.slice(0, index), next, ...spaces.slice(index + 1)]);
  return next;
}

export function queryStorageSpaces(query: StorageQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readSpaces().filter((space) => {
    const usage = space.capacityGb ? space.usedGb / space.capacityGb : 0;
    if (
      search &&
      ![space.id, space.name, space.site]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search)
    ) return false;
    if (query.type && query.type !== 'all' && space.type !== query.type) return false;
    if (query.status && query.status !== 'all' && space.status !== query.status) return false;
    if (query.mounted === 'yes' && space.mounts.length === 0) return false;
    if (query.mounted === 'no' && space.mounts.length > 0) return false;
    if (query.usage === 'low' && usage >= 0.5) return false;
    if (query.usage === 'medium' && (usage < 0.5 || usage >= 0.8)) return false;
    if (query.usage === 'high' && usage < 0.8) return false;
    return true;
  });
}

export function getStorageSpace(storageId: string) {
  return readSpaces().find((space) => space.id === storageId);
}

export function findStorageSpace(storageId: string) {
  return readSpaces().find((space) => space.id === storageId);
}

export function getStorageSpacesForSite(site: string) {
  return readSpaces().filter(
    (space) =>
      space.site === site &&
      space.type === 'shared' &&
      space.status === 'available',
  );
}

export function getStorageMountsForResource(resourceId: string) {
  return readSpaces().flatMap((space) =>
    space.mounts
      .filter((mount) => mount.resourceId === resourceId)
      .map((mount) => ({ space, mount })),
  );
}

export async function createStorageSpace(input: CreateStorageInput) {
  const name = input.name.trim();
  if (!name) throw new Error('请输入存储名称。');
  if (!Number.isFinite(input.capacityGb) || input.capacityGb <= 0) {
    throw new Error('请输入有效容量。');
  }
  const createdAt = new Date().toISOString();
  const space: StorageSpace = {
    id: `storage-local-${createdAt.replace(/\D/g, '').slice(0, 14)}`,
    name,
    type: input.type,
    site: input.site,
    technology: input.type === 'shared' ? 'NFS' : 'HostPath',
    capacityGb: input.capacityGb,
    usedGb: 0,
    status: 'processing',
    createdAt,
    updatedAt: createdAt,
    mounts: [],
  };
  writeSpaces([space, ...readSpaces()]);
  recordOperation({
    module: 'storage',
    action: '创建存储空间',
    targetId: space.id,
    targetName: space.name,
    status: 'submitted',
    message: '创建请求已提交，等待存储空间准备。',
    targetPath: `/storage/${space.id}`,
  });
  return space;
}

export async function renameStorageSpace(storageId: string, nextName: string) {
  const name = nextName.trim();
  if (!name) throw new Error('请输入存储名称。');
  const updated = updateSpace(storageId, (space) => ({
    ...space,
    name,
    updatedAt: new Date().toISOString(),
  }));
  recordOperation({
    module: 'storage',
    action: '修改存储名称',
    targetId: updated.id,
    targetName: updated.name,
    status: 'completed',
    message: '存储名称已更新。',
    targetPath: `/storage/${updated.id}`,
  });
  return updated;
}

export async function requestStorageExpansion(
  storageId: string,
  capacityGb: number,
) {
  const current = await getStorageSpace(storageId);
  if (!current) throw new Error('未找到存储空间。');
  if (!Number.isFinite(capacityGb) || capacityGb <= current.capacityGb) {
    throw new Error('目标容量必须大于当前容量。');
  }
  recordOperation({
    module: 'storage',
    action: '提交扩容请求',
    targetId: current.id,
    targetName: current.name,
    status: 'submitted',
    message: `扩容至 ${capacityGb} GB 的请求已提交，当前容量保持不变。`,
    targetPath: `/storage/${current.id}`,
  });
  return current;
}

export async function requestStorageMount(
  storageId: string,
  input: Omit<StorageMount, 'id' | 'status'>,
) {
  const updated = updateSpace(storageId, (space) => {
    if (space.mounts.some((mount) => mount.resourceId === input.resourceId)) {
      throw new Error('该资源已存在挂载关系或挂载请求。');
    }
    return {
      ...space,
      updatedAt: new Date().toISOString(),
      mounts: [
        ...space.mounts,
        {
          ...input,
          id: `mount-${Date.now()}`,
          status: 'processing',
        },
      ],
    };
  });
  recordOperation({
    module: 'storage',
    action: '挂载存储',
    targetId: updated.id,
    targetName: updated.name,
    status: 'processing',
    message: '挂载请求已提交，等待基础设施处理。',
    targetPath: `/storage/${updated.id}`,
  });
  return updated;
}

export async function requestStorageUnmount(
  storageId: string,
  mountId: string,
) {
  const updated = updateSpace(storageId, (space) => ({
    ...space,
    updatedAt: new Date().toISOString(),
    mounts: space.mounts.map((mount) =>
      mount.id === mountId ? { ...mount, status: 'removing' } : mount,
    ),
  }));
  recordOperation({
    module: 'storage',
    action: '卸载存储',
    targetId: updated.id,
    targetName: updated.name,
    status: 'processing',
    message: '卸载请求已提交，当前关系保留至处理完成。',
    targetPath: `/storage/${updated.id}`,
  });
  return updated;
}

export async function deleteStorageSpace(storageId: string) {
  const spaces = readSpaces();
  const target = spaces.find((space) => space.id === storageId);
  if (!target) throw new Error('未找到存储空间。');
  if (target.mounts.length) throw new Error('存在挂载关系时不能删除。');
  writeSpaces(spaces.filter((space) => space.id !== storageId));
  recordOperation({
    module: 'storage',
    action: '删除存储空间',
    targetId: target.id,
    targetName: target.name,
    status: 'submitted',
    message: '删除请求已提交。',
  });
}

export function resetStorageStore() {
  removeVersionedState(STORAGE_KEY);
}
