import { beforeEach, describe, expect, it } from 'vitest';
import {
  completeImageTask,
  createImageFromResource,
  deleteCustomImage,
  getCompatibleImages,
  importCustomImage,
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

  it('keeps only public and custom image categories', () => {
    expect(queryImages().every((image) => image.type === 'public' || image.type === 'custom')).toBe(true);
    expect(getCompatibleImages('cpu').some((image) => image.id === 'preset-image-gpu-runtime')).toBe(false);
    expect(getCompatibleImages('gpu').some((image) => image.id === 'preset-image-gpu-runtime')).toBe(true);
  });

  it('creates an import task from validated file metadata and completes it', async () => {
    const task = await importCustomImage({
      name: '项目运行环境',
      description: '团队运行依赖',
      operatingSystem: 'Linux LTS',
      version: '1.0',
      architecture: 'x86_64',
      compatibleComputeTypes: ['cpu'],
      bootMode: 'UEFI',
      file: { name: 'runtime.img', size: 1024 },
    });
    expect(task.status).toBe('importing');
    expect(task.source.kind).toBe('file');
    expect(completeImageTask(task.id).status).toBe('available');
  });

  it('creates a custom image from a cloud server and protects public images', async () => {
    const task = await createImageFromResource({
      resourceId: 'cs-east-001',
      name: '研发系统镜像',
      description: '',
      includeSystemConfiguration: true,
    });
    expect(task.status).toBe('creating');
    expect(task.source.kind).toBe('resource');
    await expect(deleteCustomImage('preset-image-base-linux')).rejects.toThrow('不可删除');
  });
});
