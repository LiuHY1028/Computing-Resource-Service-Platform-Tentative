import type { MarketplaceComputeType } from '../../marketplace';
import { findImage, getCompatibleImages } from '../../images';

export type PresetImage = Readonly<{
  id: string;
  name: string;
  category: '基础系统' | 'GPU 运行环境' | '基础运行环境' | '自定义环境';
  operatingSystem: string;
  environmentSummary: string;
  compatibleComputeTypes: readonly MarketplaceComputeType[];
}>;

export function getCompatiblePresetImages(computeType: MarketplaceComputeType) {
  return getCompatibleImages(computeType).map((image) => ({
    id: image.id,
    name: image.name,
    category: image.category,
    operatingSystem: image.operatingSystem,
    environmentSummary: image.environmentSummary,
    compatibleComputeTypes: image.compatibleComputeTypes,
  }));
}

export function getPresetImageById(id: string) {
  const image = findImage(id);
  return image
    ? {
        id: image.id,
        name: image.name,
        category: image.category,
        operatingSystem: image.operatingSystem,
        environmentSummary: image.environmentSummary,
        compatibleComputeTypes: image.compatibleComputeTypes,
      }
    : undefined;
}
