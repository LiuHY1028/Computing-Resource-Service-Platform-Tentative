import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getOperationRecords,
  getResourceActionAvailability,
  getResourceById,
  getRenewalAvailability,
  getResourceFilterOptions,
  queryResources,
  resetResourceStore,
  ResourceActionError,
  submitResourceAction,
  submitExtensionRequest,
  submitRenewalRequest,
  updateAutoRenewal,
  updateResourceMetadata,
} from './resourceStore';
import type { ResourceQuery } from '../types';
import { getOrdersForResource, resetOrderStore } from '../../orders';
import { resetOperationsStore } from '../../operations';

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

beforeEach(() => {
  resetResourceStore();
  resetOrderStore();
  resetOperationsStore();
});
afterEach(() => {
  resetResourceStore();
  resetOrderStore();
  resetOperationsStore();
});

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

  it('uses state-based power and release capabilities for both resource types', () => {
    const cloud = getResourceById('cloud-server', 'cs-west-003');
    const physical = getResourceById('physical-machine', 'pm-west-003');

    expect(cloud && getResourceActionAvailability(cloud, 'start')).toEqual({
      enabled: true,
    });
    expect(
      physical && getResourceActionAvailability(physical, 'start'),
    ).toEqual({ enabled: true });
    expect(
      cloud && getResourceActionAvailability(cloud, 'release'),
    ).toEqual({ enabled: true });
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

  it('keeps cloud and physical domain facts structurally distinct', () => {
    const cloud = getResourceById('cloud-server', 'cs-east-001');
    const physical = getResourceById('physical-machine', 'pm-east-001');
    expect(cloud?.resourceType === 'cloud-server' && cloud.instanceSpec).toBeTruthy();
    expect(cloud?.resourceType === 'cloud-server' && cloud.imageId).toBe('preset-image-base-linux');
    expect(physical?.resourceType === 'physical-machine' && physical.assetNumber).toBeTruthy();
    expect(physical?.resourceType === 'physical-machine' && physical.localStorage.raidLevel).toBe('RAID 5');
  });

  it('submits renewal without changing the formal expiry and creates a linked order', () => {
    const before = getResourceById('cloud-server', 'cs-east-002');
    const result = submitRenewalRequest({
      resourceIds: ['cs-east-002'],
      periodMonths: 3,
      renewStorage: true,
      renewNetwork: false,
    });
    const after = getResourceById('cloud-server', 'cs-east-002');
    expect(after?.expiresAt).toBe(before?.expiresAt);
    expect(after?.lifecycleRequestState).toBe('renewal-processing');
    expect(after?.pendingExpiresAt).not.toBe(before?.expiresAt);
    expect(result[0]?.order.applicationType).toBe('cloud-renewal');
    expect(getOrdersForResource('cs-east-002')[0]?.status).toBe('pending');
  });

  it('does not offer renewal to pay-as-you-go resources and saves auto-renewal state', () => {
    const metered = getResourceById('cloud-server', 'cs-west-004');
    expect(metered && getRenewalAvailability(metered)).toMatchObject({ enabled: false });
    updateAutoRenewal(['cs-east-001'], true, 6);
    const updated = getResourceById('cloud-server', 'cs-east-001');
    expect(updated?.resourceType === 'cloud-server' && updated.autoRenewal).toEqual({ enabled: true, periodMonths: 6 });
    expect(getOrdersForResource('cs-east-001')[0]?.applicationType).toBe('auto-renewal');
  });

  it('submits a physical extension without changing the formal term', () => {
    const before = getResourceById('physical-machine', 'pm-east-001');
    const result = submitExtensionRequest({
      resourceIds: ['pm-east-001'],
      periodMonths: 6,
      reason: '项目执行周期需要延长',
    });
    const after = getResourceById('physical-machine', 'pm-east-001');
    expect(after?.expiresAt).toBe(before?.expiresAt);
    expect(after?.resourceType === 'physical-machine' && after.extensionStatus).toBe('pending');
    expect(result[0]?.order.applicationType).toBe('physical-extension');
  });

  it('synchronizes project and tags into the resource operation record', () => {
    updateResourceMetadata(['cs-east-001'], {
      project: '研发服务平台',
      tagsToAdd: ['关键任务'],
    });
    const updated = getResourceById('cloud-server', 'cs-east-001');
    expect(updated?.project).toBe('研发服务平台');
    expect(updated?.tags).toContain('关键任务');
    const message = getOperationRecords('cloud-server', 'cs-east-001')[0]?.message;
    expect(message).toContain('项目归属：研发服务平台');
    expect(message).toContain('关键任务');
  });
});
