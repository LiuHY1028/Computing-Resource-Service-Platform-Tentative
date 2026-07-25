import { APP_PATHS } from '../../../app/routes';
import { listResources } from '../../resources/state/resourceStore';
import { recordOperation } from '../../operations';
import {
  readMigratedVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import type {
  ImageComputeType,
  ImageQuery,
  PlatformImage,
} from '../types';

const STORAGE_KEY = 'computing-platform:images';
const VERSION = 2;
const MAX_IMPORT_SIZE = 30 * 1024 * 1024 * 1024;
const IMPORT_EXTENSIONS = ['.qcow2', '.raw', '.img', '.vhd', '.vhdx'] as const;

const INITIAL_IMAGES: readonly PlatformImage[] = [
  {
    id: 'preset-image-base-linux',
    name: '基础 Linux 运行镜像',
    type: 'public',
    category: '基础系统',
    operatingSystem: 'Linux LTS',
    version: '24.04',
    architecture: 'x86_64',
    environmentSummary: '基础命令行与通用运行组件',
    compatibleComputeTypes: ['cpu', 'gpu'],
    sizeGb: 8,
    description: '适用于通用计算工作负载的基础系统环境。',
    status: 'available',
    createdAt: '2026-05-12T06:00:00.000Z',
    updatedAt: '2026-07-18T06:00:00.000Z',
    source: { kind: 'public' },
  },
  {
    id: 'preset-image-gpu-runtime',
    name: 'GPU 计算运行镜像',
    type: 'public',
    category: 'GPU 运行环境',
    operatingSystem: 'Linux LTS',
    version: '22.04',
    architecture: 'x86_64',
    environmentSummary: '加速计算运行组件与通用开发工具',
    compatibleComputeTypes: ['gpu'],
    sizeGb: 18,
    description: '面向 GPU 计算资源的基础运行环境。',
    status: 'available',
    createdAt: '2026-05-18T06:00:00.000Z',
    updatedAt: '2026-07-20T06:00:00.000Z',
    source: { kind: 'public' },
  },
  {
    id: 'preset-image-development',
    name: '开发工具链镜像',
    type: 'public',
    category: '基础运行环境',
    operatingSystem: 'Linux LTS',
    version: '24.04',
    architecture: 'x86_64',
    environmentSummary: '编译、调试与常用开发工具',
    compatibleComputeTypes: ['cpu', 'gpu'],
    sizeGb: 12,
    description: '包含常用编译和诊断工具的运行环境。',
    status: 'available',
    createdAt: '2026-06-02T06:00:00.000Z',
    updatedAt: '2026-07-22T06:00:00.000Z',
    source: { kind: 'public' },
  },
  {
    id: 'image-custom-team-runtime',
    name: '团队运行环境',
    type: 'custom',
    category: '自定义环境',
    operatingSystem: 'Linux LTS',
    version: '1.2',
    architecture: 'x86_64',
    environmentSummary: '团队通用依赖与诊断组件',
    compatibleComputeTypes: ['cpu'],
    sizeGb: 30,
    description: '从研发计算节点制作的团队运行环境。',
    status: 'available',
    createdAt: '2026-07-12T06:00:00.000Z',
    updatedAt: '2026-07-12T06:12:00.000Z',
    source: {
      kind: 'resource',
      resourceId: 'cs-east-001',
      systemDiskId: 'disk-system-1',
      includeSystemConfiguration: true,
    },
  },
];

function isImage(value: unknown): value is PlatformImage {
  if (!value || typeof value !== 'object') return false;
  const image = value as Partial<PlatformImage>;
  return (
    typeof image.id === 'string' &&
    typeof image.name === 'string' &&
    (image.type === 'public' || image.type === 'custom') &&
    ['creating', 'importing', 'available', 'failed'].includes(image.status ?? '') &&
    typeof image.operatingSystem === 'string' &&
    Array.isArray(image.compatibleComputeTypes) &&
    typeof image.updatedAt === 'string' &&
    typeof image.source === 'object'
  );
}

function migrateImages(value: unknown, previousVersion: number) {
  if (previousVersion !== 1 || !Array.isArray(value)) return undefined;
  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const image = candidate as Record<string, unknown>;
    const type = image.type === 'custom' ? 'custom' : 'public';
    if (type === 'custom' && !image.sourceFile && image.status !== 'available') return [];
    const source =
      type === 'public'
        ? { kind: 'public' as const }
        : image.sourceFile && typeof image.sourceFile === 'object'
          ? {
              kind: 'file' as const,
              fileName: String((image.sourceFile as { name?: unknown }).name ?? ''),
              fileSize: Number((image.sourceFile as { size?: unknown }).size ?? 0),
              bootMode: 'UEFI' as const,
            }
          : {
              kind: 'resource' as const,
              resourceId: 'cs-east-001',
              systemDiskId: 'disk-system-1',
              includeSystemConfiguration: true,
            };
    return [{
      ...image,
      type,
      status:
        image.status === 'failed'
          ? 'failed'
          : image.status === 'available'
            ? 'available'
            : source.kind === 'file'
              ? 'importing'
              : 'creating',
      source,
      updatedAt: String(image.createdAt ?? new Date().toISOString()),
      resourceIds: undefined,
      sourceFile: undefined,
    } as unknown as PlatformImage];
  });
}

function readImages() {
  return readMigratedVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is PlatformImage[] =>
      Array.isArray(value) && value.every(isImage),
    migrateImages,
    () => structuredClone(INITIAL_IMAGES) as PlatformImage[],
  );
}

function writeImages(images: readonly PlatformImage[]) {
  writeVersionedState(STORAGE_KEY, VERSION, images);
}

function replaceImage(
  imageId: string,
  update: (image: PlatformImage) => PlatformImage,
) {
  const images = readImages();
  const index = images.findIndex((image) => image.id === imageId);
  if (index < 0) throw new Error('未找到镜像。');
  const updated = update(images[index]);
  writeImages([...images.slice(0, index), updated, ...images.slice(index + 1)]);
  return updated;
}

function uniqueName(name: string, editingId?: string) {
  const normalized = name.trim().toLocaleLowerCase();
  return !readImages().some(
    (image) =>
      image.id !== editingId &&
      image.name.trim().toLocaleLowerCase() === normalized,
  );
}

export function queryImages(query: ImageQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readImages().filter((image) => {
    if (
      search &&
      ![image.id, image.name, image.operatingSystem, image.environmentSummary]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search)
    ) return false;
    if (query.type && query.type !== 'all' && image.type !== query.type) return false;
    if (query.operatingSystem && query.operatingSystem !== 'all' && image.operatingSystem !== query.operatingSystem) return false;
    if (query.architecture && query.architecture !== 'all' && image.architecture !== query.architecture) return false;
    if (query.computeType && query.computeType !== 'all' && !image.compatibleComputeTypes.includes(query.computeType)) return false;
    if (query.status && query.status !== 'all' && image.status !== query.status) return false;
    return true;
  });
}

export function findImage(imageId: string) {
  return readImages().find((image) => image.id === imageId);
}

export function getCompatibleImages(computeType: ImageComputeType) {
  return readImages().filter(
    (image) =>
      image.status === 'available' &&
      image.compatibleComputeTypes.includes(computeType),
  );
}

export function getImageResourceIds(imageId: string) {
  return listResources('cloud-server')
    .filter(
      (resource) =>
        resource.resourceType === 'cloud-server' && resource.imageId === imageId,
    )
    .map((resource) => resource.id);
}

function nextImageId(createdAt: string) {
  const base = `image-custom-${createdAt.replace(/\D/g, '').slice(0, 14)}`;
  const used = new Set(readImages().map((image) => image.id));
  let sequence = 1;
  let id = base;
  while (used.has(id)) {
    sequence += 1;
    id = `${base}-${sequence}`;
  }
  return id;
}

export async function createImageFromResource(input: Readonly<{
  resourceId: string;
  name: string;
  description: string;
  includeSystemConfiguration: boolean;
}>) {
  const resource = listResources('cloud-server').find(
    (candidate) => candidate.id === input.resourceId,
  );
  if (!resource || resource.resourceType !== 'cloud-server') {
    throw new Error('请选择有效的云服务器。');
  }
  if (!input.name.trim()) throw new Error('请输入镜像名称。');
  if (!uniqueName(input.name)) throw new Error('镜像名称已存在。');
  const systemDisk = resource.dataDisks.find((disk) => disk.role === 'system');
  if (!systemDisk) throw new Error('来源云服务器缺少可识别的系统盘。');
  const now = new Date().toISOString();
  const image: PlatformImage = {
    id: nextImageId(now),
    name: input.name.trim(),
    type: 'custom',
    category: '从资源制作',
    operatingSystem: resource.operatingSystem,
    version: resource.operatingSystem.replace(/^.*?(\d)/, '$1'),
    architecture: 'x86_64',
    environmentSummary: input.description.trim() || `来源于 ${resource.name}`,
    compatibleComputeTypes: [resource.computeType],
    sizeGb: resource.systemDiskGb,
    description: input.description.trim(),
    status: 'creating',
    createdAt: now,
    updatedAt: now,
    source: {
      kind: 'resource',
      resourceId: resource.id,
      systemDiskId: systemDisk.id,
      includeSystemConfiguration: input.includeSystemConfiguration,
    },
  };
  writeImages([image, ...readImages()]);
  recordOperation({
    module: 'image',
    action: '制作自定义镜像',
    targetId: image.id,
    targetName: image.name,
    status: 'executing',
    message: `已从 ${resource.name} 创建镜像制作任务。`,
    targetPath: `${APP_PATHS.images}?type=custom`,
    correlationId: image.id,
  });
  recordOperation({
    module: 'resource',
    action: '制作自定义镜像',
    targetId: resource.id,
    targetName: resource.name,
    status: 'executing',
    message: `正在制作自定义镜像“${image.name}”。`,
    targetPath: `${APP_PATHS.images}?type=custom&q=${encodeURIComponent(image.id)}`,
    correlationId: image.id,
  });
  return image;
}

export async function importCustomImage(input: Readonly<{
  name: string;
  description: string;
  operatingSystem: string;
  version: string;
  architecture: 'x86_64' | 'arm64';
  compatibleComputeTypes: readonly ImageComputeType[];
  bootMode: 'BIOS' | 'UEFI';
  file: Readonly<{ name: string; size: number }>;
}>) {
  if (!input.name.trim()) throw new Error('请输入镜像名称。');
  if (!uniqueName(input.name)) throw new Error('镜像名称已存在。');
  const lowerName = input.file.name.toLocaleLowerCase();
  if (!IMPORT_EXTENSIONS.some((extension) => lowerName.endsWith(extension))) {
    throw new Error('镜像文件格式不受支持。');
  }
  if (!Number.isFinite(input.file.size) || input.file.size <= 0) {
    throw new Error('镜像文件不能为空。');
  }
  if (input.file.size > MAX_IMPORT_SIZE) {
    throw new Error('镜像文件不能超过 30 GiB。');
  }
  const now = new Date().toISOString();
  const image: PlatformImage = {
    id: nextImageId(now),
    name: input.name.trim(),
    type: 'custom',
    category: '文件导入',
    operatingSystem: input.operatingSystem,
    version: input.version.trim() || '未标注',
    architecture: input.architecture,
    environmentSummary: input.description.trim() || '导入的自定义运行环境',
    compatibleComputeTypes: input.compatibleComputeTypes,
    sizeGb: Number((input.file.size / 1024 / 1024 / 1024).toFixed(2)),
    description: input.description.trim(),
    status: 'importing',
    createdAt: now,
    updatedAt: now,
    source: {
      kind: 'file',
      fileName: input.file.name,
      fileSize: input.file.size,
      bootMode: input.bootMode,
    },
  };
  writeImages([image, ...readImages()]);
  recordOperation({
    module: 'image',
    action: '导入镜像文件',
    targetId: image.id,
    targetName: image.name,
    status: 'executing',
    message: '已读取镜像文件元数据并创建导入任务。',
    targetPath: `${APP_PATHS.images}?type=custom`,
    correlationId: image.id,
  });
  return image;
}

export function completeImageTask(imageId: string, failureReason?: string) {
  const updated = replaceImage(imageId, (image) => {
    if (image.status !== 'creating' && image.status !== 'importing') {
      throw new Error('当前镜像没有进行中的任务。');
    }
    const now = new Date().toISOString();
    return {
      ...image,
      status: failureReason ? 'failed' : 'available',
      failureReason: failureReason?.trim() || undefined,
      updatedAt: now,
    };
  });
  recordOperation({
    module: 'image',
    action: updated.status === 'available' ? '镜像任务完成' : '镜像任务失败',
    targetId: updated.id,
    targetName: updated.name,
    status: updated.status === 'available' ? 'completed' : 'failed',
    message:
      updated.status === 'available'
        ? '自定义镜像已可用于创建云服务器。'
        : updated.failureReason ?? '镜像任务未完成。',
    targetPath: `${APP_PATHS.images}?type=custom`,
    correlationId: updated.id,
  });
  if (updated.source.kind === 'resource') {
    const source = updated.source;
    const sourceResource = listResources('cloud-server').find(
      (resource) => resource.id === source.resourceId,
    );
    recordOperation({
      module: 'resource',
      action: updated.status === 'available' ? '制作镜像完成' : '制作镜像失败',
      targetId: source.resourceId,
      targetName: sourceResource?.name ?? source.resourceId,
      status: updated.status === 'available' ? 'completed' : 'failed',
      message:
        updated.status === 'available'
          ? `自定义镜像“${updated.name}”已可用。`
          : updated.failureReason ?? '镜像制作未完成。',
      targetPath: `${APP_PATHS.images}?type=custom&q=${encodeURIComponent(updated.id)}`,
      correlationId: updated.id,
    });
  }
  return updated;
}

export async function updateCustomImage(
  imageId: string,
  input: Readonly<{ name: string; description: string }>,
) {
  const updated = replaceImage(imageId, (image) => {
    if (image.type !== 'custom') throw new Error('公共镜像不能修改。');
    if (!input.name.trim()) throw new Error('请输入镜像名称。');
    if (!uniqueName(input.name, image.id)) throw new Error('镜像名称已存在。');
    return {
      ...image,
      name: input.name.trim(),
      description: input.description.trim(),
      updatedAt: new Date().toISOString(),
    };
  });
  recordOperation({
    module: 'image',
    action: '修改镜像信息',
    targetId: updated.id,
    targetName: updated.name,
    status: 'completed',
    message: '镜像名称和说明已更新。',
    targetPath: `${APP_PATHS.images}?type=custom`,
  });
  return updated;
}

export async function deleteCustomImage(imageId: string) {
  const images = readImages();
  const target = images.find((image) => image.id === imageId);
  if (!target) throw new Error('未找到镜像。');
  if (target.type !== 'custom') throw new Error('公共镜像不可删除。');
  if (target.status === 'creating' || target.status === 'importing') {
    throw new Error('制作中或导入中的镜像不可删除。');
  }
  if (getImageResourceIds(target.id).length) {
    throw new Error('镜像已被资源使用，不能删除。');
  }
  writeImages(images.filter((image) => image.id !== imageId));
  recordOperation({
    module: 'image',
    action: '删除自定义镜像',
    targetId: target.id,
    targetName: target.name,
    status: 'completed',
    message: '自定义镜像已删除。',
  });
}

export function resetImageStore() {
  removeVersionedState(STORAGE_KEY);
}

export { IMPORT_EXTENSIONS, MAX_IMPORT_SIZE };
