import { useMemo, useState } from 'react';
import { Form, FormField, Input, Modal } from '../../../components/ui';
import { getOrdersForResource } from '../../orders';
import { getStorageMountsForResource } from '../../storage';
import {
  disableNetworkRulesForResource,
  getNetworkRulesForResource,
} from '../../network';
import {
  getResourceActionAvailability,
  submitResourceAction,
  updateAutoRenewal,
} from '../state/resourceStore';
import type { Resource, ResourceAction, ResourceActionResult } from '../types';

const POWER_LABELS = {
  start: '启动',
  stop: '停止',
  restart: '重启',
} as const;

type ResourceActionDialogProps = Readonly<{
  resource: Resource | undefined;
  action: ResourceAction;
  open: boolean;
  onClose: () => void;
  onCompleted: (result: ResourceActionResult) => void;
  submitAction?: typeof submitResourceAction;
}>;

export function ResourceActionDialog(props: ResourceActionDialogProps) {
  if (!props.resource || !props.open) return null;
  if (props.action === 'rename') {
    return <RenameResourceDialog {...props} resource={props.resource} action="rename" />;
  }
  if (props.action === 'release') {
    return <ReleaseResourceDialog {...props} resource={props.resource} action="release" />;
  }
  return (
    <PowerActionDialog
      {...props}
      resource={props.resource}
      action={props.action}
    />
  );
}

function PowerActionDialog({
  resource,
  action,
  onClose,
  onCompleted,
  submitAction = submitResourceAction,
}: ResourceActionDialogProps & Readonly<{
  resource: Resource;
  action: 'start' | 'stop' | 'restart';
}>) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const availability = getResourceActionAvailability(resource, action);
  async function submit() {
    if (busy || !availability.enabled) return;
    setBusy(true);
    try {
      onCompleted(await submitAction({
        resourceType: resource.resourceType,
        resourceId: resource.id,
        action,
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '操作未完成。');
      setBusy(false);
    }
  }
  const label = POWER_LABELS[action];
  return (
    <Modal
      open
      title={`${label}资源`}
      role={action === 'start' ? 'dialog' : 'alertdialog'}
      onClose={() => !busy && onClose()}
      busy={busy}
      primaryAction={{
        label: `确认${label}`,
        variant: action === 'start' ? 'primary' : 'danger',
        disabled: !availability.enabled,
        onClick: () => void submit(),
      }}
      secondaryAction={{ label: '取消', onClick: onClose }}
    >
      <strong>确认对“{resource.name}”执行{label}操作？</strong>
      <p>操作完成后将同步更新资源主状态并写入全局操作记录。</p>
      {!availability.enabled && <p className="resource-action-dialog__error">{availability.reason}</p>}
      {error && <p className="resource-action-dialog__error" role="alert">{error}</p>}
    </Modal>
  );
}

function RenameResourceDialog({
  resource,
  onClose,
  onCompleted,
  submitAction = submitResourceAction,
}: ResourceActionDialogProps & Readonly<{ resource: Resource; action: 'rename' }>) {
  const [nextName, setNextName] = useState(resource.name);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    const name = nextName.trim();
    if (!name) return setError('请输入资源名称。');
    if (name.length > 48) return setError('资源名称不能超过 48 个字符。');
    if (name === resource.name) return setError('请输入与当前名称不同的资源名称。');
    setBusy(true);
    try {
      onCompleted(await submitAction({
        resourceType: resource.resourceType,
        resourceId: resource.id,
        action: 'rename',
        nextName: name,
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '名称未保存。');
      setBusy(false);
    }
  }
  return (
    <Modal
      open
      title="修改资源名称"
      onClose={() => !busy && onClose()}
      busy={busy}
      primaryAction={{ label: '保存名称', onClick: () => void submit() }}
      secondaryAction={{ label: '取消', onClick: onClose }}
    >
      <Form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <FormField label="资源名称" required error={error || undefined} help="最多 48 个字符。">
          <Input value={nextName} maxLength={48} showCount onChange={(event) => setNextName(event.target.value)} />
        </FormField>
      </Form>
    </Modal>
  );
}

function ReleaseResourceDialog({
  resource,
  onClose,
  onCompleted,
  submitAction = submitResourceAction,
}: ResourceActionDialogProps & Readonly<{ resource: Resource; action: 'release' }>) {
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const impact = useMemo(() => {
    const unfinishedOrders = getOrdersForResource(resource.id).filter((order) =>
      ['awaiting-payment', 'paying', 'paid', 'fulfilling', 'payment-failed', 'refunding'].includes(order.status),
    );
    const mounts = getStorageMountsForResource(resource.id);
    const networkRules = getNetworkRulesForResource(resource.id).filter(
      (rule) => rule.status === 'enabled',
    );
    const lifecycle = getResourceActionAvailability(resource, 'release');
    return {
      lifecycle,
      unfinishedOrders,
      mounts,
      networkRules,
      autoRenew:
        resource.resourceType === 'cloud-server' && resource.autoRenewal.enabled,
    };
  }, [resource]);
  const blocked =
    !impact.lifecycle.enabled ||
    impact.unfinishedOrders.length > 0 ||
    impact.mounts.length > 0;

  async function submit() {
    if (blocked) return;
    if (confirmation !== resource.name) {
      setError('请输入完整资源名称以确认释放。');
      return;
    }
    setBusy(true);
    try {
      if (resource.resourceType === 'cloud-server' && resource.autoRenewal.enabled) {
        updateAutoRenewal([resource.id], false, resource.autoRenewal.periodMonths);
      }
      disableNetworkRulesForResource(resource.id);
      onCompleted(await submitAction({
        resourceType: resource.resourceType,
        resourceId: resource.id,
        action: 'release',
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '释放未完成。');
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title="释放资源"
      role="alertdialog"
      onClose={() => !busy && onClose()}
      busy={busy}
      primaryAction={{
        label: '确认释放',
        variant: 'danger',
        disabled: blocked || confirmation !== resource.name,
        onClick: () => void submit(),
      }}
      secondaryAction={{ label: '取消', onClick: onClose }}
    >
      <div className="resource-release-impact">
        <strong>释放影响检查</strong>
        <ul>
          <li data-blocked={!impact.lifecycle.enabled}>
            运行状态：{impact.lifecycle.enabled ? '符合释放条件' : impact.lifecycle.reason}
          </li>
          <li data-blocked={impact.mounts.length > 0}>
            外挂存储：{impact.mounts.length ? `${impact.mounts.length} 个挂载需先卸载` : '无挂载'}
          </li>
          <li data-blocked={impact.unfinishedOrders.length > 0}>
            未完成订单：{impact.unfinishedOrders.length ? `${impact.unfinishedOrders.length} 个订单需先处理` : '无'}
          </li>
          <li>自动续费：{impact.autoRenew ? '确认后关闭' : '未开启'}</li>
          <li>网络规则：{impact.networkRules.length ? `确认后停用 ${impact.networkRules.length} 条` : '无启用规则'}</li>
        </ul>
      </div>
      <FormField label={`输入“${resource.name}”确认`} required error={error || undefined}>
        <Input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      </FormField>
    </Modal>
  );
}
