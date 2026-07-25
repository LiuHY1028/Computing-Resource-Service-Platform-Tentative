import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_PATHS, checkoutPath } from '../../../app/routes';
import {
  Checkbox,
  Drawer,
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
  | 'metadata';

const TITLES: Readonly<Record<LifecycleDialogAction, string>> = {
  renew: '云服务器续费',
  'auto-renew': '自动续费设置',
  extend: '物理机续租',
  metadata: '项目与标签管理',
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
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [reason, setReason] = useState('');
  const [project, setProject] = useState(resources[0]?.project ?? '');
  const [tags, setTags] = useState(resources[0]?.tags.join(', ') ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const first = resources[0];
  const resourceIds = useMemo(
    () => resources.map((resource) => resource.id),
    [resources],
  );
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
        const results = createRenewalOrders({
          resourceIds,
          periodMonths: months,
          renewStorage,
          renewNetwork: false,
        });
        onCompleted(`${resources.length} 台云服务器的续费订单已创建。`);
        navigate(
          results.length === 1
            ? checkoutPath(results[0].order.id)
            : `${APP_PATHS.orders}?status=awaiting-payment`,
        );
      } else if (action === 'extend') {
        const results = createRentalRenewalOrders({
          resourceIds,
          periodMonths: months,
          reason,
        });
        onCompleted(`${resources.length} 台物理机的续租订单已创建。`);
        navigate(
          results.length === 1
            ? checkoutPath(results[0].order.id)
            : `${APP_PATHS.orders}?status=awaiting-payment`,
        );
      } else if (action === 'auto-renew') {
        updateAutoRenewal(resourceIds, autoEnabled, months);
        onCompleted(`${resources.length} 台云服务器的自动续费设置已保存。`);
      } else {
        const nextTags = tags
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);
        updateResourceMetadata(resourceIds, {
          project,
          tagsToRemove: first.tags.filter((tag) => !nextTags.includes(tag)),
          tagsToAdd: nextTags,
        });
        onCompleted(`${resources.length} 个资源的项目与标签已更新。`);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '操作未完成。');
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

  const identity = (
    <div className="resource-lifecycle-summary">
      <strong>
        {resources.length === 1
          ? first.name
          : `已选择 ${resources.length} 个资源`}
      </strong>
      <span>
        {resources.length === 1
          ? first.id
          : resources.map((resource) => resource.name).join('、')}
      </span>
    </div>
  );

  if (action === 'renew' || action === 'extend') {
    return (
      <Drawer
        open
        title={TITLES[action]}
        description="付款与履约完成前不会修改资源到期时间。"
        onClose={() => !busy && onClose()}
        busy={busy}
        primaryAction={{ label: '创建订单并支付', onClick: () => void submit() }}
        secondaryAction={{ label: '取消', onClick: onClose }}
      >
        <Form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
          {identity}
          <dl className="resource-lifecycle-facts">
            <div><dt>当前规格</dt><dd>{first.resourceType === 'cloud-server' ? first.instanceSpec : first.machineModel}</dd></div>
            <div><dt>当前价格</dt><dd>{first.resourceType === 'cloud-server' && first.billingMode === 'pay-as-you-go' ? formatHourlyPrice(first.priceSnapshot.unitPrice) : formatMonthlyPrice(first.priceSnapshot.unitPrice)}</dd></div>
            <div><dt>当前到期时间</dt><dd>{new Date(first.expiresAt).toLocaleDateString('zh-CN')}</dd></div>
            <div><dt>预计新到期时间</dt><dd>{addMonths(first.expiresAt, months)}</dd></div>
          </dl>
          {periodField}
          {action === 'renew' && (
            <>
              <Checkbox checked={renewStorage} onCheckedChange={setRenewStorage}>
                同步续费关联存储
              </Checkbox>
              <p className="resource-lifecycle-note">
                网络访问规则为免费运维配置，不产生续费费用。
              </p>
            </>
          )}
          {action === 'extend' && (
            <FormField label="续租说明" help="可填写续租用途，不影响价格计算。">
              <Textarea value={reason} maxLength={200} onChange={(event) => setReason(event.target.value)} />
            </FormField>
          )}
          {priceQuote && (
            <PricingSummary
              value={priceQuote}
              title={action === 'renew' ? '续费费用明细' : '续租费用明细'}
            />
          )}
          {error && <p className="resource-action-dialog__error" role="alert">{error}</p>}
        </Form>
      </Drawer>
    );
  }

  return (
    <Modal
      open
      title={TITLES[action]}
      onClose={() => !busy && onClose()}
      busy={busy}
      primaryAction={{ label: '保存设置', onClick: () => void submit() }}
      secondaryAction={{ label: '取消', onClick: onClose }}
    >
      <Form onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        {identity}
        {action === 'auto-renew' ? (
          <>
            <FormField label="自动续费状态">
              <Select
                value={autoEnabled ? 'on' : 'off'}
                onValueChange={(value) => setAutoEnabled(value === 'on')}
                options={[
                  { value: 'on', label: '开启' },
                  { value: 'off', label: '关闭' },
                ]}
              />
            </FormField>
            {periodField}
            <dl className="resource-lifecycle-facts">
              <div><dt>下次预计续费日期</dt><dd>{new Date(first.expiresAt).toLocaleDateString('zh-CN')}</dd></div>
              <div><dt>参考金额</dt><dd>{priceQuote ? formatMonthlyPrice(priceQuote.lineItems[0]?.unitPrice ?? first.priceSnapshot.unitPrice) : '—'}</dd></div>
            </dl>
            <p className="resource-lifecycle-note">
              该设置只保存续费偏好，不代表已建立自动扣款或支付协议。
            </p>
          </>
        ) : (
          <>
            <FormField label="项目归属" required>
              <Input value={project} onChange={(event) => setProject(event.target.value)} />
            </FormField>
            <FormField label="标签" help="多个标签使用英文逗号分隔。">
              <Input value={tags} onChange={(event) => setTags(event.target.value)} />
            </FormField>
          </>
        )}
        {error && <p className="resource-action-dialog__error" role="alert">{error}</p>}
      </Form>
    </Modal>
  );
}
