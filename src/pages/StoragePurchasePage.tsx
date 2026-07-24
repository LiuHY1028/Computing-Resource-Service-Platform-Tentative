import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { APP_PATHS, checkoutPath } from '../app/routes';
import { NavigationIcon } from '../app/shell/icons/AppShellIcons';
import { useConsolePageHeader } from '../app/shell/PageHeaderContext';
import {
  Button,
  Checkbox,
  Container,
  FormField,
  Input,
  Switch,
} from '../components/ui';
import {
  calculateStoragePrice,
  formatMoney,
  getStoragePrice,
  PricingSummary,
} from '../features/pricing';
import { listResources } from '../features/resources/state/resourceStore';
import {
  purchaseStorage,
  type PurchaseStorageInput,
  type StoragePerformanceTier,
  type StorageType,
} from '../features/storage';
import '../styles/management.css';
import '../styles/storage-purchase.css';

const SITES = [
  { value: '东部算力中心', note: '核心业务与研发工作负载' },
  { value: '西部算力中心', note: '批处理与数据归档工作负载' },
  { value: '南部算力中心', note: '验证与弹性业务工作负载' },
] as const;
const CAPACITY_PRESETS = [100, 500, 1024, 2048] as const;
const PERIODS = [1, 3, 6, 12] as const;

function skuId(type: StorageType, tier: StoragePerformanceTier) {
  return type === 'cloud-disk'
    ? `storage-cloud-${tier}-gb-month`
    : `storage-shared-${tier}-gb-month`;
}

export function StoragePurchasePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedTarget = listResources().find(
    (resource) => resource.id === searchParams.get('mount'),
  );
  const requestedSite = requestedTarget?.site ?? searchParams.get('site');
  const [stage, setStage] = useState<'configuration' | 'confirmation'>('configuration');
  const [type, setType] = useState<StorageType>(
    searchParams.get('type') === 'shared' ? 'shared' : 'cloud-disk',
  );
  const [tier, setTier] = useState<StoragePerformanceTier>(
    searchParams.get('tier') === 'performance' ? 'performance' : 'standard',
  );
  const [name, setName] = useState('业务数据存储');
  const [site, setSite] = useState(
    SITES.some((item) => item.value === requestedSite)
      ? requestedSite!
      : SITES[0].value,
  );
  const [capacityGb, setCapacityGb] = useState(500);
  const [quantity, setQuantity] = useState(1);
  const [durationMonths, setDurationMonths] =
    useState<(typeof PERIODS)[number]>(1);
  const [autoRenew, setAutoRenew] = useState(false);
  const [protocol, setProtocol] = useState<'NFS' | 'SMB'>('NFS');
  const [attachAfterPurchase, setAttachAfterPurchase] = useState(Boolean(requestedTarget));
  const [targetIds, setTargetIds] = useState<string[]>(
    requestedTarget ? [requestedTarget.id] : [],
  );
  const [mountPath, setMountPath] = useState(
    type === 'shared' ? '/data/shared' : '/data/disk',
  );
  const [readOnly, setReadOnly] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const pageHeader = useMemo(() => ({
    description: '选择存储产品、容量与性能，确认实时报价后创建订单。',
    actions: (
      <Button onClick={() => navigate(APP_PATHS.storage)}>
        返回存储管理
      </Button>
    ),
  }), [navigate]);
  useConsolePageHeader(pageHeader);

  const targets = listResources().filter(
    (resource) =>
      resource.site === site &&
      (type === 'shared' || resource.resourceType === 'cloud-server'),
  );
  const currentSku = skuId(type, tier);
  const currentPrice = getStoragePrice(currentSku)!;
  const quote = calculateStoragePrice({
    skuId: currentSku,
    capacityGb: capacityGb * quantity,
    durationMonths,
    label: `${type === 'cloud-disk' ? '云硬盘' : '高性能共享存储'} · ${tier === 'performance' ? '性能型' : '标准型'}`,
  });

  const input: PurchaseStorageInput = {
    name: name.trim(),
    type,
    skuId: currentSku,
    performanceTier: tier,
    site,
    capacityGb,
    quantity,
    durationMonths,
    autoRenew,
    protocol: type === 'shared' ? protocol : undefined,
    mounts: attachAfterPurchase
      ? targetIds.map((resourceId) => {
          const resource = targets.find((candidate) => candidate.id === resourceId);
          return {
            resourceId,
            resourceType: resource?.resourceType ?? 'cloud-server',
            mountPath,
            deviceName: type === 'cloud-disk' ? '/dev/vdb' : undefined,
            readOnly,
          };
        })
      : [],
  };

  function changeType(next: StorageType) {
    setType(next);
    setTargetIds([]);
    setMountPath(next === 'shared' ? '/data/shared' : '/data/disk');
    if (next === 'shared') setQuantity(1);
  }

  function toggleTarget(resourceId: string) {
    setTargetIds((current) => {
      if (current.includes(resourceId)) {
        return current.filter((id) => id !== resourceId);
      }
      return type === 'cloud-disk' ? [resourceId] : [...current, resourceId];
    });
  }

  function validate() {
    if (!name.trim()) throw new Error('请输入存储名称。');
    if (attachAfterPurchase && !targetIds.length) {
      throw new Error('请选择购买后挂载的目标资源。');
    }
    if (!Number.isSafeInteger(capacityGb) || capacityGb < 100 || capacityGb > 32768) {
      throw new Error('容量需为 100 至 32768 GB 的整数。');
    }
  }

  function confirmOrder() {
    setError('');
    try {
      validate();
      setStage('confirmation');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '请检查当前配置。');
    }
  }

  async function createOrder() {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await purchaseStorage(input);
      navigate(checkoutPath(result.order.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '订单创建失败。');
      setSubmitting(false);
    }
  }

  function saveConfiguration() {
    try {
      window.sessionStorage.setItem(
        'storage-purchase-configuration',
        JSON.stringify(input),
      );
      setFeedback('当前配置已保存到本次浏览会话。');
    } catch {
      setFeedback('当前配置已在本页面保留。');
    }
  }

  const productName = type === 'cloud-disk' ? '云硬盘' : '高性能共享存储';
  const tierMetrics = type === 'cloud-disk'
    ? {
        standard: { scene: '通用业务与开发环境', iops: '8,000 IOPS', throughput: '260 MB/s' },
        performance: { scene: '数据库与高 IO 工作负载', iops: '16,000 IOPS', throughput: '480 MB/s' },
      }
    : {
        standard: { scene: '共享数据与团队目录', iops: '12,000 IOPS', throughput: '420 MB/s' },
        performance: { scene: '模型与并行训练数据', iops: '18,500 IOPS', throughput: '620 MB/s' },
      };

  return (
    <div className="storage-configurator">
      <nav className="storage-configurator__progress" aria-label="购买进度">
        <ol>
          <li data-active={stage === 'configuration'} data-complete={stage === 'confirmation'}>
            <span>1</span><strong>配置</strong>
          </li>
          <li data-active={stage === 'confirmation'}>
            <span>2</span><strong>确认订单</strong>
          </li>
          <li><span>3</span><strong>支付</strong></li>
        </ol>
      </nav>

      {stage === 'configuration' ? (
        <div className="storage-configurator__workspace">
          <Container as="section" className="storage-configurator__main">
            <section className="storage-config-section" aria-labelledby="storage-product-title">
              <div className="storage-config-section__heading">
                <div><span>PRODUCT</span><h2 id="storage-product-title">存储产品</h2></div>
                <p>先选择块存储或共享文件存储，再配置对应性能。</p>
              </div>
              <div className="storage-product-grid">
                {([
                  {
                    value: 'cloud-disk' as const,
                    title: '云硬盘',
                    positioning: '低延迟块存储',
                    scene: '数据库、应用数据盘和高 IO 工作负载',
                    mount: '单台同站点云服务器',
                    performance: '标准型 / 性能型',
                  },
                  {
                    value: 'shared' as const,
                    title: '高性能共享存储',
                    positioning: '多节点共享文件存储',
                    scene: '共享数据、模型目录和团队协作',
                    mount: '多台同站点计算资源',
                    performance: 'NFS / SMB',
                  },
                ]).map((product) => {
                  const entry = getStoragePrice(skuId(product.value, 'standard'))!;
                  const selected = type === product.value;
                  return (
                    <button
                      type="button"
                      key={product.value}
                      className="storage-product-card"
                      data-selected={selected}
                      aria-pressed={selected}
                      onClick={() => changeType(product.value)}
                    >
                      <span className="storage-product-card__icon">
                        <NavigationIcon name="storage" />
                      </span>
                      {selected && (
                        <span className="storage-product-card__check">已选择</span>
                      )}
                      <strong>{product.title}</strong>
                      <span>{product.positioning}</span>
                      <dl>
                        <div><dt>典型场景</dt><dd>{product.scene}</dd></div>
                        <div><dt>挂载方式</dt><dd>{product.mount}</dd></div>
                        <div><dt>性能特点</dt><dd>{product.performance}</dd></div>
                      </dl>
                      <small>¥{(entry.unitPriceFen / 100).toFixed(2)} / GB / 月起</small>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="storage-config-section" aria-labelledby="storage-basic-title">
              <div className="storage-config-section__heading">
                <div><span>LOCATION</span><h2 id="storage-basic-title">基础配置</h2></div>
                <p>存储与挂载目标必须处于同一站点。</p>
              </div>
              <FormField id="storage-purchase-name" label="存储名称" required>
                <Input
                  id="storage-purchase-name"
                  value={name}
                  maxLength={48}
                  showCount
                  onChange={(event) => setName(event.target.value)}
                />
              </FormField>
              <div className="storage-site-grid" role="group" aria-label="站点">
                {SITES.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    data-selected={site === item.value}
                    aria-pressed={site === item.value}
                    onClick={() => {
                      setSite(item.value);
                      setTargetIds([]);
                    }}
                  >
                    <span className="storage-site-grid__availability">可用</span>
                    <strong>{item.value}</strong>
                    <small>{item.note}</small>
                  </button>
                ))}
              </div>
            </section>

            <section className="storage-config-section" aria-labelledby="storage-performance-title">
              <div className="storage-config-section__heading">
                <div><span>CAPACITY & PERFORMANCE</span><h2 id="storage-performance-title">容量与性能</h2></div>
                <p>性能等级决定单位容量的 IOPS、吞吐与价格。</p>
              </div>
              <div className="storage-tier-grid" role="group" aria-label="性能等级">
                {(['standard', 'performance'] as const).map((value) => {
                  const entry = getStoragePrice(skuId(type, value))!;
                  const metrics = tierMetrics[value];
                  return (
                    <button
                      type="button"
                      key={value}
                      aria-pressed={tier === value}
                      data-selected={tier === value}
                      onClick={() => setTier(value)}
                    >
                      <span>{value === 'standard' ? '标准型' : '性能型'}</span>
                      <strong>{metrics.scene}</strong>
                      <dl>
                        <div><dt>IOPS</dt><dd>{metrics.iops}</dd></div>
                        <div><dt>吞吐</dt><dd>{metrics.throughput}</dd></div>
                      </dl>
                      <small>{formatMoney({ amountFen: entry.unitPriceFen, currency: 'CNY' })} / GB / 月</small>
                    </button>
                  );
                })}
              </div>
              <div className="storage-capacity-control">
                <div className="storage-capacity-control__label">
                  <div><strong>容量</strong><span>100 GB – 32 TB</span></div>
                  <label>
                    <Input
                      id="storage-capacity-input"
                      aria-label="容量"
                      type="number"
                      min={100}
                      max={32768}
                      value={capacityGb}
                      onChange={(event) =>
                        setCapacityGb(
                          Math.min(32768, Math.max(100, Number(event.target.value) || 100)),
                        )}
                    />
                    <span>GB</span>
                  </label>
                </div>
                <input
                  className="storage-capacity-slider"
                  aria-label="容量滑块"
                  type="range"
                  min={100}
                  max={32768}
                  step={1}
                  value={capacityGb}
                  onChange={(event) => setCapacityGb(Number(event.target.value))}
                />
                <div className="storage-capacity-presets">
                  {CAPACITY_PRESETS.map((value) => (
                    <button
                      type="button"
                      key={value}
                      data-selected={capacityGb === value}
                      onClick={() => setCapacityGb(value)}
                    >
                      {value >= 1024 ? `${value / 1024} TB` : `${value} GB`}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-selected={!CAPACITY_PRESETS.includes(capacityGb as never)}
                    onClick={() => document.getElementById('storage-capacity-input')?.focus()}
                  >
                    自定义
                  </button>
                </div>
                <p>
                  当前配置费用 {formatMoney(quote.total)}，单价 {formatMoney({
                    amountFen: currentPrice.unitPriceFen,
                    currency: 'CNY',
                  })} / GB / 月。
                </p>
              </div>
              {type === 'cloud-disk' && (
                <div className="storage-stepper-row">
                  <div><strong>数量</strong><span>一次最多购买 10 块云硬盘</span></div>
                  <div className="storage-stepper" role="group" aria-label="购买数量">
                    <button type="button" aria-label="减少数量" disabled={quantity <= 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                    <output aria-live="polite">{quantity}</output>
                    <button type="button" aria-label="增加数量" disabled={quantity >= 10} onClick={() => setQuantity((value) => Math.min(10, value + 1))}>＋</button>
                  </div>
                </div>
              )}
              {type === 'shared' && (
                <div className="storage-protocol">
                  <strong>访问协议</strong>
                  <div role="group" aria-label="访问协议">
                    {(['NFS', 'SMB'] as const).map((value) => (
                      <button
                        type="button"
                        key={value}
                        aria-pressed={protocol === value}
                        data-selected={protocol === value}
                        onClick={() => setProtocol(value)}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="storage-config-section" aria-labelledby="storage-duration-title">
              <div className="storage-config-section__heading">
                <div><span>DURATION</span><h2 id="storage-duration-title">购买时长</h2></div>
                <p>周期变化会立即更新右侧应付金额。</p>
              </div>
              <div className="storage-period-grid" role="group" aria-label="购买时长">
                {PERIODS.map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={durationMonths === value}
                    data-selected={durationMonths === value}
                    onClick={() => setDurationMonths(value)}
                  >
                    <strong>{value} 个月</strong>
                    <span>{formatMoney(calculateStoragePrice({
                      skuId: currentSku,
                      capacityGb: capacityGb * quantity,
                      durationMonths: value,
                    }).total)}</span>
                  </button>
                ))}
              </div>
              <Switch
                checked={autoRenew}
                onCheckedChange={setAutoRenew}
                description="到期前按当前续费规则生成待支付续费订单。"
              >
                自动续费
              </Switch>
            </section>

            <section className="storage-config-section" aria-labelledby="storage-attach-title">
              <div className="storage-config-section__heading storage-config-section__heading--switch">
                <div><span>ATTACHMENT</span><h2 id="storage-attach-title">挂载设置</h2></div>
                <Switch
                  checked={attachAfterPurchase}
                  onCheckedChange={(checked) => {
                    setAttachAfterPurchase(checked);
                    if (!checked) setTargetIds([]);
                  }}
                  description={attachAfterPurchase ? '资源开通后执行挂载。' : '暂不挂载'}
                >
                  购买后挂载
                </Switch>
              </div>
              {attachAfterPurchase && (
                <div className="storage-attach-panel">
                  <div className="storage-target-grid">
                    {targets.map((resource) => (
                      <Checkbox
                        key={resource.id}
                        className="storage-target-card"
                        checked={targetIds.includes(resource.id)}
                        onCheckedChange={() => toggleTarget(resource.id)}
                      >
                        <span>
                          <strong>{resource.name}</strong>
                          <small>{resource.id} · {resource.resourceType === 'cloud-server' ? '云服务器' : '物理机'}</small>
                        </span>
                      </Checkbox>
                    ))}
                  </div>
                  {!targets.length && (
                    <p>当前站点没有适用资源，可关闭“购买后挂载”并在存储开通后操作。</p>
                  )}
                  <div className="storage-attach-fields">
                    <FormField id="storage-purchase-path" label="挂载路径">
                      <Input
                        id="storage-purchase-path"
                        value={mountPath}
                        onChange={(event) => setMountPath(event.target.value)}
                      />
                    </FormField>
                    <Switch
                      checked={readOnly}
                      onCheckedChange={setReadOnly}
                      description="关闭时使用读写模式。"
                    >
                      只读挂载
                    </Switch>
                  </div>
                  <p className="storage-compatibility-note">
                    {type === 'cloud-disk'
                      ? '云硬盘仅支持挂载到一台同站点云服务器。'
                      : '共享存储支持挂载到多台同站点计算资源。'}
                  </p>
                </div>
              )}
            </section>
          </Container>

          <aside className="storage-quote">
            <Container>
              <div className="storage-quote__heading">
                <span>REAL-TIME QUOTE</span>
                <h2>实时报价</h2>
                <p>配置变化将立即更新费用。</p>
              </div>
              <section>
                <h3>已选配置</h3>
                <dl className="storage-quote__configuration">
                  <div><dt>存储类型</dt><dd>{productName}</dd></div>
                  <div><dt>站点</dt><dd>{site}</dd></div>
                  <div><dt>性能等级</dt><dd>{tier === 'performance' ? '性能型' : '标准型'}</dd></div>
                  <div><dt>容量</dt><dd>{capacityGb} GB × {quantity}</dd></div>
                  <div><dt>周期</dt><dd>{durationMonths} 个月</dd></div>
                  <div><dt>挂载方式</dt><dd>{attachAfterPurchase ? `购买后挂载 · ${readOnly ? '只读' : '读写'}` : '暂不挂载'}</dd></div>
                </dl>
              </section>
              <section>
                <h3>费用明细</h3>
                <dl className="storage-quote__fees">
                  <div><dt>容量与性能</dt><dd>{formatMoney(quote.total)}</dd></div>
                  <div><dt>单位价格</dt><dd>{formatMoney({ amountFen: currentPrice.unitPriceFen, currency: 'CNY' })} / GB / 月</dd></div>
                  <div><dt>数量</dt><dd>× {quantity}</dd></div>
                  <div><dt>周期</dt><dd>× {durationMonths} 个月</dd></div>
                </dl>
                <p>性能费用已计入当前等级单价。</p>
              </section>
              <div className="storage-quote__total">
                <span>应付金额</span>
                <strong>{formatMoney(quote.total)}</strong>
              </div>
              {error && <p className="storage-configurator__error" role="alert">{error}</p>}
              {feedback && <p className="storage-configurator__feedback" role="status">{feedback}</p>}
              <Button variant="primary" onClick={confirmOrder}>确认订单</Button>
              <Button onClick={saveConfiguration}>保存当前配置</Button>
            </Container>
          </aside>
        </div>
      ) : (
        <div className="storage-order-confirmation">
          <Container as="section" className="storage-order-confirmation__main">
            <div className="storage-config-section__heading">
              <div><span>ORDER REVIEW</span><h2>确认订单</h2></div>
              <p>创建订单后将冻结当前配置与价格快照。</p>
            </div>
            <section>
              <h3>商品信息</h3>
              <dl className="storage-confirmation-grid">
                <div><dt>商品</dt><dd>{productName}</dd></div>
                <div><dt>存储名称</dt><dd>{name}</dd></div>
                <div><dt>站点</dt><dd>{site}</dd></div>
                <div><dt>性能等级</dt><dd>{tier === 'performance' ? '性能型' : '标准型'}</dd></div>
                <div><dt>容量与数量</dt><dd>{capacityGb} GB × {quantity}</dd></div>
                <div><dt>购买周期</dt><dd>{durationMonths} 个月</dd></div>
                <div><dt>自动续费</dt><dd>{autoRenew ? '已开启' : '未开启'}</dd></div>
                <div><dt>挂载配置</dt><dd>{attachAfterPurchase ? `${targetIds.length} 个目标 · ${mountPath} · ${readOnly ? '只读' : '读写'}` : '暂不挂载'}</dd></div>
              </dl>
            </section>
            <section className="storage-order-notice">
              <h3>购买须知</h3>
              <ul>
                <li>订单支付完成后进入存储开通流程。</li>
                <li>历史账单保留本次价格快照，不随价格目录变化。</li>
                <li>免费挂载和卸载操作不会生成额外账单。</li>
              </ul>
            </section>
          </Container>
          <Container as="aside" className="storage-confirmation-quote">
            <PricingSummary value={quote} title="费用明细" />
            <div className="storage-quote__total">
              <span>应付金额</span>
              <strong>{formatMoney(quote.total)}</strong>
            </div>
            {error && <p className="storage-configurator__error" role="alert">{error}</p>}
            <Button variant="primary" disabled={submitting} onClick={() => void createOrder()}>
              {submitting ? '正在创建订单' : '创建订单并支付'}
            </Button>
            <Button disabled={submitting} onClick={() => setStage('configuration')}>
              返回修改
            </Button>
          </Container>
        </div>
      )}
    </div>
  );
}
