import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getOperationRecords,
  getResourceActionAvailability,
  getResourceById,
  getResourceFilterOptions,
  queryResources,
  resetResourceRepository,
  ResourceActionError,
  ResourceRepositoryError,
  submitResourceAction,
} from './resourceRepository';
import type { ResourceQuery } from '../types';

const cloudQuery: ResourceQuery = {
  resourceType: 'cloud-server',
  search: '',
  site: 'all',
  status: 'all',
  computeType: 'all',
  acceleratorModel: 'all',
  expiryState: 'all',
  scope: 'all',
  image: 'all',
  operatingSystem: 'all',
};

beforeEach(resetResourceRepository);
afterEach(resetResourceRepository);

describe('resourceRepository', () => {
  it('returns distinct typed catalogs with complete filter options', async () => {
    const cloud = await queryResources(cloudQuery, { delayMs: 0 });
    const physical = await queryResources(
      { ...cloudQuery, resourceType: 'physical-machine' },
      { delayMs: 0 },
    );

    expect(cloud.catalogTotal).toBe(8);
    expect(physical.catalogTotal).toBe(8);
    expect(cloud.items.every((item) => item.resourceType === 'cloud-server')).toBe(
      true,
    );
    expect(
      physical.items.every((item) => item.resourceType === 'physical-machine'),
    ).toBe(true);
    expect(getResourceFilterOptions('cloud-server').images.length).toBeGreaterThan(
      0,
    );
    expect(
      getResourceFilterOptions('physical-machine').operatingSystems,
    ).toContain('Linux 服务器操作系统 2026.06');
  });

  it('combines search, site, compute, accelerator, expiry and scope filters', async () => {
    const result = await queryResources(
      {
        ...cloudQuery,
        search: '训练',
        site: '东部算力中心',
        computeType: 'gpu',
        acceleratorModel: '高性能加速卡 80GB',
        expiryState: 'expiring',
        scope: '视觉算法平台',
      },
      { delayMs: 0 },
    );

    expect(result.items.map((item) => item.id)).toEqual(['cs-east-002']);
  });

  it('supports loading boundaries, empty data, errors and cancellation', async () => {
    await expect(
      queryResources(cloudQuery, {
        delayMs: 0,
        simulateError: true,
      }),
    ).rejects.toBeInstanceOf(ResourceRepositoryError);
    await expect(
      queryResources(cloudQuery, { delayMs: 0, simulateEmpty: true }),
    ).resolves.toMatchObject({ items: [], catalogTotal: 0 });

    const controller = new AbortController();
    const pending = queryResources(cloudQuery, {
      delayMs: 100,
      signal: controller.signal,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('keeps cloud and physical power capabilities distinct', async () => {
    const cloud = await getResourceById('cloud-server', 'cs-west-003', {
      delayMs: 0,
    });
    const physical = await getResourceById('physical-machine', 'pm-west-003', {
      delayMs: 0,
    });

    expect(cloud && getResourceActionAvailability(cloud, 'start')).toEqual({
      enabled: true,
    });
    expect(
      physical && getResourceActionAvailability(physical, 'start'),
    ).toMatchObject({ enabled: false });
    expect(
      cloud && getResourceActionAvailability(cloud, 'release'),
    ).toMatchObject({ enabled: false });
  });

  it('updates a resource and its operation records through one data source', async () => {
    const action = await submitResourceAction(
      {
        resourceType: 'cloud-server',
        resourceId: 'cs-west-003',
        action: 'start',
      },
      { delayMs: 0 },
    );
    const detail = await getResourceById('cloud-server', 'cs-west-003', {
      delayMs: 0,
    });
    const list = await queryResources(
      { ...cloudQuery, search: 'cs-west-003' },
      { delayMs: 0 },
    );
    const records = await getOperationRecords(
      'cloud-server',
      'cs-west-003',
      { delayMs: 0 },
    );

    expect(action.resource.status).toBe('running');
    expect(detail?.status).toBe('running');
    expect(list.items[0]?.status).toBe('running');
    expect(records[0]?.action).toBe('启动');
    expect(records[0]?.status).toBe('submitted');
  });

  it('validates rename and leaves data unchanged when submission fails', async () => {
    await expect(
      submitResourceAction(
        {
          resourceType: 'cloud-server',
          resourceId: 'cs-east-001',
          action: 'rename',
          nextName: '研发计算节点-01',
        },
        { delayMs: 0 },
      ),
    ).rejects.toBeInstanceOf(ResourceActionError);
    await expect(
      submitResourceAction(
        {
          resourceType: 'cloud-server',
          resourceId: 'cs-east-001',
          action: 'rename',
          nextName: '新名称',
        },
        { delayMs: 0, simulateError: true },
      ),
    ).rejects.toBeInstanceOf(ResourceActionError);
    expect(
      (
        await getResourceById('cloud-server', 'cs-east-001', { delayMs: 0 })
      )?.name,
    ).toBe('研发计算节点-01');
  });
});
