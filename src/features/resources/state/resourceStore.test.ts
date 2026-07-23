import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getOperationRecords,
  getResourceActionAvailability,
  getResourceById,
  getResourceFilterOptions,
  queryResources,
  resetResourceStore,
  ResourceActionError,
  submitResourceAction,
} from './resourceStore';
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

beforeEach(resetResourceStore);
afterEach(resetResourceStore);

describe('resourceStore', () => {
  it('returns distinct typed catalogs with complete filter options', () => {
    const cloud = queryResources(cloudQuery);
    const physical = queryResources(
      { ...cloudQuery, resourceType: 'physical-machine' },
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

  it('combines search, site, compute, accelerator, expiry and scope filters', () => {
    const result = queryResources(
      {
        ...cloudQuery,
        search: '训练',
        site: '东部算力中心',
        computeType: 'gpu',
        acceleratorModel: '高性能加速卡 80GB',
        expiryState: 'expiring',
        scope: '视觉算法平台',
      },
    );

    expect(result.items.map((item) => item.id)).toEqual(['cs-east-002']);
  });

  it('keeps cloud and physical power capabilities distinct', () => {
    const cloud = getResourceById('cloud-server', 'cs-west-003');
    const physical = getResourceById('physical-machine', 'pm-west-003');

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
    );
    const detail = getResourceById('cloud-server', 'cs-west-003');
    const list = queryResources(
      { ...cloudQuery, search: 'cs-west-003' },
    );
    const records = getOperationRecords('cloud-server', 'cs-west-003');

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
      ),
    ).rejects.toBeInstanceOf(ResourceActionError);
    expect(
      getResourceById('cloud-server', 'cs-east-001')?.name,
    ).toBe('研发计算节点-01');
  });
});
