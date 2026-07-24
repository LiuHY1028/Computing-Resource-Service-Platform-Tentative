import { createApplicationOrder } from '../../orders';
import { resourceDetailPath } from '../../../app/routes';
import { recordOperation } from '../../operations';
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
  createPriceSnapshot,
  type PriceQuote,
} from '../../pricing';
import { createInitialResourceCatalog } from '../data/resourceCatalog';
import type {
  CloudServerResource,
  ExtensionRequest,
  OperationRecord,
  PhysicalMachineResource,
  RenewalRequest,
  Resource,
  ResourceAction,
  ResourceActionAvailability,
  ResourceActionRequest,
  ResourceActionResult,
  ResourceFilterOptions,
  ResourceQuery,
  ResourceQueryResult,
  ResourceType,
} from '../types';

let resources = createInitialResourceCatalog();
let operationSequence = 100;

export class ResourceActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceActionError';
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function unique(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

function pathFor(resource: Resource) {
  return resourceDetailPath(resource.resourceType, resource.id);
}

function resourceSearchText(resource: Resource) {
  return [
    resource.id,
    resource.name,
    resource.site,
    resource.cpu,
    resource.accelerator?.model ?? '',
    resource.project,
    resource.tags.join(' '),
    resource.purpose,
    resource.owner,
    resource.resourceType === 'cloud-server'
      ? `${resource.instanceSpec} ${resource.image} ${resource.operatingSystem} ${resource.vpc}`
      : `${resource.assetNumber} ${resource.machineModel} ${resource.cpuModel} ${resource.operatingSystem} ${resource.hostname} ${resource.room} ${resource.rack}`,
  ].join(' ').toLocaleLowerCase();
}

function matchesQuery(resource: Resource, query: ResourceQuery) {
  const search = query.search.trim().toLocaleLowerCase();
  if (search && !resourceSearchText(resource).includes(search)) return false;
  if (query.site !== 'all' && resource.site !== query.site) return false;
  if (query.room && query.room !== 'all' && (resource.resourceType !== 'physical-machine' || resource.room !== query.room)) return false;
  if (query.status !== 'all' && resource.status !== query.status) return false;
  if (query.healthStatus && query.healthStatus !== 'all' && resource.health.status !== query.healthStatus) return false;
  if (query.computeType !== 'all' && resource.computeType !== query.computeType) return false;
  if (query.acceleratorModel !== 'all' && resource.accelerator?.model !== query.acceleratorModel) return false;
  if (query.expiryState !== 'all' && resource.expiryState !== query.expiryState) return false;
  if (query.billingMode && query.billingMode !== 'all' && (resource.resourceType !== 'cloud-server' || resource.billingMode !== query.billingMode)) return false;
  if (query.scope !== 'all' && resource.project !== query.scope && resource.owner !== query.scope) return false;
  if (query.tag && query.tag !== 'all' && !resource.tags.includes(query.tag)) return false;
  if (query.image !== 'all' && (resource.resourceType !== 'cloud-server' || resource.image !== query.image)) return false;
  if (query.operatingSystem !== 'all' && resource.operatingSystem !== query.operatingSystem) return false;
  return true;
}

export function queryResources(query: ResourceQuery): ResourceQueryResult {
  const typed = resources.filter((resource) => resource.resourceType === query.resourceType);
  const items = typed.filter((resource) => matchesQuery(resource, query));
  return { items: clone(items), total: items.length, catalogTotal: typed.length };
}

export function listResources(resourceType?: ResourceType): readonly Resource[] {
  return clone(resourceType ? resources.filter((resource) => resource.resourceType === resourceType) : resources);
}

export function getResourceByAnyId(resourceId: string): Resource | undefined {
  const resource = resources.find((candidate) => candidate.id === resourceId);
  return resource ? clone(resource) : undefined;
}

export function getResourceById(resourceType: ResourceType, resourceId: string): Resource | undefined {
  const resource = resources.find((candidate) => candidate.resourceType === resourceType && candidate.id === resourceId);
  return resource ? clone(resource) : undefined;
}

export function getOperationRecords(resourceType: ResourceType, resourceId: string): readonly OperationRecord[] {
  return getResourceById(resourceType, resourceId)?.operationRecords ?? [];
}

export function getResourceFilterOptions(resourceType: ResourceType): ResourceFilterOptions {
  const items = resources.filter((resource) => resource.resourceType === resourceType);
  return {
    sites: unique(items.map((resource) => resource.site)),
    rooms: unique(items.flatMap((resource) => resource.resourceType === 'physical-machine' ? [resource.room] : [])),
    statuses: [...new Set(items.map((resource) => resource.status))],
    healthStatuses: [...new Set(items.map((resource) => resource.health.status))],
    acceleratorModels: unique(items.flatMap((resource) => resource.accelerator ? [resource.accelerator.model] : [])),
    scopes: unique(items.flatMap((resource) => [resource.project, resource.owner])),
    tags: unique(items.flatMap((resource) => resource.tags)),
    images: unique(items.flatMap((resource) => resource.resourceType === 'cloud-server' ? [resource.image] : [])),
    operatingSystems: unique(items.map((resource) => resource.operatingSystem)),
  };
}

export function getResourceActionAvailability(resource: Resource, action: ResourceAction): ResourceActionAvailability {
  if (resource.lifecycleRequestState === 'release-processing') return { enabled: false, reason: '资源释放申请正在处理中。' };
  if (resource.status === 'preparing') return { enabled: false, reason: '资源正在准备中，暂时无法提交该操作。' };
  if (resource.status === 'operating') return { enabled: false, reason: '已有操作正在处理中，请稍后再试。' };
  if (action === 'release') {
    return resource.status === 'expired' || resource.status === 'stopped'
      ? { enabled: true }
      : { enabled: false, reason: '请先停止资源，再提交释放申请。' };
  }
  if (action === 'rename') return { enabled: true };
  if (resource.status === 'expired') return { enabled: false, reason: '资源已到期，当前仅可处理有效期或释放申请。' };
  if (resource.status === 'abnormal') return { enabled: false, reason: '资源状态异常，请先核对健康情况。' };
  if (action === 'start') return resource.status === 'stopped' ? { enabled: true } : { enabled: false, reason: '仅已停止的资源可启动。' };
  if (action === 'stop' || action === 'restart') return resource.status === 'running' ? { enabled: true } : { enabled: false, reason: '仅运行中的资源可执行该操作。' };
  return { enabled: false, reason: '当前操作不可用。' };
}

export function getRenewalAvailability(resource: Resource): ResourceActionAvailability {
  if (resource.resourceType !== 'cloud-server') return { enabled: false, reason: '物理机使用延期申请。' };
  if (resource.billingMode !== 'subscription') return { enabled: false, reason: '按量计费资源无需续费。' };
  if (resource.lifecycleRequestState === 'release-processing') return { enabled: false, reason: '释放申请处理中，不能续费。' };
  return { enabled: true };
}

export function getExtensionAvailability(resource: Resource): ResourceActionAvailability {
  if (resource.resourceType !== 'physical-machine') return { enabled: false, reason: '云服务器使用续费申请。' };
  if (resource.health.status === 'warning' || resource.deliveryStatus === 'releasing') return { enabled: false, reason: '硬件告警或释放中的资源不可申请延期。' };
  return resource.extensionStatus === 'pending'
    ? { enabled: false, reason: '已有延期申请正在处理。' }
    : { enabled: true };
}

function actionLabel(action: ResourceAction) {
  return action === 'start' ? '启动' : action === 'stop' ? '停止' : action === 'restart' ? '重启' : action === 'rename' ? '修改名称' : '资源释放申请';
}

function addMonths(value: string, months: number) {
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString();
}

export function createRenewalQuote(
  resource: CloudServerResource,
  periodMonths: 1 | 3 | 6 | 12,
  renewStorage = true,
): PriceQuote {
  const dataDisk = renewStorage
    ? resource.dataDisks.find((disk) => disk.role === 'data')
    : undefined;
  const snapshotStorage = renewStorage && !dataDisk
    ? resource.priceSnapshot.lineItems.find((item) => item.category === 'dataStorage')
    : undefined;
  const snapshotStorageSku = snapshotStorage?.id.split(':storage')[0];
  return calculateCloudPrice({
    skuId: resource.skuId,
    billingMode: 'subscription',
    quantity: 1,
    durationMonths: periodMonths,
    systemDiskGb: resource.systemDiskGb,
    imageId: resource.imageId,
    storage: dataDisk
      ? {
          skuId: dataDisk.displayType === '高性能共享存储'
            ? 'storage-shared-gb-month'
            : 'storage-local-100gb-month',
          capacityGb: dataDisk.capacityGb,
          label: dataDisk.displayType,
          included: dataDisk.displayType === '本地数据存储',
        }
      : snapshotStorage && snapshotStorageSku
        ? {
            skuId: snapshotStorageSku,
            capacityGb: snapshotStorageSku === 'storage-local-100gb-month'
              ? snapshotStorage.quantity * 100
              : snapshotStorage.quantity,
            label: snapshotStorage.label,
            included: snapshotStorage.included,
          }
      : undefined,
  });
}

export function createExtensionQuote(
  resource: PhysicalMachineResource,
  periodMonths: 1 | 3 | 6 | 12,
): PriceQuote {
  return calculatePhysicalPrice({
    skuId: resource.skuId,
    quantity: 1,
    durationMonths: periodMonths,
  });
}

function updateResource(resourceId: string, update: (resource: Resource) => Resource) {
  const index = resources.findIndex((resource) => resource.id === resourceId);
  if (index < 0) throw new ResourceActionError(`未找到目标资源：${resourceId}`);
  const next = update(resources[index]);
  resources = [...resources.slice(0, index), next, ...resources.slice(index + 1)];
  return next;
}

function operation(resource: Resource, action: string, message: string): OperationRecord {
  operationSequence += 1;
  const record: OperationRecord = {
    id: `operation-local-${operationSequence}`,
    action,
    actor: '当前用户',
    createdAt: new Date().toISOString(),
    status: 'submitted',
    message,
  };
  recordOperation({
    module: 'resource',
    action,
    targetId: resource.id,
    targetName: resource.name,
    status: 'submitted',
    message,
    targetPath: pathFor(resource),
    createdAt: record.createdAt,
  });
  return record;
}

export async function submitResourceAction(request: ResourceActionRequest): Promise<ResourceActionResult> {
  const current = getResourceById(request.resourceType, request.resourceId);
  if (!current) throw new ResourceActionError('未找到目标资源。');
  const availability = getResourceActionAvailability(current, request.action);
  if (!availability.enabled) throw new ResourceActionError(availability.reason ?? '当前操作不可用。');
  if (request.action === 'rename') {
    const nextName = request.nextName?.trim() ?? '';
    if (!nextName) throw new ResourceActionError('请输入资源名称。');
    if (nextName.length > 48) throw new ResourceActionError('资源名称不能超过 48 个字符。');
    if (nextName === current.name) throw new ResourceActionError('请输入与当前名称不同的资源名称。');
  }
  if (request.action === 'release') {
    const record = operation(current, '资源释放申请', '释放申请已提交，资源在处理完成前保持可追踪。');
    const updated = updateResource(current.id, (resource) => ({
      ...resource,
      lifecycleRequestState: 'release-processing',
      lastOperatedAt: record.createdAt,
      operationRecords: [record, ...resource.operationRecords],
      ...(resource.resourceType === 'physical-machine' ? { deliveryStatus: 'releasing' as const } : {}),
    }));
    createApplicationOrder({
      applicationType: 'resource-release',
      resourceType: current.resourceType,
      resourceId: current.id,
      resourceName: current.name,
      site: current.site,
      summary: [
        { label: '申请类型', value: '资源释放' },
        { label: '关联资源', value: `${current.name}（${current.id}）` },
        { label: '处理说明', value: '申请处理完成前资源保持可追踪' },
      ],
    });
    return { resource: clone(updated), record: clone(record) };
  }
  const record = operation(current, actionLabel(request.action), request.action === 'rename' ? '资源名称已更新。' : `${actionLabel(request.action)}操作已提交。`);
  const updated = updateResource(current.id, (resource) => ({
    ...resource,
    name: request.action === 'rename' ? request.nextName!.trim() : resource.name,
    status: request.action === 'start' ? 'running' : request.action === 'stop' ? 'stopped' : request.action === 'restart' ? 'running' : resource.status,
    lastOperatedAt: record.createdAt,
    operationRecords: [record, ...resource.operationRecords],
  }));
  return { resource: clone(updated), record: clone(record) };
}

export function submitRenewalRequest(input: RenewalRequest) {
  if (!input.resourceIds.length) throw new ResourceActionError('请选择需要续费的云服务器。');
  return input.resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current || current.resourceType !== 'cloud-server') throw new ResourceActionError(`续费申请关联的云服务器不存在：${resourceId}`);
    const availability = getRenewalAvailability(current);
    if (!availability.enabled) throw new ResourceActionError(`${current.name}：${availability.reason}`);
    const pendingExpiresAt = addMonths(current.expiresAt, input.periodMonths);
    const record = operation(current, '云服务器续费', `已提交 ${input.periodMonths} 个月续费申请，正式到期时间将在处理完成后更新。`);
    const updated = updateResource(current.id, (resource) => ({
      ...resource,
      lifecycleRequestState: 'renewal-processing',
      pendingExpiresAt,
      lastOperatedAt: record.createdAt,
      operationRecords: [record, ...resource.operationRecords],
    })) as CloudServerResource;
    const priceSnapshot = createPriceSnapshot(
      current.skuId,
      createRenewalQuote(current, input.periodMonths, input.renewStorage),
    );
    const order = createApplicationOrder({
      applicationType: 'cloud-renewal',
      resourceType: 'cloud-server',
      resourceId: current.id,
      resourceIds: [current.id],
      resourceName: current.name,
      site: current.site,
      expectedExpiresAt: pendingExpiresAt,
      summary: [
        { label: '申请类型', value: '云服务器续费' },
        { label: '关联资源', value: `${current.name}（${current.id}）` },
        { label: '续费周期', value: `${input.periodMonths} 个月` },
        { label: '预计新到期时间', value: new Date(pendingExpiresAt).toLocaleDateString('zh-CN') },
        { label: '关联存储', value: input.renewStorage ? '同步提交续期' : '保持当前期限' },
        { label: '网络资源', value: input.renewNetwork ? '同步提交续期' : '保持当前期限' },
      ],
      priceSnapshot,
    });
    return { resource: clone(updated), order };
  });
}

export function updateAutoRenewal(resourceIds: readonly string[], enabled: boolean, periodMonths: 1 | 3 | 6 | 12) {
  if (!resourceIds.length) throw new ResourceActionError('请选择需要设置自动续费的云服务器。');
  return resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current || current.resourceType !== 'cloud-server') throw new ResourceActionError(`自动续费关联的云服务器不存在：${resourceId}`);
    const availability = getRenewalAvailability(current);
    if (!availability.enabled) throw new ResourceActionError(`${current.name}：${availability.reason}`);
    const record = operation(current, '自动续费设置', `自动续费已${enabled ? `开启，周期为 ${periodMonths} 个月` : '关闭'}。`);
    const updated = updateResource(current.id, (resource) => ({
      ...resource,
      autoRenewal: { enabled, periodMonths },
      lastOperatedAt: record.createdAt,
      operationRecords: [record, ...resource.operationRecords],
    })) as CloudServerResource;
    createApplicationOrder({
      applicationType: 'auto-renewal',
      resourceType: 'cloud-server',
      resourceId: current.id,
      resourceIds: [current.id],
      resourceName: current.name,
      site: current.site,
      summary: [
        { label: '申请类型', value: '自动续费设置' },
        { label: '当前状态', value: enabled ? '已开启' : '已关闭' },
        { label: '自动续费周期', value: `${periodMonths} 个月` },
      ],
      priceSnapshot: createPriceSnapshot(
        current.skuId,
        createRenewalQuote(current, periodMonths),
      ),
    });
    return clone(updated);
  });
}

export function submitExtensionRequest(input: ExtensionRequest) {
  if (!input.resourceIds.length) throw new ResourceActionError('请选择需要延期的物理机。');
  if (!input.reason.trim()) throw new ResourceActionError('请输入延期原因。');
  return input.resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current || current.resourceType !== 'physical-machine') throw new ResourceActionError(`延期申请关联的物理机不存在：${resourceId}`);
    const availability = getExtensionAvailability(current);
    if (!availability.enabled) throw new ResourceActionError(`${current.name}：${availability.reason}`);
    const pendingExpiresAt = addMonths(current.expiresAt, input.periodMonths);
    const record = operation(current, '物理机延期', `已提交 ${input.periodMonths} 个月延期申请，等待处理。`);
    const updated = updateResource(current.id, (resource) => ({
      ...resource,
      lifecycleRequestState: 'extension-processing',
      extensionStatus: 'pending',
      pendingExpiresAt,
      lastOperatedAt: record.createdAt,
      operationRecords: [record, ...resource.operationRecords],
    })) as PhysicalMachineResource;
    const priceSnapshot = createPriceSnapshot(
      current.skuId,
      createExtensionQuote(current, input.periodMonths),
    );
    const order = createApplicationOrder({
      applicationType: 'physical-extension',
      resourceType: 'physical-machine',
      resourceId: current.id,
      resourceIds: [current.id],
      resourceName: current.name,
      site: current.site,
      expectedExpiresAt: pendingExpiresAt,
      summary: [
        { label: '申请类型', value: '物理机延期' },
        { label: '关联资源', value: `${current.name}（${current.assetNumber}）` },
        { label: '延期时长', value: `${input.periodMonths} 个月` },
        { label: '预计新到期时间', value: new Date(pendingExpiresAt).toLocaleDateString('zh-CN') },
        { label: '延期原因', value: input.reason.trim() },
        { label: '项目', value: current.project },
        { label: '责任人', value: current.owner },
      ],
      priceSnapshot,
    });
    return { resource: clone(updated), order };
  });
}

export function updateResourceMetadata(resourceIds: readonly string[], input: Readonly<{ project?: string; tagsToAdd?: readonly string[]; tagsToRemove?: readonly string[] }>) {
  if (!resourceIds.length) throw new ResourceActionError('请选择资源。');
  return resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current) throw new ResourceActionError(`未找到资源：${resourceId}`);
    const tags = unique([
      ...current.tags.filter((tag) => !input.tagsToRemove?.includes(tag)),
      ...(input.tagsToAdd ?? []).map((tag) => tag.trim()).filter(Boolean),
    ]);
    const action = input.project && input.project !== current.project ? '修改项目归属' : '更新资源标签';
    const project = input.project?.trim() || current.project;
    const record = operation(current, action, `项目归属：${project}；标签：${tags.join('、') || '无'}。`);
    return clone(updateResource(current.id, (resource) => ({
      ...resource,
      project,
      tags,
      lastOperatedAt: record.createdAt,
      operationRecords: [record, ...resource.operationRecords],
    })));
  });
}

export async function submitBatchPowerAction(resourceIds: readonly string[], action: 'start' | 'stop' | 'restart') {
  if (!resourceIds.length) throw new ResourceActionError('请选择资源。');
  const selected = resourceIds.map((id) => getResourceByAnyId(id));
  if (selected.some((resource) => !resource)) throw new ResourceActionError('选择中包含不存在的资源。');
  const invalid = selected.find((resource) => resource && !getResourceActionAvailability(resource, action).enabled);
  if (invalid) throw new ResourceActionError(`${invalid.name}：${getResourceActionAvailability(invalid, action).reason}`);
  return Promise.all(selected.map((resource) => submitResourceAction({ resourceType: resource!.resourceType, resourceId: resource!.id, action })));
}

export function submitResourceApplication(
  resourceIds: readonly string[],
  applicationType: 'configuration-change' | 'os-reinstall',
  details: string,
) {
  if (!resourceIds.length) throw new ResourceActionError('请选择资源。');
  if (!details.trim()) throw new ResourceActionError('请填写申请说明。');
  return resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current) throw new ResourceActionError(`未找到资源：${resourceId}`);
    if (current.status === 'preparing' || current.lifecycleRequestState === 'release-processing') {
      throw new ResourceActionError(`${current.name} 当前不可提交该申请。`);
    }
    const action = applicationType === 'configuration-change' ? '变更配置申请' : '重装系统申请';
    const record = operation(current, action, `${action}已提交，等待处理。`);
    const updated = updateResource(current.id, (resource) => ({
      ...resource,
      lastOperatedAt: record.createdAt,
      operationRecords: [record, ...resource.operationRecords],
    }));
    const order = createApplicationOrder({
      applicationType,
      resourceType: current.resourceType,
      resourceId: current.id,
      resourceName: current.name,
      site: current.site,
      configurationChanges: details.trim(),
      summary: [
        { label: '申请类型', value: applicationType === 'configuration-change' ? '变更配置' : '重装系统' },
        { label: '关联资源', value: `${current.name}（${current.id}）` },
        { label: '申请说明', value: details.trim() },
      ],
    });
    return { resource: clone(updated), order };
  });
}

export function resetResourceStore() {
  resources = createInitialResourceCatalog();
  operationSequence = 100;
}
