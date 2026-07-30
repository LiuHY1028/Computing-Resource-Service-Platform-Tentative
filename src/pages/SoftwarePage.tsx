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
  Table,
  TextButton,
  UnderlineTabs,
  type TableColumn,
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

function SoftwareVersionMatrix({
  items,
  onDetail,
  onInstall,
}: Readonly<{
  items: readonly SoftwareProduct[];
  onDetail: (software: SoftwareProduct) => void;
  onInstall: (software: SoftwareProduct) => void;
}>) {
  const featuredSoftware = items.reduce<SoftwareProduct | undefined>(
    (current, item) => {
      if (!current) return item;
      return getSoftwareInstallCount(item.id) >
        getSoftwareInstallCount(current.id)
        ? item
        : current;
    },
    undefined,
  );
  const matrixSize = Math.min(Math.max(items.length, 1), 4);

  return (
    <div
      className={`software-version-matrix software-version-matrix--${matrixSize}`}
      role="list"
    >
      {items.map((item) => {
        const isFeatured = item.id === featuredSoftware?.id;
        const installedResourceCount = getSoftwareInstallCount(item.id);

        return (
          <article
            className={`software-version-card${isFeatured ? ' software-version-card--featured' : ''}`}
            data-featured={isFeatured ? 'true' : undefined}
            key={item.id}
            role="listitem"
          >
            {isFeatured && (
              <div className="software-version-card__featured-label">
                <strong>当前精选</strong>
                <span>
                  {installedResourceCount
                    ? `已关联 ${installedResourceCount} 个资源`
                    : '当前分类优先展示'}
                </span>
              </div>
            )}
            <div className="software-version-card__heading">
              <span className="software-version-card__glyph" aria-hidden="true">
                {softwareGlyph(item)}
              </span>
              <div>
                <span>{item.category}</span>
                <strong className="software-version-card__title">
                  {item.name}
                </strong>
                <p>{item.publisher}</p>
              </div>
            </div>
            {isFeatured && (
              <p className="software-version-card__description">
                {item.description}
              </p>
            )}
            <dl>
              <div>
                <dt>当前版本</dt>
                <dd>{item.versions[0]}</dd>
              </div>
              <div>
                <dt>操作系统</dt>
                <dd>{item.compatibleOperatingSystems.join(' / ')}</dd>
              </div>
              <div>
                <dt>适用算力</dt>
                <dd>
                  {item.compatibleComputeTypes
                    .map((type) => type.toUpperCase())
                    .join(' / ')}
                </dd>
              </div>
              <div>
                <dt>费用策略</dt>
                <dd>{softwarePriceLabel(item.id)}</dd>
              </div>
            </dl>
            <div className="software-version-card__actions">
              <Button variant="secondary" onClick={() => onDetail(item)}>
                查看详情
              </Button>
              <Button variant="primary" onClick={() => onInstall(item)}>
                安装
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

type SoftwareAdaptationRow = Readonly<{
  software: SoftwareProduct;
  compatibleResourceCount: number;
  installedResourceCount: number;
  coveragePercent: number;
}>;

function SoftwareAdaptationTable({
  rows,
  onOpen,
}: Readonly<{
  rows: readonly SoftwareAdaptationRow[];
  onOpen: (software: SoftwareProduct) => void;
}>) {
  const columns: readonly TableColumn<SoftwareAdaptationRow>[] = [
    {
      key: 'software',
      title: '软件与版本',
      width: '29%',
      multiline: true,
      render: (row) => (
        <div className="software-adaptation-table__cell">
          <TextButton onClick={() => onOpen(row.software)}>
            {row.software.name}
          </TextButton>
          <span>{row.software.publisher} · {row.software.versions[0]}</span>
        </div>
      ),
    },
    {
      key: 'environment',
      title: '适用环境',
      width: '23%',
      multiline: true,
      render: (row) => (
        <div className="software-adaptation-table__cell">
          <strong>
            {row.software.compatibleOperatingSystems.join(' / ')}
          </strong>
          <span>
            {row.software.compatibleComputeTypes
              .map((type) => type.toUpperCase())
              .join(' / ')}
          </span>
        </div>
      ),
    },
    {
      key: 'compatibility',
      title: '兼容资源',
      width: '18%',
      multiline: true,
      render: (row) => (
        <div className="software-adaptation-table__cell">
          <strong>{row.compatibleResourceCount} 个</strong>
          <span>
            {row.compatibleResourceCount
              ? '当前可提交安装'
              : '当前无可安装资源'}
          </span>
        </div>
      ),
    },
    {
      key: 'coverage',
      title: '安装覆盖',
      width: '30%',
      multiline: true,
      render: (row) => (
        <div className="software-adaptation-table__cell">
          <div
            className="software-adaptation-table__meter"
            role="progressbar"
            aria-label={`${row.software.name}安装覆盖`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={row.coveragePercent}
          >
            <span style={{ width: `${row.coveragePercent}%` }} />
          </div>
          <span>
            已关联 {row.installedResourceCount} 个 · {row.coveragePercent}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <Table
      aria-label="软件适配与安装覆盖"
      className="software-adaptation-table"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.software.id}
      getRowLabel={(row) => row.software.name}
      layout="fixed"
      minWidth="820px"
      onRowClick={(row) => onOpen(row.software)}
    />
  );
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
  const catalog = useMemo(() => querySoftware(), []);
  const featuredCategory = CATEGORIES.slice(1).includes(
    query.category as (typeof CATEGORIES)[number],
  )
    ? query.category
    : 'all';
  const adaptationRows = useMemo<readonly SoftwareAdaptationRow[]>(
    () =>
      catalog.map((item) => {
        const compatibleResourceCount = resources.filter(
          (resource) => getSoftwareCompatibility(item, resource).compatible,
        ).length;
        const installedResourceCount = new Set(
          installations
            .filter(
              (installation) =>
                installation.softwareId === item.id &&
                isActiveInstallation(installation.status),
            )
            .map((installation) => installation.resourceId),
        ).size;
        return {
          software: item,
          compatibleResourceCount,
          installedResourceCount,
          coveragePercent: compatibleResourceCount
            ? Math.min(
                100,
                Math.round(
                  (installedResourceCount / compatibleResourceCount) * 100,
                ),
              )
            : 0,
        };
      }),
    [catalog, installations, resources],
  );

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
      <section className="software-hero" aria-labelledby="software-center-title">
        <div className="software-hero__inner">
          <div className="software-hero__content">
            <span>软件与环境服务</span>
            <h1 id="software-center-title">软件中心</h1>
            <p>
              浏览适配当前算力资源的软件、运行环境和工具，核对版本、兼容性与费用策略后提交安装任务。
            </p>
            <div className="software-hero__actions">
              <Button
                className="software-hero__primary-action"
                variant="primary"
                onClick={() => {
                  const catalogElement =
                    document.getElementById('software-catalog');
                  if (
                    catalogElement &&
                    typeof catalogElement.scrollIntoView === 'function'
                  ) {
                    catalogElement.scrollIntoView({
                      behavior: 'smooth',
                      block: 'start',
                    });
                  }
                }}
              >
                浏览软件
              </Button>
              <Button
                className="software-hero__secondary-action"
                variant="secondary"
                onClick={() => {
                  setParam('installation', 'completed');
                  window.requestAnimationFrame(() => {
                    const catalogElement =
                      document.getElementById('software-catalog');
                    if (
                      catalogElement &&
                      typeof catalogElement.scrollIntoView === 'function'
                    ) {
                      catalogElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start',
                      });
                    }
                  });
                }}
              >
                查看已安装软件
              </Button>
            </div>
          </div>
          <div className="software-hero__visual" aria-hidden="true">
            <svg viewBox="0 0 520 320">
              <g className="software-hero__package">
                <path
                  d="M72 106 162 58l90 48-90 48Z"
                  className="software-hero__package-top"
                />
                <path
                  d="M72 106v106l90 50V154Z"
                  className="software-hero__package-side"
                />
                <path
                  d="M252 106v106l-90 50V154Z"
                  className="software-hero__package-face"
                />
                <path
                  d="M119 132 162 155l43-23"
                  className="software-hero__package-fold"
                />
                <path
                  d="m186 184 10 10 20-22"
                  className="software-hero__package-check"
                />
              </g>
              <g className="software-hero__deployment-pipeline">
                <path d="M260 160h50" />
                <path d="m300 150 12 10-12 10" />
                <path d="M312 160h18V68M330 160v92" />
              </g>
              <g className="software-hero__deployment-module">
                <rect x="330" y="38" width="146" height="60" rx="10" />
                <rect x="348" y="56" width="28" height="24" rx="6" />
                <path d="m356 67 4 4 8-9" />
                <path d="M390 60h62M390 76h42" />
              </g>
              <g className="software-hero__deployment-module">
                <rect x="330" y="130" width="146" height="60" rx="10" />
                <rect x="348" y="148" width="28" height="24" rx="6" />
                <path d="m356 159 4 4 8-9" />
                <path d="M390 152h62M390 168h50" />
              </g>
              <g className="software-hero__deployment-module">
                <rect x="330" y="222" width="146" height="60" rx="10" />
                <rect x="348" y="240" width="28" height="24" rx="6" />
                <path d="m356 251 4 4 8-9" />
                <path d="M390 244h62M390 260h38" />
              </g>
            </svg>
          </div>
        </div>
      </section>

      <section className="software-capability-strip" aria-label="软件服务能力">
        <div className="software-capability-strip__inner">
          <div><span>01</span><strong>常用环境</strong><p>集中浏览运行环境与工具。</p></div>
          <div><span>02</span><strong>版本管理</strong><p>安装前核对当前可选版本。</p></div>
          <div><span>03</span><strong>兼容检测</strong><p>依据目标资源判断安装条件。</p></div>
          <div><span>04</span><strong>进度可追踪</strong><p>安装任务与操作记录保持关联。</p></div>
        </div>
      </section>

      <section
        className="software-section software-version-section"
        aria-labelledby="software-version-title"
      >
        <div className="software-version-section__heading">
          <h2 id="software-version-title">精选软件</h2>
          <span>{catalog.length} 款可选 · 按分类浏览</span>
        </div>
        <UnderlineTabs
          className="software-version-tabs"
          aria-label="软件分类"
          value={featuredCategory}
          onValueChange={(value) => setParam('category', value)}
          items={CATEGORIES.map((category) => {
            const value = category === '全部软件' ? 'all' : category;
            const items =
              value === 'all'
                ? catalog
                : catalog.filter((item) => item.category === value);
            return {
              value,
              label: category,
              panel: (
                <SoftwareVersionMatrix
                  items={items}
                  onDetail={openDetail}
                  onInstall={openInstall}
                />
              ),
            };
          })}
        />
      </section>

      <section
        className="software-section software-catalog-section"
        id="software-catalog"
        aria-labelledby="software-catalog-title"
      >
        <div className="software-catalog">
          <div className="software-section-heading software-catalog__heading">
            <div>
              <span>完整软件目录</span>
              <h2 id="software-catalog-title">查找并安装软件</h2>
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

      <section
        className="software-section software-adaptation-section"
        aria-labelledby="software-adaptation-title"
      >
        <div className="software-section-heading software-section-heading--centered">
          <span>资源适配</span>
          <h2 id="software-adaptation-title">软件适配与安装覆盖</h2>
          <p>覆盖率按当前已关联资源数与可安装资源数计算，不代表外部使用热度。</p>
        </div>
        <SoftwareAdaptationTable rows={adaptationRows} onOpen={openDetail} />
      </section>

      <section className="software-guidance" aria-label="软件安装说明">
        <div>
          <strong>兼容确认</strong>
          <p>安装前核对操作系统、计算类型和目标资源当前状态。</p>
        </div>
        <div>
          <strong>费用处理</strong>
          <p>免费或服务已包含的软件直接提交任务，收费软件按现有规则创建订单。</p>
        </div>
        <div>
          <strong>结果联动</strong>
          <p>任务与目标资源、订单和操作记录保持关联，可在控制台继续查看。</p>
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
