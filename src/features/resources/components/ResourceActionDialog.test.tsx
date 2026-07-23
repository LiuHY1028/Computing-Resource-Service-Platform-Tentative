import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getResourceById, resetResourceStore, submitResourceAction } from '../state/resourceStore';
import type { ResourceActionResult } from '../types';
import { ResourceActionDialog } from './ResourceActionDialog';

beforeEach(resetResourceStore);

function resource(type: 'cloud-server' | 'physical-machine', id: string) {
  const item = getResourceById(type, id);
  if (!item) throw new Error('Resource not found.');
  return item;
}

describe('ResourceActionDialog', () => {
  it('confirms and submits one concrete action without rendering an action navigator', async () => {
    const user = userEvent.setup();
    const onCompleted = vi.fn();
    render(<ResourceActionDialog resource={resource('cloud-server', 'cs-west-003')} action="start" open onClose={vi.fn()} onCompleted={onCompleted} />);
    expect(screen.queryByRole('button', { name: '修改名称' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认启动' }));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
    expect((onCompleted.mock.calls[0]?.[0] as ResourceActionResult).resource.status).toBe('running');
  });

  it('validates rename and supports retry after submission failure', async () => {
    const user = userEvent.setup();
    const item = resource('cloud-server', 'cs-east-001');
    const submitAction = vi.fn().mockRejectedValueOnce(new Error('提交失败。')).mockImplementation(submitResourceAction);
    const onCompleted = vi.fn();
    render(<ResourceActionDialog resource={item} action="rename" open onClose={vi.fn()} onCompleted={onCompleted} submitAction={submitAction} />);
    const input = screen.getByRole('textbox', { name: '资源名称必填' });
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: '保存名称' }));
    expect(screen.getByText('请输入资源名称。')).toBeInTheDocument();
    await user.type(input, '研发服务节点-A');
    await user.click(screen.getByRole('button', { name: '保存名称' }));
    expect(await screen.findByText('提交失败。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '保存名称' }));
    await waitFor(() => expect(onCompleted).toHaveBeenCalledTimes(1));
  });

  it('explains a state-incompatible action', () => {
    render(<ResourceActionDialog resource={resource('cloud-server', 'cs-east-001')} action="start" open onClose={vi.fn()} onCompleted={vi.fn()} />);
    expect(screen.getByRole('button', { name: '确认启动' })).toBeDisabled();
    expect(screen.getByText('仅已停止的资源可启动。')).toBeInTheDocument();
  });

  it('prevents duplicate submission while pending', async () => {
    const user = userEvent.setup();
    let resolveRequest: ((value: ResourceActionResult) => void) | undefined;
    const submitAction = vi.fn(() => new Promise<ResourceActionResult>((resolve) => { resolveRequest = resolve; }));
    const item = resource('cloud-server', 'cs-west-003');
    render(<ResourceActionDialog resource={item} action="start" open onClose={vi.fn()} onCompleted={vi.fn()} submitAction={submitAction} />);
    await user.click(screen.getByRole('button', { name: '确认启动' }));
    expect(screen.getByRole('button', { name: '处理中' })).toBeDisabled();
    expect(submitAction).toHaveBeenCalledTimes(1);
    resolveRequest?.(await submitResourceAction({ resourceType: item.resourceType, resourceId: item.id, action: 'start' }));
  });
});
