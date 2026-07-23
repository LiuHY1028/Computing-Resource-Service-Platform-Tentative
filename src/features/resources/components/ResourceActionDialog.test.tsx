import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getResourceById,
  resetResourceStore,
  submitResourceAction,
} from '../state/resourceStore';
import type { ResourceActionResult } from '../types';
import { ResourceActionDialog } from './ResourceActionDialog';

beforeEach(() => {
  resetResourceStore();
});

async function loadResource(
  type: 'cloud-server' | 'physical-machine',
  id: string,
) {
  const resource = getResourceById(type, id);
  if (!resource) throw new Error('Resource not found in test catalog.');
  return resource;
}

describe('ResourceActionDialog', () => {
  it('submits an applicable start request and returns the updated resource', async () => {
    const user = userEvent.setup();
    const resource = await loadResource('cloud-server', 'cs-west-003');
    const onCompleted = vi.fn();
    render(
      <ResourceActionDialog
        resource={resource}
        open
        onClose={vi.fn()}
        onCompleted={onCompleted}
      />,
    );

    await user.click(screen.getByRole('button', { name: '启动' }));
    expect(
      screen.getByText(/确认对“数据处理节点-03”执行启动操作/),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认启动' }));

    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    const result = onCompleted.mock.calls[0]?.[0] as ResourceActionResult;
    expect(result.resource.status).toBe('running');
    expect(result.record.message).toBe('操作请求已提交，状态更新中。');
    expect(result.resource.operationRecords[0]?.action).toBe('启动');
  });

  it('validates rename and keeps a failed request available for retry', async () => {
    const user = userEvent.setup();
    const resource = await loadResource('cloud-server', 'cs-east-001');
    const submitAction = vi
      .fn()
      .mockRejectedValueOnce(new Error('操作请求提交失败，请稍后重试。'))
      .mockImplementation(submitResourceAction);
    const onCompleted = vi.fn();
    render(
      <ResourceActionDialog
        resource={resource}
        open
        onClose={vi.fn()}
        onCompleted={onCompleted}
        submitAction={submitAction}
      />,
    );

    await user.click(screen.getByRole('button', { name: '修改名称' }));
    const input = screen.getByLabelText(/资源名称/);
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: '保存名称' }));
    expect(screen.getByText('请输入资源名称。')).toBeInTheDocument();
    expect(submitAction).not.toHaveBeenCalled();

    await user.type(input, '研发服务节点-A');
    await user.click(screen.getByRole('button', { name: '保存名称' }));
    expect(
      await screen.findByText('操作请求提交失败，请稍后重试。'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '修改名称资源' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '保存名称' }));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect(submitAction).toHaveBeenCalledTimes(2);
  });

  it('shows clear disabled reasons for physical power and release actions', async () => {
    const resource = await loadResource(
      'physical-machine',
      'pm-east-001',
    );
    render(
      <ResourceActionDialog
        resource={resource}
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: '启动' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '停止' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '重启' })).toBeDisabled();
    expect(
      screen.getAllByText('物理机电源操作当前未开放。'),
    ).toHaveLength(3);
    expect(screen.getByRole('button', { name: '释放资源' })).toBeDisabled();
    expect(screen.getByText('资源释放能力当前未开放。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改名称' })).toBeEnabled();
  });

  it('prevents duplicate submission while an operation is pending', async () => {
    const user = userEvent.setup();
    const resource = await loadResource('cloud-server', 'cs-west-003');
    let resolveRequest: ((value: ResourceActionResult) => void) | undefined;
    const submitAction = vi.fn(
      () =>
        new Promise<ResourceActionResult>((resolve) => {
          resolveRequest = resolve;
        }),
    );
    render(
      <ResourceActionDialog
        resource={resource}
        open
        onClose={vi.fn()}
        onCompleted={vi.fn()}
        submitAction={submitAction}
      />,
    );

    await user.click(screen.getByRole('button', { name: '启动' }));
    await user.click(screen.getByRole('button', { name: '确认启动' }));
    expect(screen.getByRole('button', { name: '处理中' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '处理中' }));
    expect(submitAction).toHaveBeenCalledTimes(1);

    const result = await submitResourceAction(
      {
        resourceType: resource.resourceType,
        resourceId: resource.id,
        action: 'start',
      },
    );
    resolveRequest?.(result);
  });
});
