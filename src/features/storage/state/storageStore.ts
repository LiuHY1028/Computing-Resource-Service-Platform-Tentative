import { storageDetailPath, storageFilesPath } from '../../../app/routes';
import { createApplicationOrder } from '../../orders';
import { recordOperation } from '../../operations';
import {
  calculateStoragePrice,
  combinePriceQuotes,
  createPriceSnapshot,
  createZeroPriceSnapshot,
  type PriceQuote,
} from '../../pricing';
import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import { getResourceByAnyId } from '../../resources/state/resourceStore';
import type {
  PurchaseStorageInput,
  StorageMount,
  StorageQuery,
  StorageSpace,
} from '../types';

const STORAGE_KEY = 'computing-platform:storage';
const VERSION = 4;

function storageQuote(
  skuId: string,
  capacityGb: number,
  name: string,
  durationMonths = 1,
): PriceQuote {
  return calculateStoragePrice({ skuId, capacityGb, label: name, durationMonths });
}

function priceSnapshot(
  skuId: string,
  capacityGb: number,
  name: string,
  generatedAt: string,
) {
  return createPriceSnapshot(skuId, storageQuote(skuId, capacityGb, name), generatedAt);
}

const INITIAL_SPACES: readonly StorageSpace[] = [
  {
    id: 'storage-shared-east-001',
    skuId: 'storage-shared-performance-gb-month',
    name: '研发共享存储',
    type: 'shared',
    performanceTier: 'performance',
    site: '东部算力中心',
    capacityGb: 2048,
    usedGb: 780,
    systemReservedGb: 780,
    status: 'available',
    billingMode: 'subscription',
    expiresAt: '2027-06-30T23:59:59+08:00',
    autoRenew: true,
    fileSystem: 'NFS',
    protocol: 'NFS',
    mountPath: '/data/shared',
    initialized: true,
    iops: 18500,
    throughputMbs: 620,
    fileCount: 3,
    directoryCount: 5,
    createdAt: '2026-06-18T02:20:00.000Z',
    updatedAt: '2026-07-21T09:30:00.000Z',
    lastOperatedAt: '2026-07-21T09:30:00.000Z',
    mounts: [{
      id: 'mount-shared-east-001',
      resourceId: 'cs-east-001',
      resourceName: '研发计算节点-01',
      resourceType: 'cloud-server',
      mountPath: '/data/shared',
      readOnly: false,
      status: 'effective',
    }],
    priceSnapshot: priceSnapshot(
      'storage-shared-performance-gb-month',
      2048,
      '研发共享存储',
      '2026-06-18T02:20:00.000Z',
    ),
  },
  {
    id: 'storage-cloud-east-001',
    skuId: 'storage-cloud-performance-gb-month',
    name: '数据库数据盘',
    type: 'cloud-disk',
    performanceTier: 'performance',
    site: '东部算力中心',
    capacityGb: 500,
    usedGb: 342,
    systemReservedGb: 342,
    status: 'available',
    billingMode: 'subscription',
    expiresAt: '2027-06-30T23:59:59+08:00',
    autoRenew: false,
    fileSystem: 'xfs',
    mountPath: '/data/database',
    initialized: true,
    diskType: 'performance',
    deviceName: '/dev/vdb',
    iops: 16000,
    throughputMbs: 480,
    fileCount: 1,
    directoryCount: 2,
    createdAt: '2026-07-02T06:10:00.000Z',
    updatedAt: '2026-07-20T11:00:00.000Z',
    lastOperatedAt: '2026-07-20T11:00:00.000Z',
    mounts: [{
      id: 'mount-cloud-east-001',
      resourceId: 'cs-east-001',
      resourceName: '研发计算节点-01',
      resourceType: 'cloud-server',
      mountPath: '/data/database',
      deviceName: '/dev/vdb',
      readOnly: false,
      status: 'effective',
    }],
    priceSnapshot: priceSnapshot(
      'storage-cloud-performance-gb-month',
      500,
      '数据库数据盘',
      '2026-07-02T06:10:00.000Z',
    ),
  },
  {
    id: 'storage-shared-west-001',
    skuId: 'storage-shared-standard-gb-month',
    name: '西部共享空间',
    type: 'shared',
    performanceTier: 'standard',
    site: '西部算力中心',
    capacityGb: 4096,
    usedGb: 860,
    systemReservedGb: 860,
    status: 'available',
    billingMode: 'subscription',
    expiresAt: '2027-09-30T23:59:59+08:00',
    autoRenew: false,
    fileSystem: 'NFS',
    protocol: 'NFS',
    mountPath: '/data/shared',
    initialized: true,
    iops: 12000,
    throughputMbs: 420,
    fileCount: 0,
    directoryCount: 2,
    createdAt: '2026-06-25T03:40:00.000Z',
    updatedAt: '2026-07-19T05:20:00.000Z',
    lastOperatedAt: '2026-07-19T05:20:00.000Z',
    mounts: [],
    priceSnapshot: priceSnapshot(
      'storage-shared-standard-gb-month',
      4096,
      '西部共享空间',
      '2026-06-25T03:40:00.000Z',
    ),
  },
];

function isSpace(value: unknown): value is StorageSpace {
  if (!value || typeof value !== 'object') return false;
  const space = value as Partial<StorageSpace>;
  return typeof space.id === 'string'
    && typeof space.skuId === 'string'
    && (space.type === 'cloud-disk' || space.type === 'shared')
    && typeof space.capacityGb === 'number'
    && typeof space.usedGb === 'number'
    && Array.isArray(space.mounts)
    && typeof space.priceSnapshot === 'object';
}

function readSpaces() {
  return readVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is StorageSpace[] => Array.isArray(value) && value.every(isSpace),
    () => structuredClone(INITIAL_SPACES) as StorageSpace[],
  );
}

function writeSpaces(spaces: readonly StorageSpace[]) {
  writeVersionedState(STORAGE_KEY, VERSION, spaces);
}

function updateSpace(storageId: string, update: (space: StorageSpace) => StorageSpace) {
  const spaces = readSpaces();
  const index = spaces.findIndex((space) => space.id === storageId);
  if (index < 0) throw new Error('未找到存储。');
  const next = update(spaces[index]);
  writeSpaces([...spaces.slice(0, index), next, ...spaces.slice(index + 1)]);
  return next;
}

function withResourceNames(space: StorageSpace): StorageSpace {
  return {
    ...space,
    mounts: space.mounts.map((mount) => {
      const resource = getResourceByAnyId(mount.resourceId);
      return resource ? { ...mount, resourceName: resource.name } : mount;
    }),
  };
}

export function queryStorageSpaces(query: StorageQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readSpaces().filter((space) => {
    const usage = space.capacityGb ? space.usedGb / space.capacityGb : 0;
    if (search && ![space.id, space.name, space.site].join(' ').toLocaleLowerCase().includes(search)) return false;
    if (query.type && query.type !== 'all' && space.type !== query.type) return false;
    if (query.status && query.status !== 'all' && space.status !== query.status) return false;
    if (query.mounted === 'yes' && !space.mounts.length) return false;
    if (query.mounted === 'no' && space.mounts.length) return false;
    if (query.usage === 'low' && usage >= 0.5) return false;
    if (query.usage === 'medium' && (usage < 0.5 || usage >= 0.8)) return false;
    if (query.usage === 'high' && usage < 0.8) return false;
    return true;
  }).map(withResourceNames);
}

export function getStorageSpace(storageId: string) {
  const space = readSpaces().find((candidate) => candidate.id === storageId);
  return space ? withResourceNames(space) : undefined;
}

export function findStorageSpace(storageId: string) {
  return readSpaces().find((candidate) => candidate.id === storageId);
}

export function getStorageSpacesForSite(site: string) {
  return readSpaces().filter(
    (space) =>
      space.site === site
      && space.status === 'available'
      && (space.type === 'shared' || space.mounts.length === 0),
  );
}

export function getStorageMountsForResource(resourceId: string) {
  return readSpaces().flatMap((space) => space.mounts
    .filter((mount) => mount.resourceId === resourceId)
    .map((mount) => ({ space, mount })));
}

function storageSku(input: Pick<PurchaseStorageInput, 'type' | 'performanceTier'>) {
  return input.type === 'cloud-disk'
    ? `storage-cloud-${input.performanceTier}-gb-month`
    : `storage-shared-${input.performanceTier}-gb-month`;
}

export async function purchaseStorage(input: PurchaseStorageInput) {
  const name = input.name.trim();
  if (!name) throw new Error('请输入存储名称。');
  if (input.capacityGb < 10 || !Number.isSafeInteger(input.capacityGb)) throw new Error('容量必须为不小于 10 GB 的整数。');
  if (input.quantity < 1 || input.quantity > 10) throw new Error('购买数量必须为 1 至 10。');
  const skuId = storageSku(input);
  if (input.skuId !== skuId) throw new Error('存储规格与价格目录不一致。');
  if (input.type === 'cloud-disk' && input.mounts.length > 1) throw new Error('云硬盘一次只能挂载到一台云服务器。');

  const now = new Date().toISOString();
  const created: StorageSpace[] = [];
  for (let index = 0; index < input.quantity; index += 1) {
    const id = `storage-${input.type === 'cloud-disk' ? 'cloud' : 'shared'}-${now.replace(/\D/g, '').slice(0, 14)}-${index + 1}`;
    const mounts = input.mounts.map((mount, mountIndex) => {
      const resource = getResourceByAnyId(mount.resourceId);
      if (!resource || resource.site !== input.site) throw new Error('挂载目标必须是同站点的有效计算资源。');
      if (input.type === 'cloud-disk' && resource.resourceType !== 'cloud-server') throw new Error('云硬盘只能挂载到云服务器。');
      return {
        ...mount,
        id: `mount-${id}-${mountIndex + 1}`,
        resourceName: resource.name,
        status: 'processing' as const,
      };
    });
    const quote = storageQuote(skuId, input.capacityGb, name, input.durationMonths);
    created.push({
      id,
      skuId,
      name: input.quantity > 1 ? `${name}-${index + 1}` : name,
      type: input.type,
      performanceTier: input.performanceTier,
      site: input.site,
      capacityGb: input.capacityGb,
      usedGb: input.type === 'shared' ? 2 : 0,
      systemReservedGb: input.type === 'shared' ? 2 : 0,
      status: 'preparing',
      billingMode: 'subscription',
      expiresAt: new Date(new Date(now).setUTCMonth(new Date(now).getUTCMonth() + input.durationMonths)).toISOString(),
      autoRenew: input.autoRenew,
      fileSystem: input.type === 'shared' ? (input.protocol ?? 'NFS') : 'uninitialized',
      protocol: input.type === 'shared' ? (input.protocol ?? 'NFS') : undefined,
      mountPath: mounts[0]?.mountPath ?? (input.type === 'shared' ? '/data/shared' : '/data/disk'),
      initialized: input.type === 'shared',
      diskType: input.type === 'cloud-disk' ? input.performanceTier : undefined,
      deviceName: input.type === 'cloud-disk' ? (mounts[0]?.deviceName ?? '/dev/vdb') : undefined,
      iops: input.performanceTier === 'performance' ? 16000 : 8000,
      throughputMbs: input.performanceTier === 'performance' ? 480 : 260,
      fileCount: 0,
      directoryCount: 1,
      createdAt: now,
      updatedAt: now,
      lastOperatedAt: now,
      mounts,
      priceSnapshot: createPriceSnapshot(skuId, quote, now),
    });
  }
  writeSpaces([...created, ...readSpaces()]);
  const combined = combinePriceQuotes(
    created.map((space) => storageQuote(space.skuId, space.capacityGb, space.name, input.durationMonths)),
    'monthly-capacity',
    input.durationMonths,
  );
  const order = createApplicationOrder({
    applicationType: 'storage-purchase',
    resourceType: 'storage',
    storageId: created[0].id,
    resourceIds: created.map((space) => space.id),
    resourceName: name,
    site: input.site,
    configurationChanges: `${input.capacityGb} GB × ${input.quantity}`,
    summary: [
      { label: '存储类型', value: input.type === 'cloud-disk' ? '云硬盘' : '高性能共享存储' },
      { label: '性能等级', value: input.performanceTier === 'performance' ? '性能型' : '标准型' },
      { label: '容量', value: `${input.capacityGb} GB` },
      { label: '数量', value: String(input.quantity) },
      { label: '计费周期', value: `${input.durationMonths} 个月` },
      { label: '挂载配置', value: mountsSummary(input.mounts) },
      { label: '处理说明', value: '存储与挂载关系处于准备中，等待后续交付' },
    ],
    priceSnapshot: createPriceSnapshot(skuId, combined, now),
  });
  created.forEach((space) => recordOperation({
    module: 'storage',
    action: '购买存储',
    targetId: space.id,
    targetName: space.name,
    status: 'submitted',
    message: '购买申请已提交，存储处于准备中。',
    targetPath: storageDetailPath(space.id),
    createdAt: now,
  }));
  return { spaces: created, order };
}

function mountsSummary(mounts: PurchaseStorageInput['mounts']) {
  return mounts.length ? `立即挂载 ${mounts.length} 个资源` : '暂不挂载';
}

export async function renameStorageSpace(storageId: string, nextName: string) {
  const name = nextName.trim();
  if (!name) throw new Error('请输入存储名称。');
  const updated = updateSpace(storageId, (space) => ({ ...space, name, updatedAt: new Date().toISOString(), lastOperatedAt: new Date().toISOString() }));
  recordOperation({ module: 'storage', action: '修改存储名称', targetId: updated.id, targetName: updated.name, status: 'completed', message: '存储名称已更新。', targetPath: storageDetailPath(updated.id) });
  return updated;
}

export async function requestStorageExpansion(storageId: string, capacityGb: number) {
  const current = getStorageSpace(storageId);
  if (!current) throw new Error('未找到存储。');
  if (!Number.isSafeInteger(capacityGb) || capacityGb <= current.capacityGb) throw new Error('目标容量必须大于当前容量。');
  const additional = capacityGb - current.capacityGb;
  const snapshot = createPriceSnapshot(current.skuId, storageQuote(current.skuId, additional, `${current.name}扩容量`));
  const order = createApplicationOrder({
    applicationType: 'storage-expansion',
    resourceType: 'storage',
    storageId: current.id,
    resourceName: current.name,
    site: current.site,
    configurationChanges: `${current.capacityGb} GB → ${capacityGb} GB`,
    summary: [
      { label: '当前容量', value: `${current.capacityGb} GB` },
      { label: '已用容量', value: `${current.usedGb} GB` },
      { label: '目标容量', value: `${capacityGb} GB` },
      { label: '文件系统', value: '扩容处理完成后按提示扩展文件系统' },
    ],
    priceSnapshot: snapshot,
  });
  recordOperation({ module: 'storage', action: '扩容存储', targetId: current.id, targetName: current.name, status: 'submitted', message: `扩容至 ${capacityGb} GB 的申请已提交，当前容量保持不变。`, targetPath: storageDetailPath(current.id) });
  return order;
}

export async function requestStorageRenewal(storageId: string, durationMonths: 1 | 3 | 6 | 12) {
  const current = getStorageSpace(storageId);
  if (!current) throw new Error('未找到存储。');
  const expected = new Date(current.expiresAt);
  expected.setUTCMonth(expected.getUTCMonth() + durationMonths);
  const snapshot = createPriceSnapshot(current.skuId, storageQuote(current.skuId, current.capacityGb, `${current.name}续期`, durationMonths));
  const order = createApplicationOrder({
    applicationType: 'storage-renewal',
    resourceType: 'storage',
    storageId: current.id,
    resourceName: current.name,
    site: current.site,
    expectedExpiresAt: expected.toISOString(),
    summary: [
      { label: '当前到期时间', value: current.expiresAt },
      { label: '续期周期', value: `${durationMonths} 个月` },
      { label: '预计新到期时间', value: expected.toISOString() },
      { label: '自动续费', value: current.autoRenew ? '已开启' : '未开启' },
    ],
    priceSnapshot: snapshot,
  });
  recordOperation({ module: 'storage', action: '续期存储', targetId: current.id, targetName: current.name, status: 'submitted', message: '续期申请已提交，当前到期时间保持不变。', targetPath: storageDetailPath(current.id) });
  return order;
}

export async function setStorageAutoRenew(storageId: string, enabled: boolean) {
  const updated = updateSpace(storageId, (space) => ({ ...space, autoRenew: enabled, updatedAt: new Date().toISOString(), lastOperatedAt: new Date().toISOString() }));
  recordOperation({ module: 'storage', action: enabled ? '开启自动续费' : '关闭自动续费', targetId: updated.id, targetName: updated.name, status: 'completed', message: `自动续费已${enabled ? '开启' : '关闭'}。`, targetPath: storageDetailPath(updated.id) });
  return updated;
}

export function createStoragePriceQuote(
  space: Pick<StorageSpace, 'skuId' | 'capacityGb' | 'name'>,
  capacityGb = space.capacityGb,
  durationMonths = 1,
) {
  return storageQuote(space.skuId, capacityGb, space.name, durationMonths);
}

export async function requestStorageMount(storageId: string, input: Omit<StorageMount, 'id' | 'status'>) {
  const resource = getResourceByAnyId(input.resourceId);
  if (!resource || resource.resourceType !== input.resourceType) throw new Error('未找到有效的挂载资源。');
  const updated = updateSpace(storageId, (space) => {
    if (resource.site !== space.site) throw new Error('挂载目标与存储必须位于同一站点。');
    if (space.type === 'cloud-disk' && resource.resourceType !== 'cloud-server') throw new Error('云硬盘只能挂载到云服务器。');
    if (space.type === 'cloud-disk' && space.mounts.length) throw new Error('云硬盘一次只能挂载到一台云服务器。');
    if (space.mounts.some((mount) => mount.resourceId === input.resourceId && mount.status !== 'removing')) throw new Error('该资源已存在挂载关系或挂载请求。');
    const now = new Date().toISOString();
    return {
      ...space,
      updatedAt: now,
      lastOperatedAt: now,
      mounts: [...space.mounts, { ...input, resourceName: resource.name, id: `mount-${Date.now()}`, status: 'processing' }],
    };
  });
  createApplicationOrder({
    applicationType: 'storage-mount',
    resourceType: 'storage',
    storageId,
    resourceId: input.resourceId,
    resourceName: updated.name,
    site: updated.site,
    summary: [
      { label: '目标资源', value: `${resource.name}（${resource.id}）` },
      { label: '挂载路径', value: input.mountPath },
      { label: '读写模式', value: input.readOnly ? '只读' : '读写' },
    ],
    priceSnapshot: createZeroPriceSnapshot('storage-mount', '挂载申请不产生额外存储费用'),
  });
  recordOperation({ module: 'storage', action: '挂载存储', targetId: updated.id, targetName: updated.name, status: 'processing', message: '挂载申请已提交，等待处理。', targetPath: storageDetailPath(updated.id) });
  return updated;
}

export async function requestStorageUnmount(storageId: string, mountId: string) {
  const current = getStorageSpace(storageId);
  const mount = current?.mounts.find((candidate) => candidate.id === mountId);
  if (!current || !mount) throw new Error('未找到挂载关系。');
  const updated = updateSpace(storageId, (space) => ({
    ...space,
    updatedAt: new Date().toISOString(),
    lastOperatedAt: new Date().toISOString(),
    mounts: space.mounts.map((candidate) => candidate.id === mountId ? { ...candidate, status: 'removing' } : candidate),
  }));
  createApplicationOrder({
    applicationType: 'storage-unmount',
    resourceType: 'storage',
    storageId,
    resourceId: mount.resourceId,
    resourceName: updated.name,
    site: updated.site,
    summary: [{ label: '目标资源', value: `${mount.resourceName}（${mount.resourceId}）` }, { label: '挂载路径', value: mount.mountPath }],
    priceSnapshot: createZeroPriceSnapshot('storage-unmount', '卸载申请不产生费用'),
  });
  recordOperation({ module: 'storage', action: '卸载存储', targetId: updated.id, targetName: updated.name, status: 'processing', message: '卸载申请已提交，当前关系保留至处理完成。', targetPath: storageDetailPath(updated.id) });
  return updated;
}

export async function requestStorageRelease(storageId: string) {
  const current = getStorageSpace(storageId);
  if (!current) throw new Error('未找到存储。');
  if (current.mounts.some((mount) => mount.status !== 'removing')) throw new Error('请先卸载存储，再提交释放申请。');
  createApplicationOrder({
    applicationType: 'storage-release',
    resourceType: 'storage',
    storageId,
    resourceName: current.name,
    site: current.site,
    summary: [{ label: '存储', value: `${current.name}（${current.id}）` }, { label: '处理说明', value: '申请完成前保留存储与文件记录' }],
    priceSnapshot: createZeroPriceSnapshot('storage-release', '释放申请不产生费用'),
  });
  recordOperation({ module: 'storage', action: '释放存储', targetId: current.id, targetName: current.name, status: 'submitted', message: '释放申请已提交，当前数据保持不变。', targetPath: storageDetailPath(current.id) });
}

export function updateStorageUsage(storageId: string, usedBytes: number, fileCount: number, directoryCount: number) {
  return updateSpace(storageId, (space) => {
    const usedGb = Math.max(space.systemReservedGb, Math.ceil(usedBytes / 1024 / 1024 / 1024 * 1000) / 1000 + space.systemReservedGb);
    if (usedGb > space.capacityGb) throw new Error('文件大小超过存储可用容量。');
    const now = new Date().toISOString();
    return { ...space, usedGb, fileCount, directoryCount, updatedAt: now, lastOperatedAt: now };
  });
}

export function filesTargetPath(storageId: string) {
  return storageFilesPath(storageId);
}

export function resetStorageStore() {
  removeVersionedState(STORAGE_KEY);
}
