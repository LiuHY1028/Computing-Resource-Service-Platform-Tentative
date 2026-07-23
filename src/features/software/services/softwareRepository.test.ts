import { beforeEach, describe, expect, it } from 'vitest';
import { getResourceById } from '../../resources';
import {
  getSoftwareById,
  getSoftwareCompatibility,
  getSoftwareForResource,
  resetSoftwareRepository,
  submitSoftwareInstallation,
} from './softwareRepository';

const storage = new Map<string, string>();

describe('softwareRepository', () => {
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
    resetSoftwareRepository();
  });

  it('blocks GPU-only software on a CPU resource', async () => {
    const software = getSoftwareById('software-gpu-toolkit');
    const resource = await getResourceById('cloud-server', 'cs-east-001', {
      delayMs: 0,
    });
    expect(software && resource ? getSoftwareCompatibility(software, resource).compatible : true).toBe(false);
  });

  it('stores an installation as processing and exposes it to resource detail', async () => {
    const resource = await getResourceById('cloud-server', 'cs-east-002', {
      delayMs: 0,
    });
    expect(resource).toBeDefined();
    const task = await submitSoftwareInstallation({
      softwareId: 'software-gpu-toolkit',
      version: '12.4',
      resource: resource!,
    });
    expect(task.status).toBe('processing');
    expect(getSoftwareForResource(resource!.id).some((item) => item.id === task.id)).toBe(true);
  });
});
