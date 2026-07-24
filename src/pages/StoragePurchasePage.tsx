import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APP_PATHS, orderDetailPath, storageDetailPath } from '../app/routes';
import {
  Button,
  CardRadio,
  Checkbox,
  Container,
  FormField,
  Input,
  PageState,
  RadioGroup,
  Select,
  StatusBadge,
} from '../components/ui';
import { calculateStoragePrice, formatMoney } from '../features/pricing';
import { listResources } from '../features/resources/state/resourceStore';
import {
  purchaseStorage,
  type PurchaseStorageInput,
  type StoragePerformanceTier,
  type StorageType,
} from '../features/storage';
import '../styles/management.css';
import '../styles/storage-purchase.css';

const SITES = ['东部算力中心', '西部算力中心', '南部算力中心'];

function skuId(type: StorageType, tier: StoragePerformanceTier) {
  return type === 'cloud-disk'
    ? `storage-cloud-${tier}-gb-month`
    : `storage-shared-${tier}-gb-month`;
}

export function StoragePurchasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTarget = listResources().find((resource) => resource.id === searchParams.get('mount'));
  const requestedSite = requestedTarget?.site ?? searchParams.get('site');
  const [type, setType] = useState<StorageType>(searchParams.get('type') === 'shared' ? 'shared' : 'cloud-disk');
  const [tier, setTier] = useState<StoragePerformanceTier>(searchParams.get('tier') === 'performance' ? 'performance' : 'standard');
  const [name, setName] = useState('业务数据存储');
  const [site, setSite] = useState(SITES.includes(requestedSite ?? '') ? requestedSite! : SITES[0]);
  const [capacityGb, setCapacityGb] = useState(500);
  const [quantity, setQuantity] = useState(1);
  const [durationMonths, setDurationMonths] = useState<1 | 3 | 6 | 12>(1);
  const [autoRenew, setAutoRenew] = useState(false);
  const [protocol, setProtocol] = useState<'NFS' | 'SMB'>('NFS');
  const [mountMode, setMountMode] = useState<'none' | 'immediate'>(requestedTarget ? 'immediate' : 'none');
  const [targetIds, setTargetIds] = useState<string[]>(requestedTarget ? [requestedTarget.id] : []);
  const [mountPath, setMountPath] = useState('/data/storage');
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Awaited<ReturnType<typeof purchaseStorage>>>();

  const targets = listResources().filter((resource) => resource.site === site && (type === 'shared' || resource.resourceType === 'cloud-server'));
  const currentSku = skuId(type, tier);
  const quote = useMemo(
    () => calculateStoragePrice({ skuId: currentSku, capacityGb: capacityGb * quantity, durationMonths, label: `${type === 'cloud-disk' ? '云硬盘' : '高性能共享存储'} · ${capacityGb} GB × ${quantity}` }),
    [capacityGb, currentSku, durationMonths, quantity, type],
  );

  function changeType(next: StorageType) {
    setType(next);
    setTargetIds([]);
    setMountPath(next === 'shared' ? '/data/shared' : '/data/disk');
  }

  function toggleTarget(resourceId: string) {
    setTargetIds((current) => {
      if (current.includes(resourceId)) return current.filter((id) => id !== resourceId);
      return type === 'cloud-disk' ? [resourceId] : [...current, resourceId];
    });
  }

  async function submit() {
    setError('');
    try {
      if (mountMode === 'immediate' && !targetIds.length) throw new Error('请选择至少一个立即挂载的目标资源。');
      const input: PurchaseStorageInput = {
        name,
        type,
        skuId: currentSku,
        performanceTier: tier,
        site,
        capacityGb,
        quantity,
        durationMonths,
        autoRenew,
        protocol: type === 'shared' ? protocol : undefined,
        mounts: mountMode === 'none' ? [] : targetIds.map((resourceId) => {
          const resource = targets.find((candidate) => candidate.id === resourceId);
          if (!resource) throw new Error('挂载目标不再可用。');
          return {
            resourceId,
            resourceType: resource.resourceType,
            mountPath,
            deviceName: type === 'cloud-disk' ? '/dev/vdb' : undefined,
            readOnly,
          };
        }),
      };
      setResult(await purchaseStorage(input));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '提交失败。');
    }
  }

  if (result) {
    return (
      <main className="management-page">
        <PageState title="存储购买申请已提交" description={`订单 ${result.order.id} 已创建，${result.spaces.length} 个存储处于准备中；挂载关系将在后续处理中执行。`} />
        <Container className="storage-purchase-result">
          <StatusBadge tone="warning">准备中</StatusBadge>
          <h2>{result.spaces.map((space) => space.name).join('、')}</h2>
          <p>申请已进入受理流程，存储将在准备完成后按所选配置挂载。</p>
          <div>
            <Button variant="primary" onClick={() => navigate(orderDetailPath(result.order.id))}>查看订单</Button>
            <Button onClick={() => navigate(storageDetailPath(result.spaces[0].id))}>查看存储</Button>
            <Button onClick={() => navigate(APP_PATHS.storage)}>返回存储管理</Button>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="management-page storage-purchase-page">
      <Container className="storage-purchase-heading">
        <div><span>存储管理</span><h2>存储配置</h2><p>在一个页面完成类型、规格、挂载和价格确认。</p></div>
        <Button onClick={() => navigate(APP_PATHS.storage)}>返回存储管理</Button>
      </Container>

      <div className="storage-purchase-layout">
        <div className="storage-purchase-form">
          <Container className="storage-purchase-section">
            <div className="storage-purchase-step"><span>1</span><div><h2>选择存储类型</h2><p>物理机本地存储不在此处独立购买。</p></div></div>
            <RadioGroup value={type} onValueChange={(value) => changeType(value as StorageType)} className="storage-type-grid">
              <CardRadio value="cloud-disk" title="云硬盘" description="独立块存储，一次挂载一台同站点云服务器，适合数据库和高 IO 工作负载。" />
              <CardRadio value="shared" title="高性能共享存储" description="文件系统语义，可同时挂载多个同站点计算资源，适合共享数据、模型和团队目录。" />
            </RadioGroup>
          </Container>

          <Container className="storage-purchase-section">
            <div className="storage-purchase-step"><span>2</span><div><h2>选择规格</h2><p>价格来自统一存储价格目录。</p></div></div>
            <div className="storage-purchase-fields">
              <FormField id="storage-purchase-name" label="存储名称" required><Input id="storage-purchase-name" value={name} onChange={(event) => setName(event.target.value)} /></FormField>
              <FormField id="storage-purchase-site" label="站点" required><Select id="storage-purchase-site" value={site} onValueChange={(value) => { setSite(value); setTargetIds([]); }} options={SITES.map((value) => ({ value, label: value }))} /></FormField>
              <FormField id="storage-purchase-tier" label="性能等级" required><Select id="storage-purchase-tier" value={tier} onValueChange={(value) => setTier(value as StoragePerformanceTier)} options={[{ value: 'standard', label: '标准型' }, { value: 'performance', label: '性能型' }]} /></FormField>
              <FormField id="storage-purchase-capacity" label="容量（GB）" required><Input id="storage-purchase-capacity" type="number" min={10} value={capacityGb} onChange={(event) => setCapacityGb(Math.max(10, Number(event.target.value) || 10))} /></FormField>
              {type === 'cloud-disk' && <FormField id="storage-purchase-quantity" label="数量" required><Input id="storage-purchase-quantity" type="number" min={1} max={10} value={quantity} onChange={(event) => setQuantity(Math.min(10, Math.max(1, Number(event.target.value) || 1)))} /></FormField>}
              {type === 'shared' && <FormField id="storage-purchase-protocol" label="协议"><Select id="storage-purchase-protocol" value={protocol} onValueChange={(value) => setProtocol(value as 'NFS' | 'SMB')} options={[{ value: 'NFS', label: 'NFS' }, { value: 'SMB', label: 'SMB' }]} /></FormField>}
              <FormField id="storage-purchase-duration" label="计费周期"><Select id="storage-purchase-duration" value={String(durationMonths)} onValueChange={(value) => setDurationMonths(Number(value) as 1 | 3 | 6 | 12)} options={[1, 3, 6, 12].map((value) => ({ value: String(value), label: `${value} 个月` }))} /></FormField>
              <Checkbox className="storage-purchase-check" checked={autoRenew} onCheckedChange={setAutoRenew}>到期后自动续费</Checkbox>
            </div>
          </Container>

          <Container className="storage-purchase-section">
            <div className="storage-purchase-step"><span>3</span><div><h2>是否立即挂载</h2><p>提交后只创建待执行关系，不声明远程挂载已完成。</p></div></div>
            <RadioGroup value={mountMode} onValueChange={(value) => setMountMode(value as 'none' | 'immediate')} className="storage-mount-mode">
              <CardRadio value="none" title="暂不挂载" description="存储准备完成后再从存储详情选择资源。" />
              <CardRadio value="immediate" title="立即挂载" description={type === 'cloud-disk' ? '选择一台同站点云服务器。' : '选择一个或多个同站点计算资源。'} />
            </RadioGroup>
            {mountMode === 'immediate' && (
              <div className="storage-purchase-mount">
                <div className="storage-target-grid">
                  {targets.map((resource) => (
                    <Checkbox key={resource.id} className="storage-target-card" checked={targetIds.includes(resource.id)} onCheckedChange={() => toggleTarget(resource.id)}>
                      <span><strong>{resource.name}</strong><small>{resource.id} · {resource.resourceType === 'cloud-server' ? '云服务器' : '物理机'}</small></span>
                    </Checkbox>
                  ))}
                </div>
                {!targets.length && <p>当前站点没有适用的计算资源，可选择暂不挂载。</p>}
                <div className="storage-purchase-fields">
                  <FormField id="storage-purchase-path" label="挂载路径"><Input id="storage-purchase-path" value={mountPath} onChange={(event) => setMountPath(event.target.value)} /></FormField>
                  <Checkbox className="storage-purchase-check" checked={readOnly} onCheckedChange={setReadOnly}>以只读模式挂载</Checkbox>
                </div>
              </div>
            )}
          </Container>
        </div>

        <aside className="storage-price-summary">
          <Container>
            <div className="storage-purchase-step"><span>4</span><div><h2>价格摘要</h2><p>提交时保存完整价格快照。</p></div></div>
            <dl>
              <div><dt>存储类型</dt><dd>{type === 'cloud-disk' ? '云硬盘' : '高性能共享存储'}</dd></div>
              <div><dt>性能等级</dt><dd>{tier === 'performance' ? '性能型' : '标准型'}</dd></div>
              <div><dt>容量</dt><dd>{capacityGb} GB × {quantity}</dd></div>
              <div><dt>周期</dt><dd>{durationMonths} 个月</dd></div>
              <div><dt>挂载</dt><dd>{mountMode === 'none' ? '暂不挂载' : `${targetIds.length} 个资源 · ${readOnly ? '只读' : '读写'}`}</dd></div>
              <div><dt>单价</dt><dd>{formatMoney(quote.lineItems[0].unitPrice)} / GB / 月</dd></div>
            </dl>
            <div className="storage-price-total"><span>总费用</span><strong>{formatMoney(quote.total)}</strong></div>
            {error && <p className="storage-dialog-error" role="alert">{error}</p>}
            <Button variant="primary" onClick={() => void submit()}>提交购买申请</Button>
            <small>提交后将生成待处理订单，存储与挂载状态可在控制台持续查看。</small>
          </Container>
        </aside>
      </div>
    </main>
  );
}
