import { recordOperation } from '../../operations';
import { APP_PATHS } from '../../../app/routes';
import {
  readVersionedState,
  removeVersionedState,
  writeVersionedState,
} from '../../platform/persistence';
import type {
  ImageComputeType,
  ImageQuery,
  PlatformImage,
} from '../types';

const STORAGE_KEY = 'computing-platform:images';
const VERSION = 1;

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
    resourceIds: ['cs-east-001', 'cs-west-003', 'cs-east-005', 'cs-south-007'],
  },
  {
    id: 'preset-image-gpu-runtime',
    name: 'GPU 计算运行镜像',
    type: 'platform',
    category: 'GPU 运行环境',
    operatingSystem: 'Linux LTS',
    version: '22.04',
    architecture: 'x86_64',
    environmentSummary: '加速计算运行组件与通用开发工具',
    compatibleComputeTypes: ['gpu'],
    sizeGb: 18,
    description: '面向 GPU 计算资源的平台运行环境。',
    status: 'available',
    createdAt: '2026-05-18T06:00:00.000Z',
    resourceIds: ['cs-east-002', 'cs-west-004', 'cs-south-006', 'cs-east-008'],
  },
  {
    id: 'preset-image-development',
    name: '开发工具链镜像',
    type: 'platform',
    category: '开发环境',
    operatingSystem: 'Linux LTS',
    version: '24.04',
    architecture: 'x86_64',
    environmentSummary: '编译、调试与常用开发工具',
    compatibleComputeTypes: ['cpu', 'gpu'],
    sizeGb: 12,
    description: '包含常用编译和诊断工具的平台环境。',
    status: 'available',
    createdAt: '2026-06-02T06:00:00.000Z',
    resourceIds: [],
  },
  {
    id: 'preset-image-platform',
    name: '平台基础环境镜像',
    type: 'platform',
    category: '平台环境',
    operatingSystem: 'Linux LTS',
    version: '1.0',
    architecture: 'x86_64',
    environmentSummary: '平台通用运行环境与基础诊断工具',
    compatibleComputeTypes: ['cpu', 'gpu'],
    sizeGb: 10,
    description: '用于平台基础服务部署的通用环境。',
    status: 'available',
    createdAt: '2026-06-08T06:00:00.000Z',
    resourceIds: [],
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
    sizeGb: 14,
    description: '团队维护的通用运行环境记录。',
    status: 'available',
    createdAt: '2026-07-12T06:00:00.000Z',
    resourceIds: [],
  },
];

function isImage(value: unknown): value is PlatformImage {
  if (!value || typeof value !== 'object') return false;
  const image = value as Partial<PlatformImage>;
  return (
    typeof image.id === 'string' &&
    typeof image.name === 'string' &&
    (image.type === 'public' || image.type === 'platform' || image.type === 'custom') &&
    typeof image.operatingSystem === 'string' &&
    Array.isArray(image.compatibleComputeTypes) &&
    Array.isArray(image.resourceIds)
  );
}

function readImages() {
  return readVersionedState(
    STORAGE_KEY,
    VERSION,
    (value): value is PlatformImage[] =>
      Array.isArray(value) && value.every(isImage),
    () => structuredClone(INITIAL_IMAGES) as PlatformImage[],
  );
}

function writeImages(images: readonly PlatformImage[]) {
  writeVersionedState(STORAGE_KEY, VERSION, images);
}

function replaceImage(imageId: string, update: (image: PlatformImage) => PlatformImage) {
  const images = readImages();
  const index = images.findIndex((image) => image.id === imageId);
  if (index < 0) throw new Error('未找到镜像。');
  const updated = update(images[index]);
  writeImages([...images.slice(0, index), updated, ...images.slice(index + 1)]);
  return updated;
}

export function queryImages(query: ImageQuery = {}) {
  const search = query.search?.trim().toLocaleLowerCase() ?? '';
  return readImages().filter((image) => {
    if (
      search &&
      ![
        image.id,
        image.name,
        image.operatingSystem,
        image.environmentSummary,
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(search)
    ) return false;
    if (query.type && query.type !== 'all' && image.type !== query.type) return false;
    if (query.operatingSystem && query.operatingSystem !== 'all' && image.operatingSystem !== query.operatingSystem) return false;
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

export async function createCustomImage(input: Readonly<{
  name: string;
  description: string;
  operatingSystem: string;
  version: string;
  architecture: 'x86_64' | 'arm64';
  compatibleComputeTypes: readonly ImageComputeType[];
  sourceFile?: Readonly<{ name: string; size: number }>;
}>) {
  const name = input.name.trim();
  if (!name) throw new Error('请输入镜像名称。');
  if (!input.compatibleComputeTypes.length) throw new Error('请选择适用计算类型。');
  const createdAt = new Date().toISOString();
  const image: PlatformImage = {
    id: `image-custom-${createdAt.replace(/\D/g, '').slice(0, 14)}`,
    name,
    type: 'custom',
    category: '自定义环境',
    operatingSystem: input.operatingSystem,
    version: input.version.trim() || '未标注',
    architecture: input.architecture,
    environmentSummary: input.description.trim() || '自定义运行环境',
    compatibleComputeTypes: input.compatibleComputeTypes,
    sizeGb: input.sourceFile
      ? Math.max(0.1, Number((input.sourceFile.size / 1024 / 1024 / 1024).toFixed(2)))
      : 0,
    description: input.description.trim(),
    status: input.sourceFile ? 'processing' : 'submitted',
    createdAt,
    resourceIds: [],
    sourceFile: input.sourceFile,
  };
  writeImages([image, ...readImages()]);
  recordOperation({
    module: 'image',
    action: input.sourceFile ? '导入镜像' : '创建自定义镜像记录',
    targetId: image.id,
    targetName: image.name,
    status: input.sourceFile ? 'executing' : 'waiting',
    message: input.sourceFile
      ? '镜像导入任务正在执行，当前仅记录文件元数据。'
      : '自定义镜像记录已创建。',
    targetPath: APP_PATHS.images,
  });
  return image;
}

export async function updateCustomImage(
  imageId: string,
  input: Readonly<{ name: string; description: string }>,
) {
  const updated = replaceImage(imageId, (image) => {
    if (image.type !== 'custom') throw new Error('公共和平台镜像不能修改。');
    if (!input.name.trim()) throw new Error('请输入镜像名称。');
    return { ...image, name: input.name.trim(), description: input.description.trim() };
  });
  recordOperation({
    module: 'image',
    action: '修改镜像信息',
    targetId: updated.id,
    targetName: updated.name,
    status: 'completed',
    message: '镜像名称和说明已更新。',
    targetPath: APP_PATHS.images,
  });
  return updated;
}

export async function deleteCustomImage(imageId: string) {
  const images = readImages();
  const target = images.find((image) => image.id === imageId);
  if (!target) throw new Error('未找到镜像。');
  if (target.type !== 'custom') throw new Error('公共和平台镜像不可删除。');
  if (target.resourceIds.length) throw new Error('有关联资源时不能删除镜像。');
  writeImages(images.filter((image) => image.id !== imageId));
  recordOperation({
    module: 'image',
    action: '删除自定义镜像',
    targetId: target.id,
    targetName: target.name,
    status: 'completed',
    message: '自定义镜像记录已删除。',
  });
}

export function resetImageStore() {
  removeVersionedState(STORAGE_KEY);
}
