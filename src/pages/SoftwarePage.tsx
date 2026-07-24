import { useCallback, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { APP_PATHS, checkoutPath, resourceDetailPath } from '../app/routes';
import {
  Button,
  Form,
  FormField,
  Modal,
  PageState,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
} from '../components/ui';
import {
  getSoftwareCompatibility,
  getSoftwareInstallCount,
  getSoftwareInstallations,
  querySoftware,
  submitSoftwareInstallation,
  type InstallationStatus,
  type SoftwareProduct,
} from '../features/software';
import {
  queryResources,
  type Resource,
} from '../features/resources';
import {
  getSoftwarePrice,
  calculateSoftwarePrice,
  createPriceSnapshot,
  money,
  pricePolicyLabel,
  type PricePolicy,
} from '../features/pricing';
import { createCommerceOrder } from '../features/orders';
import './software-center.css';

const PAGE_SIZE = 6;
const CATEGORIES = ['全部软件', '运行环境', '开发工具', '运维工具'] as const;
const CATEGORY_NOTES: Readonly<Record<(typeof CATEGORIES)[number], string>> = {
  全部软件: '完整目录',
  运行环境: '基础运行栈',
  开发工具: '研发与加速',
  运维工具: '监控与诊断',
};

type SoftwareDialogState = Readonly<{
  view: 'detail' | 'install';
  software: SoftwareProduct;
}>;

const INSTALLATION_STATUS_LABEL: Readonly<Record<InstallationStatus, string>> = {
  waiting: '等待执行',
  executing: '执行中',
  completed: '已完成',
  failed: '失败',
  cancelled: '已取消',
};

function isActiveInstallation(status: InstallationStatus) {
  return status !== 'failed' && status !== 'cancelled';
}

function softwarePriceLabel(softwareId: string) {
  const price = getSoftwarePrice(softwareId);
  return price
    ? pricePolicyLabel(price.policy, money(price.monthlyPriceFen))
    : '需授权';
}

function softwarePricePolicy(softwareId: string): PricePolicy {
  return getSoftwarePrice(softwareId)?.policy ?? 'requires-license';
}

function softwareGlyph(item: SoftwareProduct) {
  if (item.compatibleComputeTypes.length === 1 && item.compatibleComputeTypes[0] === 'gpu') {
    return 'GX';
  }
  return item.category.slice(0, 1);
}

export function SoftwarePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialog, setDialog] = useState<SoftwareDialogState>();
  const [version, setVersion] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [completedResource, setCompletedResource] = useState<Resource>();
  const selected = dialog?.software;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const feePolicy = searchParams.get('fee') ?? 'all';
  const installState = searchParams.get('installation') ?? 'all';
  const contextualResourceId = searchParams.get('resource');
  const query = useMemo(
    () => ({
      search: searchParams.get('q') ?? '',
      category: searchParams.get('category') ?? 'all',
      operatingSystem: searchParams.get('os') ?? 'all',
      computeType: (searchParams.get('compute') ?? 'all') as
        | 'all'
        | 'cpu'
        | 'gpu',
    }),
    [searchParams],
  );
  const installations = getSoftwareInstallations();
  const software = useMemo(() => {
    const installedSoftwareIds = new Set(
      installations
        .filter((item) => isActiveInstallation(item.status))
        .map((item) => item.softwareId),
    );
    return querySoftware(query).filter((item) => {
      if (feePolicy !== 'all' && softwarePricePolicy(item.id) !== feePolicy) return false;
      const hasInstallation = installedSoftwareIds.has(item.id);
      if (installState === 'completed' && !hasInstallation) return false;
      if (installState === 'installable' && hasInstallation) return false;
      return true;
    });
  }, [feePolicy, installState, installations, query]);
  const resources = useMemo<readonly Resource[]>(() => {
    const base = {
      search: '',
      site: 'all',
      status: 'all' as const,
      computeType: 'all' as const,
      acceleratorModel: 'all',
      expiryState: 'all' as const,
      scope: 'all',
      image: 'all',
      operatingSystem: 'all',
    };
    const cloud = queryResources({ ...base, resourceType: 'cloud-server' });
    const physical = queryResources({
      ...base,
      resourceType: 'physical-machine',
    });
    return [...cloud.items, ...physical.items];
  }, []);
  const catalog = querySoftware();
  const featured = catalog.find((item) => item.id === 'software-gpu-toolkit') ?? catalog[0];

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(software.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = software.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedInstallations = selected
    ? installations.filter((item) => item.softwareId === selected.id)
    : [];

  const closeDialog = useCallback(() => {
    setDialog(undefined);
    setVersion('');
    setResourceId('');
    setError('');
    setSubmitting(false);
  }, []);

  function getInstallationAvailability(item: SoftwareProduct, resource: Resource) {
    const compatibility = getSoftwareCompatibility(item, resource);
    if (!compatibility.compatible) {
      return { available: false, reason: compatibility.reason };
    }
    const existing = installations.find(
      (installation) =>
        installation.softwareId === item.id &&
        installation.resourceId === resource.id &&
        isActiveInstallation(installation.status),
    );
    return existing
      ? {
          available: false,
          reason: existing.status === 'completed' ? '已安装' : '安装任务处理中',
        }
      : { available: true, reason: '兼容' };
  }

  function openDetail(item: SoftwareProduct) {
    setDialog({ view: 'detail', software: item });
  }

  function openInstall(item: SoftwareProduct) {
    const contextualResource = resources.find((resource) => resource.id === contextualResourceId);
    const canUseContext = contextualResource
      ? getInstallationAvailability(item, contextualResource).available
      : false;
    setDialog({ view: 'install', software: item });
    setVersion(item.versions[0] ?? '');
    setResourceId(canUseContext && contextualResource ? contextualResource.id : '');
    setError('');
  }

  async function submitInstall() {
    if (!selected || dialog?.view !== 'install' || submitting) return;
    const resource = resources.find((item) => item.id === resourceId);
    if (!resource) {
      setError('请选择目标资源。');
      return;
    }
    setSubmitting(true);
    try {
      const price = getSoftwarePrice(selected.id);
      if (price?.policy === 'monthly') {
        const order = createCommerceOrder({
          orderType: 'softwarePurchase',
          productType: 'software',
          productName: selected.name,
          resourceId: resource.id,
          resourceIds: [resource.id],
          resourceName: resource.name,
          site: resource.site,
          configurationSummary: [
            { label: '软件', value: selected.name },
            { label: '版本', value: version },
            { label: '目标资源', value: `${resource.name}（${resource.id}）` },
            { label: '计费周期', value: '1 个月' },
          ],
          pricingSnapshot: createPriceSnapshot(
            selected.id,
            calculateSoftwarePrice({ softwareId: selected.id }),
          ),
          fulfillment: {
            kind: 'software-purchase',
            softwareId: selected.id,
            resourceId: resource.id,
            version,
          },
        });
        navigate(checkoutPath(order.id));
        return;
      }
      const task = await submitSoftwareInstallation({
        softwareId: selected.id,
        version,
        resource,
      });
      setFeedback(`${task.softwareName} ${task.version} 安装任务已提交。`);
      setCompletedResource(resource);
      setDialog(undefined);
      setVersion('');
      setResourceId('');
      setError('');
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '安装任务提交失败。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="software-center-page">
      <section className="software-featured" aria-labelledby="software-center-title">
        <div className="software-featured__intro">
          <span className="software-featured__eyebrow">应用与环境目录</span>
          <h1 id="software-center-title">软件中心</h1>
          <p>
            发现适配当前算力资源的软件、运行环境和工具，完成版本与兼容性确认后提交安装任务。
          </p>
          <SearchInput
            className="software-guide-search"
            aria-label="全局搜索软件"
            value={query.search}
            placeholder="搜索软件、能力或发布方"
            onChange={(event) => setParam('q', event.target.value)}
            clearable
            onClear={() => setParam('q', '')}
          />
          <div className="software-guide-categories" aria-label="热门分类">
            {CATEGORIES.slice(1).map((category) => (
              <button type="button" key={category} onClick={() => setParam('category', category)}>
                {category}
              </button>
            ))}
          </div>
          <div className="software-featured__stats" aria-label="软件中心概览">
            <div><strong>{catalog.length}</strong><span>收录软件</span></div>
            <div><strong>{new Set(catalog.flatMap((item) => item.versions)).size}</strong><span>可选版本</span></div>
            <div><strong>{resources.length}</strong><span>关联资源</span></div>
          </div>
        </div>

        {featured && (
          <article className="software-featured__spotlight">
            <div className="software-featured__label">
              <span>精选软件</span>
              <span>适配加速资源</span>
            </div>
            <div className="software-featured__glyph" aria-hidden="true">
              {softwareGlyph(featured)}
            </div>
            <div>
              <span>{featured.category}</span>
              <h2>{featured.name}</h2>
              <p>{featured.description}</p>
            </div>
            <dl>
              <div><dt>推荐版本</dt><dd>{featured.versions[0]}</dd></div>
              <div><dt>费用策略</dt><dd>{softwarePriceLabel(featured.id)}</dd></div>
            </dl>
            <Button variant="primary" onClick={() => openInstall(featured)}>
              选择资源安装
            </Button>
          </article>
        )}
      </section>

      <section className="software-collection" aria-labelledby="software-catalog-title">
        <div className="software-category-rail" aria-label="软件分类">
          <div><span className="software-category-rail__label">软件分类</span><h2>按用途浏览</h2></div>
          <nav>
            {CATEGORIES.map((category) => {
              const value = category === '全部软件' ? 'all' : category;
              const active = query.category === value;
              return (
                <button
                  className={active ? 'is-active' : undefined}
                  key={category}
                  type="button"
                  onClick={() => setParam('category', value)}
                >
                  <span>{category}</span>
                  <small>{CATEGORY_NOTES[category]}</small>
                </button>
              );
            })}
          </nav>
          <div className="software-category-rail__note">
            <span aria-hidden="true">↗</span>
            <p>安装任务会关联目标资源，并同步记录到控制台操作记录。</p>
          </div>
        </div>

        <div className="software-catalog">
          <div className="software-catalog__heading">
            <div>
              <span>应用目录</span>
              <h2 id="software-catalog-title">软件目录</h2>
            </div>
            <p>{software.length} 个匹配结果</p>
          </div>

          <div className="software-filter-bar">
            <SearchInput
              aria-label="搜索软件"
              value={query.search}
              placeholder="搜索软件、分类或发布方"
              onChange={(event) => setParam('q', event.target.value)}
              clearable
              onClear={() => setParam('q', '')}
            />
            <Select
              aria-label="适用操作系统"
              value={query.operatingSystem}
              onValueChange={(value) => setParam('os', value)}
              options={[{ value: 'all', label: '全部操作系统' }, { value: 'Linux', label: 'Linux' }]}
            />
            <Select
              aria-label="适用计算类型"
              value={query.computeType}
              onValueChange={(value) => setParam('compute', value)}
              options={[{ value: 'all', label: 'CPU 与 GPU' }, { value: 'cpu', label: 'CPU' }, { value: 'gpu', label: 'GPU' }]}
            />
            <Select
              aria-label="费用策略"
              value={feePolicy}
              onValueChange={(value) => setParam('fee', value)}
              options={[
                { value: 'all', label: '全部费用策略' },
                { value: 'free', label: '免费' },
                { value: 'included', label: '服务已包含' },
                { value: 'monthly', label: '按月计费' },
                { value: 'requires-license', label: '需授权' },
              ]}
            />
            <Select
              aria-label="安装状态"
              value={installState}
              onValueChange={(value) => setParam('installation', value)}
              options={[
                { value: 'all', label: '全部安装状态' },
                { value: 'completed', label: '已安装或处理中' },
                { value: 'installable', label: '可安装' },
              ]}
            />
          </div>

          {feedback && (
            <div className="software-install-feedback" role="status">
              <div><strong>{feedback}</strong><span>可继续浏览目录，或进入控制台查看处理状态。</span></div>
              <div>
                {completedResource && (
                  <Link to={`${resourceDetailPath(completedResource.resourceType, completedResource.id)}?tab=software`}>
                    查看资源软件环境
                  </Link>
                )}
                <Link to={`${APP_PATHS.operationRecords}?module=software`}>查看操作记录</Link>
              </div>
            </div>
          )}

          {visible.length ? (
            <div className="software-card-grid">
              {visible.map((item, index) => {
                const itemInstallations = installations.filter(
                  (installation) => installation.softwareId === item.id,
                );
                const activeInstallations = itemInstallations.filter((installation) =>
                  isActiveInstallation(installation.status),
                );
                const hasPendingInstallation = activeInstallations.some(
                  (installation) =>
                    installation.status === 'waiting' ||
                    installation.status === 'executing',
                );
                return (
                  <article className="software-card" key={item.id}>
                    <div className="software-card__topline">
                      <span>{String(index + 1 + (safePage - 1) * PAGE_SIZE).padStart(2, '0')}</span>
                      <span>{item.category}</span>
                    </div>
                    <div className="software-card__identity">
                      <div className="software-card__glyph" aria-hidden="true">
                        {softwareGlyph(item)}
                      </div>
                      <div>
                        <h3>{item.name}</h3>
                        <p>{item.publisher}</p>
                      </div>
                    </div>
                    <p className="software-card__description">{item.description}</p>
                    <div className="software-card__badges">
                      <span className="software-card__compatibility">
                        {item.compatibleComputeTypes.map((type) => type.toUpperCase()).join(' / ')}
                      </span>
                      <StatusBadge tone={hasPendingInstallation ? 'info' : activeInstallations.length ? 'success' : 'neutral'}>
                        {hasPendingInstallation ? '安装处理中' : activeInstallations.length ? '已安装' : '可安装'}
                      </StatusBadge>
                    </div>
                    <dl className="software-card__facts">
                      <div><dt>最新版本</dt><dd>{item.versions[0]}</dd></div>
                      <div><dt>操作系统</dt><dd>{item.compatibleOperatingSystems.join(' / ')}</dd></div>
                      <div><dt>费用</dt><dd>{softwarePriceLabel(item.id)}</dd></div>
                      <div><dt>关联资源</dt><dd>{getSoftwareInstallCount(item.id)} 个</dd></div>
                    </dl>
                    <div className="software-card__actions">
                      <Button variant="secondary" onClick={() => openDetail(item)}>查看详情</Button>
                      <Button variant="primary" onClick={() => openInstall(item)}>安装到资源</Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <PageState
              title="没有匹配的软件"
              description="请调整搜索或筛选条件。"
              actionLabel="重置条件"
              onAction={() => setSearchParams({})}
            />
          )}
          {software.length > 0 && (
            <Pagination
              page={safePage}
              totalPages={totalPages}
              totalItems={software.length}
              onPageChange={(next) => setParam('page', String(next))}
            />
          )}
        </div>
      </section>

      <Modal
        open={dialog?.view === 'detail'}
        title="软件详情"
        onClose={closeDialog}
        primaryAction={{ label: '选择资源安装', onClick: () => selected && openInstall(selected) }}
        secondaryAction={{ label: '关闭', onClick: closeDialog }}
      >
        {selected && (
          <div className="software-detail">
            <div className="software-detail__intro">
              <div className="software-card__glyph" aria-hidden="true">{softwareGlyph(selected)}</div>
              <div><span>{selected.category}</span><h3>{selected.name}</h3><p>{selected.description}</p></div>
            </div>
            <dl className="software-detail__facts">
              <div><dt>可选版本</dt><dd>{selected.versions.join('、')}</dd></div>
              <div><dt>发布方</dt><dd>{selected.publisher}</dd></div>
              <div><dt>环境要求</dt><dd>{selected.environmentRequirement}</dd></div>
              <div><dt>适用资源</dt><dd>{selected.compatibleComputeTypes.map((item) => item.toUpperCase()).join(' / ')}</dd></div>
              <div><dt>费用策略</dt><dd>{softwarePriceLabel(selected.id)}</dd></div>
            </dl>
            <div className="software-detail__links">
              <strong>已安装或处理中资源</strong>
              {selectedInstallations.length
                ? selectedInstallations.map((item) => (
                    <Link
                      key={item.id}
                      to={`${resourceDetailPath(item.resourceId.startsWith('pm-') ? 'physical-machine' : 'cloud-server', item.resourceId)}?tab=software`}
                    >
                      {item.resourceName} · {INSTALLATION_STATUS_LABEL[item.status]}
                    </Link>
                  ))
                : <span>暂无关联资源</span>}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={dialog?.view === 'install'}
        title={selected && softwarePricePolicy(selected.id) === 'monthly' ? '购买并安装软件' : '安装软件'}
        onClose={closeDialog}
        busy={submitting}
        primaryAction={{ label: selected && softwarePricePolicy(selected.id) === 'monthly' ? '创建订单并支付' : '确认安装', onClick: () => void submitInstall() }}
        secondaryAction={{ label: '取消', onClick: closeDialog }}
      >
        {selected && (
          <Form>
            <div className="software-install-intro">
              <span>INSTALLATION</span>
              <p>为 <strong>{selected.name}</strong> 选择版本和目标资源。</p>
              <p>费用：{softwarePriceLabel(selected.id)}。确认安装后可在控制台查看处理进度。</p>
            </div>
            <FormField label="软件版本" required>
              <Select value={version} onValueChange={setVersion} options={selected.versions.map((item) => ({ value: item, label: item }))} />
            </FormField>
            <FormField label="目标资源" required error={error || undefined}>
              <Select
                value={resourceId}
                placeholder="请选择目标资源"
                onValueChange={(value) => {
                  setResourceId(value);
                  setError('');
                }}
                options={resources.map((resource) => {
                  const availability = getInstallationAvailability(selected, resource);
                  return {
                    value: resource.id,
                    label: `${resource.name} · ${availability.reason}`,
                    disabled: !availability.available,
                  };
                })}
              />
            </FormField>
          </Form>
        )}
      </Modal>
    </div>
  );
}
