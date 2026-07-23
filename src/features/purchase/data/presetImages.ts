import type { MarketplaceComputeType } from '../../marketplace';

export type PresetImage = Readonly<{
  id: string;
  name: string;
  category: '基础系统' | 'GPU 运行环境' | '开发环境' | '平台环境';
  operatingSystem: string;
  environmentSummary: string;
  compatibleComputeTypes: readonly MarketplaceComputeType[];
}>;

export const PRESET_IMAGES = [
  {
    id: 'preset-image-base-linux',
    name: '基础 Linux 运行镜像',
    category: '基础系统',
    operatingSystem: 'Linux LTS',
    environmentSummary: '基础命令行与通用运行组件',
    compatibleComputeTypes: ['cpu', 'gpu'],
  },
  {
    id: 'preset-image-gpu-runtime',
    name: 'GPU 计算运行镜像',
    category: 'GPU 运行环境',
    operatingSystem: 'Linux LTS',
    environmentSummary: '加速计算运行组件与通用开发工具',
    compatibleComputeTypes: ['gpu'],
  },
  {
    id: 'preset-image-development',
    name: '开发工具链镜像',
    category: '开发环境',
    operatingSystem: 'Linux LTS',
    environmentSummary: '编译、调试与常用开发工具',
    compatibleComputeTypes: ['cpu', 'gpu'],
  },
  {
    id: 'preset-image-platform',
    name: '平台基础环境镜像',
    category: '平台环境',
    operatingSystem: 'Linux LTS',
    environmentSummary: '平台通用运行环境与基础诊断工具',
    compatibleComputeTypes: ['cpu', 'gpu'],
  },
] as const satisfies readonly PresetImage[];

export function getCompatiblePresetImages(computeType: MarketplaceComputeType) {
  return PRESET_IMAGES.filter((image) =>
    (image.compatibleComputeTypes as readonly MarketplaceComputeType[]).includes(
      computeType,
    ),
  );
}

export function getPresetImageById(id: string) {
  return PRESET_IMAGES.find((image) => image.id === id);
}
