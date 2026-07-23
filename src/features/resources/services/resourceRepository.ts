import { createInitialResourceCatalog } from '../data/resourceCatalog';
import type {
  OperationRecord,
  Resource,
  ResourceAction,
  ResourceActionAvailability,
  ResourceActionRequest,
  ResourceActionResult,
  ResourceFilterOptions,
  ResourceQuery,
  ResourceQueryResult,
  ResourceRepositoryOptions,
  ResourceStatus,
  ResourceType,
} from '../types';

const DEFAULT_READ_DELAY_MS = 160;
const DEFAULT_ACTION_DELAY_MS = 360;

let resources = createInitialResourceCatalog();
let operationSequence = 100;

export class ResourceRepositoryError extends Error {
  constructor(message = '资源数据读取失败，请稍后重试。') {
    super(message);
    this.name = 'ResourceRepositoryError';
  }
}

export class ResourceActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceActionError';
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createAbortError() {
  return new DOMException('Resource request was aborted.', 'AbortError');
}

async function wait(delayMs: number, signal?: AbortSignal) {
  if (signal?.aborted) throw createAbortError();
  if (delayMs <= 0) {
    await Promise.resolve();
    if (signal?.aborted) throw createAbortError();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeoutId);
      reject(createAbortError());
    };
    const timeoutId = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function unique(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) =>
    left.localeCompare(right, 'zh-CN'),
  );
}

function resourceSearchText(resource: Resource) {
  return [
    resource.id,
    resource.name,
    resource.site,
    resource.cpu,
    resource.accelerator?.model ?? '',
    resource.project,
    resource.purpose,
    resource.owner,
    resource.resourceType === 'cloud-server'
      ? resource.image
      : resource.operatingSystem,
  ]
    .join(' ')
    .toLocaleLowerCase();
}

function matchesQuery(resource: Resource, query: ResourceQuery) {
  const search = query.search.trim().toLocaleLowerCase();
  if (search && !resourceSearchText(resource).includes(search)) return false;
  if (query.site !== 'all' && resource.site !== query.site) return false;
  if (query.status !== 'all' && resource.status !== query.status) return false;
  if (
    query.computeType !== 'all' &&
    resource.computeType !== query.computeType
  ) {
    return false;
  }
  if (
    query.acceleratorModel !== 'all' &&
    resource.accelerator?.model !== query.acceleratorModel
  ) {
    return false;
  }
  if (
    query.expiryState !== 'all' &&
    resource.expiryState !== query.expiryState
  ) {
    return false;
  }
  if (
    query.scope !== 'all' &&
    resource.project !== query.scope &&
    resource.purpose !== query.scope
  ) {
    return false;
  }
  if (
    query.image !== 'all' &&
    (resource.resourceType !== 'cloud-server' || resource.image !== query.image)
  ) {
    return false;
  }
  if (
    query.operatingSystem !== 'all' &&
    (resource.resourceType !== 'physical-machine' ||
      resource.operatingSystem !== query.operatingSystem)
  ) {
    return false;
  }
  return true;
}

export async function queryResources(
  query: ResourceQuery,
  options: ResourceRepositoryOptions = {},
): Promise<ResourceQueryResult> {
  await wait(options.delayMs ?? DEFAULT_READ_DELAY_MS, options.signal);
  if (options.simulateError) throw new ResourceRepositoryError();

  const typeResources = options.simulateEmpty
    ? []
    : resources.filter(
        (resource) => resource.resourceType === query.resourceType,
      );
  const items = typeResources.filter((resource) => matchesQuery(resource, query));
  return {
    items: clone(items),
    total: items.length,
    catalogTotal: typeResources.length,
  };
}

export async function getResourceById(
  resourceType: ResourceType,
  resourceId: string,
  options: ResourceRepositoryOptions = {},
): Promise<Resource | undefined> {
  await wait(options.delayMs ?? DEFAULT_READ_DELAY_MS, options.signal);
  if (options.simulateError) throw new ResourceRepositoryError();
  const resource = resources.find(
    (candidate) =>
      candidate.resourceType === resourceType && candidate.id === resourceId,
  );
  return resource ? clone(resource) : undefined;
}

export async function getOperationRecords(
  resourceType: ResourceType,
  resourceId: string,
  options: ResourceRepositoryOptions = {},
): Promise<readonly OperationRecord[]> {
  const resource = await getResourceById(resourceType, resourceId, options);
  return resource ? clone(resource.operationRecords) : [];
}

export function getResourceFilterOptions(
  resourceType: ResourceType,
): ResourceFilterOptions {
  const items = resources.filter(
    (resource) => resource.resourceType === resourceType,
  );
  return {
    sites: unique(items.map((resource) => resource.site)),
    statuses: [...new Set(items.map((resource) => resource.status))],
    acceleratorModels: unique(
      items.flatMap((resource) =>
        resource.accelerator ? [resource.accelerator.model] : [],
      ),
    ),
    scopes: unique(
      items.flatMap((resource) => [resource.project, resource.purpose]),
    ),
    images: unique(
      items.flatMap((resource) =>
        resource.resourceType === 'cloud-server' ? [resource.image] : [],
      ),
    ),
    operatingSystems: unique(
      items.flatMap((resource) =>
        resource.resourceType === 'physical-machine'
          ? [resource.operatingSystem]
          : [],
      ),
    ),
  };
}

const POWER_ACTIONS: readonly ResourceAction[] = ['start', 'stop', 'restart'];

export function getResourceActionAvailability(
  resource: Resource,
  action: ResourceAction,
): ResourceActionAvailability {
  if (action === 'release') {
    return {
      enabled: false,
      reason: '资源释放能力当前未开放。',
    };
  }
  if (resource.status === 'preparing') {
    return {
      enabled: false,
      reason: '资源正在准备中，暂时无法提交该操作。',
    };
  }
  if (resource.status === 'operating') {
    return {
      enabled: false,
      reason: '已有操作正在处理中，请稍后再试。',
    };
  }
  if (resource.status === 'expired') {
    return {
      enabled: false,
      reason: '资源已到期，暂时无法提交该操作。',
    };
  }
  if (
    resource.resourceType === 'physical-machine' &&
    POWER_ACTIONS.includes(action)
  ) {
    return {
      enabled: false,
      reason: '物理机电源操作当前未开放。',
    };
  }
  if (action === 'rename') {
    return { enabled: true };
  }
  if (resource.status === 'abnormal') {
    return {
      enabled: false,
      reason: '资源状态异常，请先核对运行情况。',
    };
  }
  if (action === 'start') {
    return resource.status === 'stopped'
      ? { enabled: true }
      : { enabled: false, reason: '仅已停止的资源可启动。' };
  }
  if (action === 'stop' || action === 'restart') {
    return resource.status === 'running'
      ? { enabled: true }
      : { enabled: false, reason: '仅运行中的资源可执行该操作。' };
  }
  return { enabled: false, reason: '当前操作不可用。' };
}

function nextStatus(
  currentStatus: ResourceStatus,
  action: ResourceAction,
): ResourceStatus {
  if (action === 'start') return 'running';
  if (action === 'stop') return 'stopped';
  if (action === 'restart') return 'running';
  return currentStatus;
}

function actionLabel(action: ResourceAction) {
  if (action === 'start') return '启动';
  if (action === 'stop') return '停止';
  if (action === 'restart') return '重启';
  if (action === 'rename') return '修改名称';
  return '释放资源';
}

export async function submitResourceAction(
  request: ResourceActionRequest,
  options: ResourceRepositoryOptions = {},
): Promise<ResourceActionResult> {
  await wait(options.delayMs ?? DEFAULT_ACTION_DELAY_MS, options.signal);
  if (options.simulateError) {
    throw new ResourceActionError('操作请求提交失败，请稍后重试。');
  }

  const index = resources.findIndex(
    (resource) =>
      resource.resourceType === request.resourceType &&
      resource.id === request.resourceId,
  );
  const current = resources[index];
  if (!current) throw new ResourceActionError('未找到目标资源。');

  const availability = getResourceActionAvailability(current, request.action);
  if (!availability.enabled) {
    throw new ResourceActionError(
      availability.reason ?? '当前操作不可用。',
    );
  }

  if (request.action === 'rename') {
    const nextName = request.nextName?.trim() ?? '';
    if (!nextName) throw new ResourceActionError('请输入资源名称。');
    if (nextName.length > 48) {
      throw new ResourceActionError('资源名称不能超过 48 个字符。');
    }
    if (nextName === current.name) {
      throw new ResourceActionError('请输入与当前名称不同的资源名称。');
    }
  }

  operationSequence += 1;
  const record: OperationRecord = {
    id: `operation-local-${operationSequence}`,
    action: actionLabel(request.action),
    actor: '当前用户',
    createdAt: new Date().toISOString(),
    status: 'submitted',
    message: '操作请求已提交，状态更新中。',
  };
  const updated: Resource = {
    ...current,
    name:
      request.action === 'rename'
        ? request.nextName?.trim() ?? current.name
        : current.name,
    status: nextStatus(current.status, request.action),
    lastOperatedAt: record.createdAt,
    operationRecords: [record, ...current.operationRecords],
  };
  resources = [
    ...resources.slice(0, index),
    updated,
    ...resources.slice(index + 1),
  ];
  return { resource: clone(updated), record: clone(record) };
}

export function resetResourceRepository() {
  resources = createInitialResourceCatalog();
  operationSequence = 100;
}
