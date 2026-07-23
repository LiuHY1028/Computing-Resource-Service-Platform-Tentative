import { useState } from 'react';
import { Form, FormField, Input, Modal } from '../../../components/ui';
import { getResourceActionAvailability, submitResourceAction } from '../state/resourceStore';
import type { Resource, ResourceAction, ResourceActionResult } from '../types';

const ACTION_LABELS: Readonly<Record<ResourceAction, string>> = {
  start: '启动',
  stop: '停止',
  restart: '重启',
  rename: '修改名称',
  release: '释放资源',
};

const ACTION_TITLES: Readonly<Record<ResourceAction, string>> = {
  start: '启动资源',
  stop: '停止资源',
  restart: '重启资源',
  rename: '修改资源名称',
  release: '提交资源释放申请',
};

type ResourceActionDialogProps = Readonly<{
  resource: Resource | undefined;
  action: ResourceAction;
  open: boolean;
  onClose: () => void;
  onCompleted: (result: ResourceActionResult) => void;
  submitAction?: typeof submitResourceAction;
}>;

export function ResourceActionDialog({
  resource,
  action,
  open,
  onClose,
  onCompleted,
  submitAction = submitResourceAction,
}: ResourceActionDialogProps) {
  const [nextName, setNextName] = useState(resource?.name ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!resource || !open) return null;
  const availability = getResourceActionAvailability(resource, action);

  async function submit() {
    if (!resource || busy) return;
    setError('');
    const name = nextName.trim();
    if (action === 'rename') {
      if (!name) return setError('请输入资源名称。');
      if (name.length > 48) return setError('资源名称不能超过 48 个字符。');
      if (name === resource.name) return setError('请输入与当前名称不同的资源名称。');
    }
    if (!availability.enabled) return setError(availability.reason ?? '当前操作不可用。');
    setBusy(true);
    try {
      onCompleted(await submitAction({
        resourceType: resource.resourceType,
        resourceId: resource.id,
        action,
        nextName: action === 'rename' ? name : undefined,
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '操作提交失败。');
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={ACTION_TITLES[action]}
      onClose={() => !busy && onClose()}
      busy={busy}
      role={action === 'release' || action === 'stop' || action === 'restart' ? 'alertdialog' : 'dialog'}
      primaryAction={{
        label: action === 'rename' ? '保存名称' : action === 'release' ? '提交释放申请' : `确认${ACTION_LABELS[action]}`,
        variant: action === 'stop' || action === 'restart' || action === 'release' ? 'danger' : 'primary',
        disabled: !availability.enabled,
        onClick: () => void submit(),
      }}
      secondaryAction={{ label: '取消', onClick: onClose }}
    >
      <Form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {action === 'rename' ? (
          <FormField label="资源名称" required error={error || undefined} help="最多 48 个字符。">
            <Input
              value={nextName}
              maxLength={48}
              showCount
              disabled={busy}
              onChange={(event) => {
                setNextName(event.target.value);
                setError('');
              }}
            />
          </FormField>
        ) : (
          <div className="resource-action-dialog__confirmation">
            <strong>
              {action === 'release'
                ? `确认提交“${resource.name}”的释放申请？`
                : `确认对“${resource.name}”执行${ACTION_LABELS[action]}操作？`}
            </strong>
            <p>
              {action === 'release'
                ? '提交后进入待处理状态，资源不会立即删除。'
                : '操作结果将同步到资源状态和操作记录。'}
            </p>
          </div>
        )}
        {!availability.enabled && <p className="resource-action-dialog__error">{availability.reason}</p>}
        {error && action !== 'rename' && <p className="resource-action-dialog__error" role="alert">{error}</p>}
      </Form>
    </Modal>
  );
}
