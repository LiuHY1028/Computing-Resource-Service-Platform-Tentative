import { beforeEach, describe, expect, it } from 'vitest';
import {
  createCustomImage,
  deleteCustomImage,
  getCompatibleImages,
  queryImages,
  resetImageStore,
} from './imageStore';

const storage = new Map<string, string>();

describe('imageStore', () => {
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
    resetImageStore();
  });

  it('uses declared compute compatibility', () => {
    expect(getCompatibleImages('cpu').some((image) => image.id === 'preset-image-gpu-runtime')).toBe(false);
    expect(getCompatibleImages('gpu').some((image) => image.id === 'preset-image-gpu-runtime')).toBe(true);
  });

  it('stores import metadata as a processing task', async () => {
    const image = await createCustomImage({
      name: '项目运行环境',
      description: '团队运行依赖',
      operatingSystem: 'Linux LTS',
      version: '1.0',
      architecture: 'x86_64',
      compatibleComputeTypes: ['cpu'],
      sourceFile: { name: 'runtime.img', size: 1024 },
    });
    expect(image.status).toBe('processing');
    expect(image.sourceFile?.name).toBe('runtime.img');
    expect((await queryImages({ type: 'custom' })).some((item) => item.id === image.id)).toBe(true);
  });

  it('protects platform images from deletion', async () => {
    await expect(deleteCustomImage('preset-image-platform')).rejects.toThrow(
      '不可删除',
    );
  });
});
