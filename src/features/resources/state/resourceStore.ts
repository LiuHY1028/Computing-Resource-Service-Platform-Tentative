import { resourceDetailPath } from '../../../app/routes';
import { createCommerceOrder, type CommerceOrder } from '../../orders';
import { getOperationsForTarget, recordOperation } from '../../operations';
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
  createPriceSnapshot,
  type PriceQuote,
} from '../../pricing';
import {
  readMigratedVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import { createInitialResourceCatalog } from '../data/resourceCatalog';
import type {
  CloudServerResource,
  RentalRenewalOrderInput,
  OperationRecord,
  PhysicalMachineResource,
  RenewalOrderInput,
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

const STORAGE_KEY = 'computing-platform:resources';
const VERSION = 3;
let operationSequence = 100;

const CLOUD_STATUSES = new Set([
  'creating',
  'running',
  'stopped',
  'restarting',
  'expiring',
  'expired',
  'releasing',
  'released',
  'abnormal',
]);
const PHYSICAL_STATUSES = new Set([
  'preparing',
  'running',
  'powered-off',
  'restarting',
  'maintenance',
  'expiring',
  'expired',
  'releasing',
  'released',
  'abnormal',
]);

export class ResourceActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceActionError';
  }
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function isResource(value: unknown): value is Resource {
  if (!value || typeof value !== 'object') return false;
  const resource = value as Partial<Resource>;
  return (
    typeof resource.id === 'string' &&
    (resource.resourceType === 'cloud-server' ||
      resource.resourceType === 'physical-machine') &&
    typeof resource.status === 'string' &&
    (resource.resourceType === 'cloud-server'
      ? CLOUD_STATUSES.has(resource.status)
      : PHYSICAL_STATUSES.has(resource.status)) &&
    typeof resource.expiresAt === 'string' &&
    typeof resource.health === 'object'
  );
}

function readResources() {
  return readMigratedVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is Resource[] =>
      Array.isArray(value) && value.every(isResource),
    (value, previousVersion) => {
      if (previousVersion !== 2 || !Array.isArray(value)) return undefined;
      return value.map((candidate) => {
        const resource = candidate as Record<string, unknown>;
        const rest = { ...resource };
        delete rest.operationRecords;
        delete rest.networkRules;
        return {
          ...rest,
          status:
            resource.status === 'resizing'
              ? 'running'
              : resource.status === 'releasing'
                ? 'released'
                : resource.status,
          releasedAt:
            resource.status === 'releasing'
              ? new Date().toISOString()
              : resource.releasedAt,
        };
      }) as Resource[];
    },
    () => createInitialResourceCatalog(),
  );
}

function writeResources(resources: readonly Resource[]) {
  writeVersionedState(STORAGE_KEY, VERSION, resources);
}

function unique(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, 'zh-CN'),
  );
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
  const typed = readResources().filter(
    (resource) => resource.resourceType === query.resourceType,
  );
  const items = typed.filter((resource) => matchesQuery(resource, query));
  return { items: clone(items), total: items.length, catalogTotal: typed.length };
}

export function listResources(resourceType?: ResourceType): readonly Resource[] {
  const resources = readResources();
  return clone(
    resourceType
      ? resources.filter((resource) => resource.resourceType === resourceType)
      : resources,
  );
}

export function getResourceByAnyId(resourceId: string): Resource | undefined {
  const resource = readResources().find((candidate) => candidate.id === resourceId);
  return resource ? clone(resource) : undefined;
}

export function getResourceById(
  resourceType: ResourceType,
  resourceId: string,
): Resource | undefined {
  const resource = readResources().find(
    (candidate) =>
      candidate.resourceType === resourceType && candidate.id === resourceId,
  );
  return resource ? clone(resource) : undefined;
}

export function getOperationRecords(
  resourceType: ResourceType,
  resourceId: string,
): readonly OperationRecord[] {
  return getResourceById(resourceType, resourceId)
    ? getOperationsForTarget(resourceId).map((record) => ({
        id: record.id,
        action: record.action,
        actor: record.actor,
        createdAt: record.createdAt,
        status: record.status,
        message: record.message,
      }))
    : [];
}

export function getResourceFilterOptions(
  resourceType: ResourceType,
): ResourceFilterOptions {
  const items = readResources().filter(
    (resource) => resource.resourceType === resourceType,
  );
  return {
    sites: unique(items.map((resource) => resource.site)),
    rooms: unique(items.flatMap((resource) =>
      resource.resourceType === 'physical-machine' ? [resource.room] : [])),
    statuses: [...new Set(items.map((resource) => resource.status))],
    healthStatuses: [...new Set(items.map((resource) => resource.health.status))],
    acceleratorModels: unique(items.flatMap((resource) =>
      resource.accelerator ? [resource.accelerator.model] : [])),
    scopes: unique(items.flatMap((resource) => [resource.project, resource.owner])),
    tags: unique(items.flatMap((resource) => resource.tags)),
    images: unique(items.flatMap((resource) =>
      resource.resourceType === 'cloud-server' ? [resource.image] : [])),
    operatingSystems: unique(items.map((resource) => resource.operatingSystem)),
  };
}

export function getResourceActionAvailability(
  resource: Resource,
  action: ResourceAction,
): ResourceActionAvailability {
  if (['creating', 'preparing', 'restarting', 'maintenance', 'releasing', 'released'].includes(resource.status)) {
    return { enabled: false, reason: '资源正在执行生命周期操作，请稍后再试。' };
  }
  if (action === 'release') {
    const stopped =
      resource.status === 'expired' ||
      resource.status === 'stopped' ||
      resource.status === 'powered-off';
    return stopped
      ? { enabled: true }
      : { enabled: false, reason: '请先停止或关闭资源，再确认释放。' };
  }
  if (action === 'rename') return { enabled: true };
  if (resource.status === 'expired') {
    return { enabled: false, reason: '资源已到期，当前仅可续费、续租或释放。' };
  }
  if (resource.status === 'abnormal') {
    return { enabled: false, reason: '资源存在严重故障，请先处理健康告警。' };
  }
  if (action === 'start') {
    const stopped =
      resource.status === 'stopped' || resource.status === 'powered-off';
    return stopped
      ? { enabled: true }
      : { enabled: false, reason: '仅已停止或已关机的资源可启动。' };
  }
  if (action === 'stop' || action === 'restart') {
    return resource.status === 'running'
      ? { enabled: true }
      : { enabled: false, reason: '仅运行中的资源可执行该操作。' };
  }
  return { enabled: false, reason: '当前操作不可用。' };
}

export function getRenewalAvailability(
  resource: Resource,
): ResourceActionAvailability {
  if (resource.resourceType !== 'cloud-server') {
    return { enabled: false, reason: '物理机使用续租。' };
  }
  if (resource.billingMode !== 'subscription') {
    return { enabled: false, reason: '按量资源按账期出账，无需续费。' };
  }
  if (resource.status === 'releasing') {
    return { enabled: false, reason: '释放中的资源不能续费。' };
  }
  return { enabled: true };
}

export function getRentalRenewalAvailability(
  resource: Resource,
): ResourceActionAvailability {
  if (resource.resourceType !== 'physical-machine') {
    return { enabled: false, reason: '云服务器使用续费。' };
  }
  if (resource.status === 'releasing' || resource.status === 'abnormal') {
    return { enabled: false, reason: '释放中或异常的物理机不能续租。' };
  }
  return { enabled: true };
}

function actionLabel(action: ResourceAction) {
  if (action === 'start') return '启动';
  if (action === 'stop') return '停止';
  if (action === 'restart') return '重启';
  if (action === 'rename') return '修改名称';
  return '释放资源';
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
            ? 'storage-shared-standard-gb-month'
            : 'storage-cloud-performance-gb-month',
          capacityGb: dataDisk.capacityGb,
          label: dataDisk.displayType,
        }
      : undefined,
  });
}

export function createRentalRenewalQuote(
  resource: PhysicalMachineResource,
  periodMonths: 1 | 3 | 6 | 12,
): PriceQuote {
  return calculatePhysicalPrice({
    skuId: resource.skuId,
    quantity: 1,
    durationMonths: periodMonths,
  });
}

function updateResource(
  resourceId: string,
  update: (resource: Resource) => Resource,
) {
  const resources = readResources();
  const index = resources.findIndex((resource) => resource.id === resourceId);
  if (index < 0) throw new ResourceActionError(`未找到目标资源：${resourceId}`);
  const next = update(resources[index]);
  writeResources([
    ...resources.slice(0, index),
    next,
    ...resources.slice(index + 1),
  ]);
  return next;
}

function operation(
  resource: Resource,
  action: string,
  message: string,
  status: OperationRecord['status'] = 'completed',
): OperationRecord {
  operationSequence += 1;
  const record: OperationRecord = {
    id: `operation-local-${operationSequence}`,
    action,
    actor: '当前用户',
    createdAt: new Date().toISOString(),
    status,
    message,
  };
  recordOperation({
    module: 'resource',
    action,
    targetId: resource.id,
    targetName: resource.name,
    status,
    message,
    targetPath: pathFor(resource),
    createdAt: record.createdAt,
  });
  return record;
}

export async function submitResourceAction(
  request: ResourceActionRequest,
): Promise<ResourceActionResult> {
  const current = getResourceById(request.resourceType, request.resourceId);
  if (!current) throw new ResourceActionError('未找到目标资源。');
  const availability = getResourceActionAvailability(current, request.action);
  if (!availability.enabled) {
    throw new ResourceActionError(availability.reason ?? '当前操作不可用。');
  }
  if (request.action === 'rename') {
    const nextName = request.nextName?.trim() ?? '';
    if (!nextName) throw new ResourceActionError('请输入资源名称。');
    if (nextName.length > 48) throw new ResourceActionError('资源名称不能超过 48 个字符。');
    if (nextName === current.name) throw new ResourceActionError('请输入与当前名称不同的资源名称。');
  }
  if (request.action === 'release') {
    const startedAt = new Date().toISOString();
    operation(
      current,
      '释放资源',
      '资源进入释放处理中。',
      'executing',
    );
    updateResource(current.id, (resource) => ({
      ...resource,
      status: 'releasing',
      lastOperatedAt: startedAt,
    } as Resource));
    const completedRecord = operation(
      current,
      '释放资源',
      '资源已释放，历史信息保留在操作记录中。',
      'completed',
    );
    const released = updateResource(current.id, (resource) => ({
      ...resource,
      status: 'released',
      releasedAt: completedRecord.createdAt,
      lastOperatedAt: completedRecord.createdAt,
    } as Resource));
    return { resource: clone(released), record: clone(completedRecord) };
  }
  const record = operation(
    current,
    actionLabel(request.action),
    request.action === 'rename'
        ? '资源名称已更新。'
        : `${actionLabel(request.action)}操作已完成。`,
    'completed',
  );
  const updated = updateResource(current.id, (resource) => {
    if (resource.resourceType === 'cloud-server') {
      const status =
        request.action === 'start' || request.action === 'restart'
          ? 'running'
          : request.action === 'stop'
            ? 'stopped'
            : resource.status;
      return {
        ...resource,
        name: request.action === 'rename' ? request.nextName!.trim() : resource.name,
        status,
        lastOperatedAt: record.createdAt,
      };
    }
    const status =
      request.action === 'start' || request.action === 'restart'
        ? 'running'
        : request.action === 'stop'
          ? 'powered-off'
          : resource.status;
    return {
      ...resource,
      name: request.action === 'rename' ? request.nextName!.trim() : resource.name,
      status,
      lastOperatedAt: record.createdAt,
    };
  });
  return { resource: clone(updated), record: clone(record) };
}

export function createRenewalOrders(input: RenewalOrderInput) {
  if (!input.resourceIds.length) throw new ResourceActionError('请选择需要续费的云服务器。');
  return input.resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current || current.resourceType !== 'cloud-server') {
      throw new ResourceActionError(`未找到续费云服务器：${resourceId}`);
    }
    const availability = getRenewalAvailability(current);
    if (!availability.enabled) throw new ResourceActionError(`${current.name}：${availability.reason}`);
    const expectedExpiresAt = addMonths(current.expiresAt, input.periodMonths);
    const priceSnapshot = createPriceSnapshot(
      current.skuId,
      createRenewalQuote(current, input.periodMonths, input.renewStorage),
    );
    const order = createCommerceOrder({
      orderType: 'renewal',
      productType: 'cloud-server',
      productName: `${current.name}续费`,
      site: current.site,
      resourceId: current.id,
      resourceIds: [current.id],
      resourceName: current.name,
      configurationSummary: [
        { label: '关联资源', value: `${current.name}（${current.id}）` },
        { label: '续费周期', value: `${input.periodMonths} 个月` },
        { label: '新到期时间', value: new Date(expectedExpiresAt).toLocaleDateString('zh-CN') },
        { label: '关联存储', value: input.renewStorage ? '同步续费' : '保持当前期限' },
        { label: '网络资源', value: input.renewNetwork ? '同步续费' : '保持当前期限' },
      ],
      pricingSnapshot: priceSnapshot,
      fulfillment: {
        kind: 'resource-renewal',
        resourceId: current.id,
        periodMonths: input.periodMonths,
      },
    });
    return { resource: clone(current), order };
  });
}

export function updateAutoRenewal(
  resourceIds: readonly string[],
  enabled: boolean,
  periodMonths: 1 | 3 | 6 | 12,
) {
  if (!resourceIds.length) throw new ResourceActionError('请选择需要设置自动续费的云服务器。');
  return resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current || current.resourceType !== 'cloud-server') {
      throw new ResourceActionError(`未找到云服务器：${resourceId}`);
    }
    const record = operation(
      current,
      '自动续费设置',
      `自动续费已${enabled ? `开启，周期为 ${periodMonths} 个月` : '关闭'}。`,
    );
    return clone(updateResource(current.id, (resource) => {
      if (resource.resourceType !== 'cloud-server') return resource;
      return {
        ...resource,
        autoRenewal: { enabled, periodMonths },
        lastOperatedAt: record.createdAt,
      };
    }));
  });
}

export function createRentalRenewalOrders(input: RentalRenewalOrderInput) {
  if (!input.resourceIds.length) throw new ResourceActionError('请选择需要续租的物理机。');
  return input.resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current || current.resourceType !== 'physical-machine') {
      throw new ResourceActionError(`未找到续租物理机：${resourceId}`);
    }
    const availability = getRentalRenewalAvailability(current);
    if (!availability.enabled) throw new ResourceActionError(`${current.name}：${availability.reason}`);
    const expectedExpiresAt = addMonths(current.expiresAt, input.periodMonths);
    const priceSnapshot = createPriceSnapshot(
      current.skuId,
      createRentalRenewalQuote(current, input.periodMonths),
    );
    const order = createCommerceOrder({
      orderType: 'rentalRenewal',
      productType: 'physical-machine',
      productName: `${current.name}续租`,
      site: current.site,
      resourceId: current.id,
      resourceIds: [current.id],
      resourceName: current.name,
      configurationSummary: [
        { label: '关联资源', value: `${current.name}（${current.assetNumber}）` },
        { label: '续租周期', value: `${input.periodMonths} 个月` },
        { label: '新到期时间', value: new Date(expectedExpiresAt).toLocaleDateString('zh-CN') },
        ...(input.reason.trim() ? [{ label: '用途说明', value: input.reason.trim() }] : []),
      ],
      pricingSnapshot: priceSnapshot,
      fulfillment: {
        kind: 'resource-rental-renewal',
        resourceId: current.id,
        periodMonths: input.periodMonths,
      },
    });
    return { resource: clone(current), order };
  });
}

export function updateResourceMetadata(
  resourceIds: readonly string[],
  input: Readonly<{
    project?: string;
    tagsToAdd?: readonly string[];
    tagsToRemove?: readonly string[];
  }>,
) {
  if (!resourceIds.length) throw new ResourceActionError('请选择资源。');
  return resourceIds.map((resourceId) => {
    const current = getResourceByAnyId(resourceId);
    if (!current) throw new ResourceActionError(`未找到资源：${resourceId}`);
    const tags = unique([
      ...current.tags.filter((tag) => !input.tagsToRemove?.includes(tag)),
      ...(input.tagsToAdd ?? []).map((tag) => tag.trim()).filter(Boolean),
    ]);
    const project = input.project?.trim() || current.project;
    const record = operation(
      current,
      '更新资源信息',
      `项目归属：${project}；标签：${tags.join('、') || '无'}。`,
    );
    return clone(updateResource(current.id, (resource) => ({
      ...resource,
      project,
      tags,
      lastOperatedAt: record.createdAt,
    })));
  });
}

export async function submitBatchPowerAction(
  resourceIds: readonly string[],
  action: 'start' | 'stop' | 'restart',
) {
  if (!resourceIds.length) throw new ResourceActionError('请选择资源。');
  const selected = resourceIds.map((id) => getResourceByAnyId(id));
  if (selected.some((resource) => !resource)) {
    throw new ResourceActionError('选择中包含不存在的资源。');
  }
  const invalid = selected.find(
    (resource) =>
      resource && !getResourceActionAvailability(resource, action).enabled,
  );
  if (invalid) {
    throw new ResourceActionError(
      `${invalid.name}：${getResourceActionAvailability(invalid, action).reason}`,
    );
  }
  return Promise.all(selected.map((resource) =>
    submitResourceAction({
      resourceType: resource!.resourceType,
      resourceId: resource!.id,
      action,
    })));
}

export function fulfillResourceCommerceOrder(order: CommerceOrder) {
  const fulfillment = order.fulfillment;
  if (!fulfillment) return [];
  if (
    fulfillment.kind === 'resource-renewal' ||
    fulfillment.kind === 'resource-rental-renewal'
  ) {
    const updated = updateResource(fulfillment.resourceId, (resource) => ({
      ...resource,
      expiresAt: addMonths(resource.expiresAt, fulfillment.periodMonths),
      expiryState: 'active',
      status: resource.resourceType === 'cloud-server' ? 'running' : 'running',
      lastOperatedAt: new Date().toISOString(),
    } as Resource));
    operation(
      updated,
      fulfillment.kind === 'resource-renewal' ? '续费完成' : '续租完成',
      '支付已完成，资源使用期限已更新。',
    );
    return [updated.id];
  }
  if (fulfillment.kind !== 'resource-purchase') return [];

  const resources = readResources();
  const template = resources.find(
    (resource) => resource.resourceType === fulfillment.resourceType,
  );
  if (!template) throw new ResourceActionError('缺少可用的资源规格模板。');
  const now = new Date().toISOString();
  const quantity = Math.max(1, order.quantity);
  const name =
    order.configurationSummary.find((item) =>
      item.label === '资源名称' || item.label === '实例名称')?.value ??
    order.productName;
  const configuration = fulfillment.configuration;
  const created = Array.from({ length: quantity }, (_, index) => {
    const id = `${fulfillment.resourceType === 'cloud-server' ? 'cs' : 'pm'}-${now.replace(/\D/g, '').slice(0, 14)}-${index + 1}`;
    const expiresAt = addMonths(
      now,
      order.pricingSnapshot.duration ?? 1,
    );
    if (template.resourceType === 'cloud-server') {
      const next: CloudServerResource = {
        ...clone(template),
        id,
        skuId: fulfillment.skuId,
        name: quantity > 1 ? `${name}-${index + 1}` : name,
        site: order.site,
        status: 'running',
        ip: { privateIp: '待分配' },
        connection: {
          available: false,
          notes: '连接信息将在基础设施接入后提供。',
        },
        createdAt: now,
        expiresAt,
        expiryState: 'active',
        purpose:
          typeof configuration.purpose === 'string'
            ? configuration.purpose
            : template.purpose,
        imageId:
          typeof configuration.imageId === 'string'
            ? configuration.imageId
            : template.imageId,
        image:
          order.configurationSummary.find((item) => item.label === '镜像')?.value ??
          template.image,
        autoRenewal: {
          enabled: configuration.autoRenewalEnabled === true,
          periodMonths:
            configuration.periodMonths === '3' ||
            configuration.periodMonths === '6' ||
            configuration.periodMonths === '12'
              ? Number(configuration.periodMonths) as 3 | 6 | 12
              : 1,
        },
        lastOperatedAt: now,
        priceSnapshot: clone(order.pricingSnapshot),
      };
      return next;
    }
    const next: PhysicalMachineResource = {
      ...clone(template),
      id,
      skuId: fulfillment.skuId,
      name: quantity > 1 ? `${name}-${index + 1}` : name,
      site: order.site,
      status: 'running',
      assetNumber: `等待分配-${id}`,
      ip: { privateIp: '待分配' },
      connection: {
        available: false,
        notes: '连接信息将在基础设施接入后提供。',
      },
      createdAt: now,
      expiresAt,
      expiryState: 'active',
      purpose:
        typeof configuration.purpose === 'string'
          ? configuration.purpose
          : template.purpose,
      lastOperatedAt: now,
      priceSnapshot: clone(order.pricingSnapshot),
    };
    return next;
  });
  writeResources([...created, ...resources]);
  created.forEach((resource) =>
    operation(resource, '资源开通', '订单已完成，资源已加入当前账户。'));
  return created.map((resource) => resource.id);
}

export function resetResourceStore() {
  removeVersionedState(STORAGE_KEY);
  operationSequence = 100;
}
