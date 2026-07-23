import { useMemo, useState } from 'react';
import {
  Checkbox,
  Form,
  FormField,
  Input,
  Modal,
  Select,
  Textarea,
} from '../../../components/ui';
import {
  submitExtensionRequest,
  submitRenewalRequest,
  submitResourceApplication,
  updateAutoRenewal,
  updateResourceMetadata,
} from '../state/resourceStore';
import type { Resource } from '../types';

export type LifecycleDialogAction =
  | 'renew'
  | 'auto-renew'
  | 'extend'
  | 'metadata'
  | 'configuration-change'
  | 'os-reinstall';

const TITLES: Readonly<Record<LifecycleDialogAction, string>> = {
  renew: '提交云服务器续费申请',
  'auto-renew': '自动续费设置',
  extend: '提交物理机延期申请',
  metadata: '项目与标签管理',
  'configuration-change': '提交变更配置申请',
  'os-reinstall': '提交重装系统申请',
};

function addMonths(value: string, months: number) {
  const date = new Date(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toLocaleDateString('zh-CN');
}

export function ResourceLifecycleDialog({
  resources,
  action,
  open,
  onClose,
  onCompleted,
}: Readonly<{
  resources: readonly Resource[];
  action: LifecycleDialogAction;
  open: boolean;
  onClose: () => void;
  onCompleted: (message: string) => void;
}>) {
  const [period, setPeriod] = useState<'1' | '3' | '6' | '12'>('3');
  const [renewStorage, setRenewStorage] = useState(true);
  const [renewNetwork, setRenewNetwork] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [reason, setReason] = useState('');
  const [project, setProject] = useState(resources[0]?.project ?? '');
  const [tag, setTag] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const first = resources[0];
  const resourceIds = useMemo(() => resources.map((resource) => resource.id), [resources]);
  if (!open || !first) return null;
  const months = Number(period) as 1 | 3 | 6 | 12;

  async function submit() {
    setBusy(true);
    setError('');
    try {
      if (action === 'renew') {
        submitRenewalRequest({ resourceIds, periodMonths: months, renewStorage, renewNetwork });
        onCompleted(`${resources.length} 台云服务器的续费申请已提交。`);
      } else if (action === 'auto-renew') {
        updateAutoRenewal(resourceIds, autoEnabled, months);
        onCompleted(`${resources.length} 台云服务器的自动续费设置已保存。`);
      } else if (action === 'extend') {
        submitExtensionRequest({ resourceIds, periodMonths: months, reason });
        onCompleted(`${resources.length} 台物理机的延期申请已提交。`);
      } else if (action === 'metadata') {
        updateResourceMetadata(resourceIds, {
          project,
          tagsToAdd: tag.trim() ? tag.split(',').map((value) => value.trim()).filter(Boolean) : [],
        });
        onCompleted(`${resources.length} 个资源的项目与标签已更新。`);
      } else {
        submitResourceApplication(resourceIds, action, reason);
        onCompleted(`${resources.length} 个资源的${action === 'configuration-change' ? '变更配置' : '重装系统'}申请已提交。`);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '提交失败。');
      setBusy(false);
    }
  }

  const periodField = (
    <FormField label={action === 'extend' ? '申请延期时长' : '周期'} required>
      <Select
        value={period}
        onValueChange={(value) => setPeriod(value as typeof period)}
        options={[
          { value: '1', label: '1 个月' },
          { value: '3', label: '3 个月' },
          { value: '6', label: '6 个月' },
          { value: '12', label: '12 个月' },
        ]}
      />
    </FormField>
  );

  return (
    <Modal
      open
      title={TITLES[action]}
      onClose={() => !busy && onClose()}
      busy={busy}
      primaryAction={{ label: action === 'auto-renew' || action === 'metadata' ? '保存设置' : '提交申请', onClick: () => void submit() }}
      secondaryAction={{ label: '取消', onClick: onClose }}
    >
      <Form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <div className="resource-lifecycle-summary">
          <strong>{resources.length === 1 ? first.name : `已选择 ${resources.length} 个资源`}</strong>
          <span>{resources.length === 1 ? first.id : resources.map((resource) => resource.name).join('、')}</span>
        </div>
        {(action === 'renew' || action === 'extend') && (
          <>
            <dl className="resource-lifecycle-facts">
              <div><dt>当前到期时间</dt><dd>{new Date(first.expiresAt).toLocaleDateString('zh-CN')}</dd></div>
              <div><dt>预计新到期时间</dt><dd>{addMonths(first.expiresAt, months)}</dd></div>
              <div><dt>项目</dt><dd>{first.project}</dd></div>
              <div><dt>{first.resourceType === 'cloud-server' ? '计费模式' : '责任人'}</dt><dd>{first.resourceType === 'cloud-server' ? '包年包月' : first.owner}</dd></div>
            </dl>
            {periodField}
          </>
        )}
        {action === 'renew' && (
          <div className="resource-lifecycle-checks">
            <Checkbox checked={renewStorage} onCheckedChange={setRenewStorage}>同步提交关联存储续期</Checkbox>
            <Checkbox checked={renewNetwork} onCheckedChange={setRenewNetwork}>同步提交公网 IP 或网络资源续期</Checkbox>
          </div>
        )}
        {action === 'auto-renew' && (
          <>
            <FormField label="自动续费状态">
              <Select value={autoEnabled ? 'on' : 'off'} onValueChange={(value) => setAutoEnabled(value === 'on')} options={[{ value: 'on', label: '开启' }, { value: 'off', label: '关闭' }]} />
            </FormField>
            {periodField}
            <p className="resource-lifecycle-note">保存的是当前前端管理状态，不代表已建立扣款或支付协议。</p>
          </>
        )}
        {action === 'extend' && (
          <FormField label="延期原因" required>
            <Textarea value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} />
          </FormField>
        )}
        {action === 'metadata' && (
          <>
            <FormField label="项目归属" required><Input value={project} onChange={(event) => setProject(event.target.value)} /></FormField>
            <FormField label="添加标签" help="多个标签使用英文逗号分隔；现有标签会保留。"><Input value={tag} onChange={(event) => setTag(event.target.value)} /></FormField>
          </>
        )}
        {(action === 'configuration-change' || action === 'os-reinstall') && (
          <FormField label="申请说明" required help="申请提交后等待处理，不会立即修改资源配置。">
            <Textarea value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} />
          </FormField>
        )}
        {error && <p className="resource-action-dialog__error" role="alert">{error}</p>}
      </Form>
    </Modal>
  );
}
