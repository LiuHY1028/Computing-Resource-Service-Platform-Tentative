import { beforeEach, describe, expect, it } from 'vitest';
import { getResourceById } from '../../resources';
import {
  getSoftwareById,
  getSoftwareCompatibility,
  getSoftwareForResource,
  getSoftwareInstallCount,
  resetSoftwareStore,
  submitSoftwareInstallation,
} from './softwareStore';

const storage = new Map<string, string>();

describe('softwareStore', () => {
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
    resetSoftwareStore();
  });

  it('blocks GPU-only software on a CPU resource', async () => {
    const software = getSoftwareById('software-gpu-toolkit');
    const resource = getResourceById('cloud-server', 'cs-east-001');
    expect(software && resource ? getSoftwareCompatibility(software, resource).compatible : true).toBe(false);
  });

  it('stores an installation as executing and exposes it to resource detail', async () => {
    const resource = getResourceById('cloud-server', 'cs-east-002');
    expect(resource).toBeDefined();
    const task = await submitSoftwareInstallation({
      softwareId: 'software-gpu-toolkit',
      version: '12.4',
      resource: resource!,
    });
    expect(task.status).toBe('executing');
    expect(getSoftwareForResource(resource!.id).some((item) => item.id === task.id)).toBe(true);
    expect(getSoftwareInstallCount('software-gpu-toolkit')).toBe(1);
  });

  it('creates software and resource scoped task identifiers', async () => {
    const resource = getResourceById('cloud-server', 'cs-east-002');
    expect(resource).toBeDefined();
    const gpuTask = await submitSoftwareInstallation({
      softwareId: 'software-gpu-toolkit',
      version: '12.4',
      resource: resource!,
    });
    const monitoringTask = await submitSoftwareInstallation({
      softwareId: 'software-monitoring-agent',
      version: '2.6.1',
      resource: resource!,
    });
    expect(gpuTask.id).not.toBe(monitoringTask.id);
    expect(gpuTask.id).toContain('software-gpu-toolkit-cs-east-002');
    expect(monitoringTask.id).toContain('software-monitoring-agent-cs-east-002');
  });
});
