import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_PATHS, checkoutPath } from '../../../app/routes';
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
  createRentalRenewalOrders,
  createRenewalOrders,
  submitResourceMaintenance,
  updateAutoRenewal,
  updateResourceMetadata,
  createRentalRenewalQuote,
  createRenewalQuote,
} from '../state/resourceStore';
import type { Resource } from '../types';
import {
  combinePriceQuotes,
  formatHourlyPrice,
  formatMonthlyPrice,
  PricingSummary,
} from '../../pricing';

export type LifecycleDialogAction =
  | 'renew'
  | 'auto-renew'
  | 'extend'
  | 'metadata'
  | 'configuration-change'
  | 'os-reinstall';

const TITLES: Readonly<Record<LifecycleDialogAction, string>> = {
  renew: '云服务器续费',
  'auto-renew': '自动续费设置',
  extend: '物理机续租',
  metadata: '项目与标签管理',
  'configuration-change': '变更配置',
  'os-reinstall': '重装系统',
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
  const navigate = useNavigate();
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
  const months = Number(period) as 1 | 3 | 6 | 12;
  const priceQuote = useMemo(() => {
    if (action === 'renew' || action === 'auto-renew') {
      const quotes = resources
        .filter((resource) => resource.resourceType === 'cloud-server')
        .map((resource) => createRenewalQuote(resource, months, renewStorage));
      return quotes.length
        ? combinePriceQuotes(quotes, 'subscription', months)
        : undefined;
    }
    if (action === 'extend') {
      const quotes = resources
        .filter((resource) => resource.resourceType === 'physical-machine')
        .map((resource) => createRentalRenewalQuote(resource, months));
      return quotes.length
        ? combinePriceQuotes(quotes, 'monthly-rental', months)
        : undefined;
    }
    return undefined;
  }, [action, months, renewStorage, resources]);
  if (!open || !first) return null;

  async function submit() {
    setBusy(true);
    setError('');
    try {
      if (action === 'renew') {
        const results = createRenewalOrders({ resourceIds, periodMonths: months, renewStorage, renewNetwork });
        onCompleted(`${resources.length} 台云服务器的续费订单已创建。`);
        navigate(results.length === 1 ? checkoutPath(results[0].order.id) : `${APP_PATHS.orders}?status=awaiting-payment`);
      } else if (action === 'auto-renew') {
        updateAutoRenewal(resourceIds, autoEnabled, months);
        onCompleted(`${resources.length} 台云服务器的自动续费设置已保存。`);
      } else if (action === 'extend') {
        const results = createRentalRenewalOrders({ resourceIds, periodMonths: months, reason });
        onCompleted(`${resources.length} 台物理机的续租订单已创建。`);
        navigate(results.length === 1 ? checkoutPath(results[0].order.id) : `${APP_PATHS.orders}?status=awaiting-payment`);
      } else if (action === 'metadata') {
        updateResourceMetadata(resourceIds, {
          project,
          tagsToAdd: tag.trim() ? tag.split(',').map((value) => value.trim()).filter(Boolean) : [],
        });
        onCompleted(`${resources.length} 个资源的项目与标签已更新。`);
      } else {
        submitResourceMaintenance(resourceIds, action, reason);
        onCompleted(`${resources.length} 个资源的${action === 'configuration-change' ? '变更配置' : '重装系统'}操作已开始。`);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '提交失败。');
      setBusy(false);
    }
  }

  const periodField = (
    <FormField label={action === 'extend' ? '续租周期' : '续费周期'} required>
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
      primaryAction={{
        label: action === 'auto-renew' || action === 'metadata'
          ? '保存设置'
          : action === 'renew' || action === 'extend'
            ? '创建订单并支付'
            : action === 'configuration-change'
              ? '确认变配'
              : '确认重装',
        onClick: () => void submit(),
      }}
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
              <div><dt>当前规格</dt><dd>{first.resourceType === 'cloud-server' ? first.instanceSpec : first.machineModel}</dd></div>
              <div><dt>{first.resourceType === 'cloud-server' ? '当前规格价格' : '当前月租价格'}</dt><dd>{first.resourceType === 'cloud-server' && first.billingMode === 'pay-as-you-go' ? formatHourlyPrice(first.priceSnapshot.unitPrice) : formatMonthlyPrice(first.priceSnapshot.unitPrice)}</dd></div>
              <div><dt>当前到期时间</dt><dd>{new Date(first.expiresAt).toLocaleDateString('zh-CN')}</dd></div>
              <div><dt>预计新到期时间</dt><dd>{addMonths(first.expiresAt, months)}</dd></div>
              <div><dt>项目</dt><dd>{first.project}</dd></div>
              <div><dt>{first.resourceType === 'cloud-server' ? '计费模式' : '责任人'}</dt><dd>{first.resourceType === 'cloud-server' ? '包年包月' : first.owner}</dd></div>
            </dl>
            {periodField}
            {priceQuote && <PricingSummary value={priceQuote} title={action === 'renew' ? '续费费用明细' : '续租费用明细'} />}
          </>
        )}
        {action === 'renew' && (
          <div className="resource-lifecycle-checks">
            <Checkbox checked={renewStorage} onCheckedChange={setRenewStorage}>同步续费关联存储</Checkbox>
            <Checkbox checked={renewNetwork} onCheckedChange={setRenewNetwork}>同步续费公网 IP 或网络资源</Checkbox>
          </div>
        )}
        {action === 'auto-renew' && (
          <>
            <FormField label="自动续费状态">
              <Select value={autoEnabled ? 'on' : 'off'} onValueChange={(value) => setAutoEnabled(value === 'on')} options={[{ value: 'on', label: '开启' }, { value: 'off', label: '关闭' }]} />
            </FormField>
            {periodField}
            <dl className="resource-lifecycle-facts">
              <div><dt>当前参考续费金额</dt><dd>{priceQuote ? formatMonthlyPrice(priceQuote.lineItems[0]?.unitPrice ?? first.priceSnapshot.unitPrice) : '—'}</dd></div>
              <div><dt>下次预计续费时间</dt><dd>{new Date(first.expiresAt).toLocaleDateString('zh-CN')}</dd></div>
            </dl>
            {priceQuote && <PricingSummary value={priceQuote} title="自动续费参考金额" />}
            <p className="resource-lifecycle-note">该设置仅保存续费偏好，不代表已建立自动扣款或支付协议。</p>
          </>
        )}
        {action === 'extend' && (
          <FormField label="续租说明" help="可填写续租用途，不影响价格计算。">
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
          <>
            <FormField label="操作说明" required help="确认后将开始执行资源配置操作。">
              <Textarea value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} />
            </FormField>
            <p className="resource-lifecycle-note">
              当前操作不涉及收费项目，将直接执行并写入操作记录；存在补差价的规格变更会先创建订单和账单。
            </p>
          </>
        )}
        {error && <p className="resource-action-dialog__error" role="alert">{error}</p>}
      </Form>
    </Modal>
  );
}
