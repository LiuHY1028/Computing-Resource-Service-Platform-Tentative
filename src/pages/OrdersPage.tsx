import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Container,
  DataTable,
  Input,
  PageState,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  TextButton,
  type TableColumn,
} from '../components/ui';
import {
  APP_PATHS,
  orderDetailPath,
  resourceDetailPath,
  storageDetailPath,
} from '../app/routes';
import {
  getOrder,
  queryOrders,
  APPLICATION_TYPE_LABELS,
  ORDER_STATUS_VIEWS,
  type ApplicationType,
  type OrderStatus,
  type PurchaseOrder,
} from '../features/orders';
import { getResourceByAnyId } from '../features/resources';
import {
  listOperationRecords,
  type OperationModule,
  type OperationStatus,
  type PlatformOperationRecord,
} from '../features/operations';
import {
  formatMoney,
  PricingSummary,
} from '../features/pricing';
import '../styles/management.css';

const PAGE_SIZE = 8;

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function resourcePath(order: PurchaseOrder) {
  if (order.storageId) {
    return storageDetailPath(order.storageId);
  }
  if (!order.resourceId) return undefined;
  if (!order.resourceType || order.resourceType === 'storage') return undefined;
  return resourceDetailPath(order.resourceType, order.resourceId);
}

function resourceTypeLabel(order: PurchaseOrder) {
  return order.resourceType === 'cloud-server'
    ? '云服务器'
    : order.resourceType === 'physical-machine'
      ? '物理机'
      : '存储空间';
}

function billingModeLabel(mode: string) {
  if (mode === 'subscription') return '包月';
  if (mode === 'pay-as-you-go') return '按量';
  if (mode === 'monthly-rental') return '按月租用';
  if (mode === 'monthly-capacity') return '按月计费';
  return '不计费';
}

export function OrderListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const query = useMemo(
    () => ({
      search: searchParams.get('q') ?? '',
      resourceType: (searchParams.get('resourceType') ?? 'all') as
        | 'all'
        | 'cloud-server'
        | 'physical-machine'
        | 'storage',
      applicationType: (searchParams.get('applicationType') ?? 'all') as
        | 'all'
        | ApplicationType,
      status: (searchParams.get('status') ?? 'all') as 'all' | OrderStatus,
      site: searchParams.get('site') ?? 'all',
      submittedAfter: searchParams.get('after') ?? '',
      related: (searchParams.get('related') ?? 'all') as 'all' | 'yes' | 'no',
    }),
    [searchParams],
  );

  const orders = useMemo(() => queryOrders(query), [query]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = orders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const columns: readonly TableColumn<PurchaseOrder>[] = [
    { key: 'type-resource', title: '类型与资源', sortable: true, sortValue: (order) => `${APPLICATION_TYPE_LABELS[order.applicationType]}-${order.productName}`, hideable: false, width: '22%', multiline: true, render: (order) => <div className="management-primary-cell"><Link to={orderDetailPath(order.id)}>{order.id}</Link><strong>{APPLICATION_TYPE_LABELS[order.applicationType]} · {resourceTypeLabel(order)}</strong><span>{order.productName} · 数量 {order.quantity}</span></div> },
    { key: 'spec', title: '配置与站点', width: '21%', multiline: true, render: (order) => <div className="management-primary-cell"><strong>{order.specificationSummary || order.productName}</strong><span>{order.site}</span></div> },
    { key: 'billing-amount', title: '计费与金额', sortable: true, sortValue: (order) => order.priceSnapshot.total.amountFen, width: '18%', multiline: true, render: (order) => <div className="management-primary-cell"><strong>{billingModeLabel(order.priceSnapshot.billingMode)} · {formatMoney(order.priceSnapshot.total)}</strong><span>{order.priceSnapshot.duration ? `${order.priceSnapshot.duration} 个月` : order.priceSnapshot.billingMode === 'pay-as-you-go' ? '按小时计费' : '当前申请'}</span></div> },
    { key: 'status-time', title: '状态与时间', sortable: true, sortValue: (order) => order.submittedAt, width: '15%', multiline: true, render: (order) => <div className="management-primary-cell"><StatusBadge tone={ORDER_STATUS_VIEWS[order.status].tone}>{ORDER_STATUS_VIEWS[order.status].label}</StatusBadge><span>{formatDate(order.submittedAt)}</span></div> },
    { key: 'resource', title: '关联对象', width: '14%', render: (order) => {
      const current = order.resourceId ? getResourceByAnyId(order.resourceId) : undefined;
      return resourcePath(order) ? <Link to={resourcePath(order)!}>{order.storageId ? order.resourceName : current?.name ?? order.resourceName ?? order.resourceId}</Link> : '等待资源准备';
    } },
  ];

  return (
    <div className="management-page">
      <DataTable
        className="management-table"
        aria-label="订单列表"
        eyebrow="资源配置申请"
        title="申请记录"
        description="追踪资源与存储的购买、扩容、续期和挂载申请。"
        actions={<><Button variant="primary" onClick={() => navigate(APP_PATHS.marketplace)}>购买资源</Button><Button onClick={() => navigate(APP_PATHS.storagePurchase)}>购买存储</Button></>}
        toolbar={(
          <div className="management-filter-grid management-filter-grid--orders">
            <SearchInput aria-label="搜索申请" value={query.search} placeholder="搜索申请编号或关联资源" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
            <Select aria-label="申请类型" value={query.applicationType} onValueChange={(value) => setParam('applicationType', value)} options={[{ value: 'all', label: '全部申请类型' }, ...Object.entries(APPLICATION_TYPE_LABELS).map(([value, label]) => ({ value, label }))]} />
            <Select aria-label="资源类型" value={query.resourceType} onValueChange={(value) => setParam('resourceType', value)} options={[{ value: 'all', label: '全部资源类型' }, { value: 'cloud-server', label: '云服务器' }, { value: 'physical-machine', label: '物理机' }, { value: 'storage', label: '存储空间' }]} />
            <Select aria-label="申请状态" value={query.status} onValueChange={(value) => setParam('status', value)} options={[{ value: 'all', label: '全部状态' }, ...Object.entries(ORDER_STATUS_VIEWS).map(([value, view]) => ({ value, label: view.label }))]} />
            <Select aria-label="站点" value={query.site} onValueChange={(value) => setParam('site', value)} options={[{ value: 'all', label: '全部站点' }, { value: '东部算力中心', label: '东部算力中心' }, { value: '西部算力中心', label: '西部算力中心' }]} />
            <Select aria-label="关联资源" value={query.related} onValueChange={(value) => setParam('related', value)} options={[{ value: 'all', label: '全部关联状态' }, { value: 'yes', label: '已关联资源' }, { value: 'no', label: '等待关联资源' }]} />
            <Input aria-label="提交日期起始" type="date" value={query.submittedAfter} onChange={(event) => setParam('after', event.target.value)} />
          </div>
        )}
        resultLabel={`共 ${orders.length} 个结果`}
        columns={columns}
        rows={rows}
        getRowKey={(order) => order.id}
        layout="fixed"
        minWidth="980px"
        actionsWidth="88px"
        empty={<PageState title={query.search ? '没有匹配的申请记录' : '暂无申请记录'} description={query.search ? '请调整搜索或筛选条件。' : '从资源商城提交配置后可在此查看处理进度。'} />}
        renderRowActions={(order) => <Link to={orderDetailPath(order.id)}>查看详情</Link>}
        pagination={orders.length > 0 ? <Pagination page={safePage} totalPages={totalPages} totalItems={orders.length} onPageChange={(next) => setParam('page', String(next))} /> : undefined}
      />
    </div>
  );
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const order = getOrder(orderId);

  if (!order) return <div className="management-page"><PageState title="未找到申请记录" description="该申请不存在或记录已移除。" actionLabel="返回申请列表" onAction={() => navigate(APP_PATHS.orders)} /></div>;
  const relatedPath = resourcePath(order);
  const currentResource = order.resourceId
    ? getResourceByAnyId(order.resourceId)
    : undefined;
  const operations = listOperationRecords().filter((record) => record.targetId === order.id || record.targetId === order.resourceId);
  const operationColumns: readonly TableColumn<PlatformOperationRecord>[] = [
    { key: 'action', title: '操作', render: (record) => record.action },
    { key: 'time', title: '时间', render: (record) => formatDate(record.createdAt) },
    { key: 'status', title: '状态', render: (record) => <StatusBadge tone={record.status === 'completed' ? 'success' : record.status === 'failed' ? 'error' : 'info'}>{record.status === 'completed' ? '已完成' : record.status === 'failed' ? '失败' : '处理中'}</StatusBadge> },
    { key: 'message', title: '结果说明', render: (record) => record.message, multiline: true },
  ];

  return (
    <div className="management-page">
      <Container className="management-detail-header">
        <TextButton onClick={() => navigate(APP_PATHS.orders)}>返回申请列表</TextButton>
        <div className="management-detail-header__main">
          <div><span>申请编号</span><h2>{order.id}</h2><p>{resourceTypeLabel(order)} · {order.site}</p></div>
          <StatusBadge tone={ORDER_STATUS_VIEWS[order.status].tone}>{ORDER_STATUS_VIEWS[order.status].label}</StatusBadge>
        </div>
      </Container>
      <div className="management-detail-grid">
        <Container as="section" className="management-detail-section">
          <h3>提交信息</h3>
          <dl className="management-definition-grid">
            <div><dt>申请编号</dt><dd>{order.id}</dd></div>
            <div><dt>申请人</dt><dd>{order.applicant}</dd></div>
            <div><dt>提交时间</dt><dd>{formatDate(order.submittedAt)}</dd></div>
            <div><dt>当前状态</dt><dd>{ORDER_STATUS_VIEWS[order.status].label}</dd></div>
            <div><dt>申请类型</dt><dd>{APPLICATION_TYPE_LABELS[order.applicationType]}</dd></div>
            <div><dt>资源类型</dt><dd>{resourceTypeLabel(order)}</dd></div>
            <div><dt>数量</dt><dd>{order.quantity}</dd></div>
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>关联资源</h3>
          {relatedPath ? (
            <div className="management-related-card">
              <strong>{order.storageId ? order.resourceName : currentResource?.name ?? order.resourceName ?? order.resourceId}</strong>
              <span>{order.storageId ?? order.resourceId}</span>
              {currentResource && <span>{currentResource.project} · {currentResource.tags.join(' · ') || '暂无标签'}</span>}
              <Link to={relatedPath}>{order.storageId ? '查看存储详情' : '查看资源详情'}</Link>
            </div>
          ) : <PageState title="等待资源准备" description="当前申请尚未关联可访问的计算资源。" />}
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>资源配置</h3>
          <dl className="management-definition-grid">
            {order.summary.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
            {order.expectedExpiresAt && <div><dt>预计到期时间</dt><dd>{formatDate(order.expectedExpiresAt)}</dd></div>}
            {order.configurationChanges && <div><dt>配置变化</dt><dd>{order.configurationChanges}</dd></div>}
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>价格快照</h3>
          <dl className="management-definition-grid">
            <div><dt>SKU</dt><dd>{order.priceSnapshot.skuId}</dd></div>
            <div><dt>计费模式</dt><dd>{billingModeLabel(order.priceSnapshot.billingMode)}</dd></div>
            <div><dt>数量</dt><dd>{order.priceSnapshot.quantity}</dd></div>
            <div><dt>周期</dt><dd>{order.priceSnapshot.duration ? `${order.priceSnapshot.duration} 个月` : '按实际用量'}</dd></div>
            <div><dt>总额</dt><dd>{formatMoney(order.priceSnapshot.total)}</dd></div>
            <div><dt>价格生成时间</dt><dd>{formatDate(order.priceSnapshot.generatedAt)}</dd></div>
          </dl>
          <PricingSummary value={order.priceSnapshot} title="费用明细" />
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>处理进度</h3>
          <ol className="management-timeline">{order.timeline.map((item) => <li key={`${item.label}-${item.time}`} data-status={item.status}><strong>{item.label}</strong><time>{formatDate(item.time)}</time><p>{item.description}</p></li>)}</ol>
        </Container>
        <Container as="section" className="management-detail-section management-detail-section--wide">
          <h3>操作记录</h3>
          <Table aria-label="申请操作记录" columns={operationColumns} rows={operations} getRowKey={(record) => record.id} />
        </Container>
      </div>
    </div>
  );
}

const MODULE_LABELS: Readonly<Record<OperationModule, string>> = {
  resource: '资源',
  storage: '存储',
  image: '镜像',
  software: '软件',
  network: '网络',
  order: '申请',
};

const OPERATION_LABELS: Readonly<Record<OperationStatus, string>> = {
  submitted: '已提交',
  processing: '处理中',
  completed: '已完成',
  failed: '失败',
};

export function OperationRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('q')?.toLocaleLowerCase() ?? '';
  const module = (searchParams.get('module') ?? 'all') as 'all' | OperationModule;
  const status = (searchParams.get('status') ?? 'all') as 'all' | OperationStatus;
  const after = searchParams.get('after') ?? '';
  const records = listOperationRecords().filter((record) => {
    if (search && ![record.action, record.targetId, record.targetName, record.message].join(' ').toLocaleLowerCase().includes(search)) return false;
    if (module !== 'all' && record.module !== module) return false;
    if (status !== 'all' && record.status !== status) return false;
    if (after && record.createdAt.slice(0, 10) < after) return false;
    return true;
  });
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  }
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const columns: readonly TableColumn<PlatformOperationRecord>[] = [
    { key: 'action', title: '操作类型', sortable: true, sortValue: (record) => record.action, hideable: false, render: (record) => <strong>{record.action}</strong> },
    { key: 'module', title: '模块', sortable: true, sortValue: (record) => MODULE_LABELS[record.module], render: (record) => MODULE_LABELS[record.module] },
    { key: 'target', title: '操作对象', render: (record) => {
      const current = getResourceByAnyId(record.targetId);
      return record.targetPath ? <Link to={record.targetPath}>{current?.name ?? record.targetName}</Link> : <div className="management-primary-cell"><span>{record.targetName}</span><span>{record.targetId}</span></div>;
    } },
    { key: 'actor', title: '操作人', sortable: true, sortValue: (record) => record.actor, render: (record) => record.actor },
    { key: 'time', title: '时间', sortable: true, sortValue: (record) => record.createdAt, render: (record) => formatDate(record.createdAt) },
    { key: 'status', title: '执行状态', sortable: true, sortValue: (record) => record.status, render: (record) => <StatusBadge tone={record.status === 'completed' ? 'success' : record.status === 'failed' ? 'error' : 'info'}>{OPERATION_LABELS[record.status]}</StatusBadge> },
    { key: 'message', title: '结果说明', render: (record) => record.message, multiline: true },
  ];
  return (
    <div className="management-page">
      <DataTable
        className="management-table"
        aria-label="操作记录列表"
        eyebrow="跨模块操作追踪"
        title="记录明细"
        description="快速定位失败、处理中和已完成的资源操作。"
        toolbar={(
          <div className="management-filter-grid management-filter-grid--four">
            <SearchInput aria-label="搜索操作记录" value={searchParams.get('q') ?? ''} placeholder="搜索操作、对象或结果" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
            <Select aria-label="操作模块" value={module} onValueChange={(value) => setParam('module', value)} options={[{ value: 'all', label: '全部模块' }, ...Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label }))]} />
            <Select aria-label="执行状态" value={status} onValueChange={(value) => setParam('status', value)} options={[{ value: 'all', label: '全部状态' }, ...Object.entries(OPERATION_LABELS).map(([value, label]) => ({ value, label }))]} />
            <Input aria-label="操作日期起始" type="date" value={after} onChange={(event) => setParam('after', event.target.value)} />
          </div>
        )}
        resultLabel={`共 ${records.length} 个结果`}
        columns={columns}
        rows={rows}
        getRowKey={(record) => record.id}
        empty={<PageState title={search ? '没有匹配的操作记录' : '暂无操作记录'} description={search ? '请调整搜索或筛选条件。' : '资源、存储、镜像、软件、网络和配置提交操作将在此汇总。'} />}
        pagination={records.length > 0 ? <Pagination page={safePage} totalPages={totalPages} totalItems={records.length} onPageChange={(next) => setParam('page', String(next))} /> : undefined}
      />
    </div>
  );
}
