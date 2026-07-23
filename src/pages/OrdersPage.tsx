import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Container,
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
  getOrder,
  queryOrders,
  type OrderStatus,
  type PurchaseOrder,
} from '../features/orders';
import {
  listOperationRecords,
  type OperationModule,
  type OperationStatus,
  type PlatformOperationRecord,
} from '../features/operations';
import '../styles/management.css';

const PAGE_SIZE = 8;

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

const ORDER_STATUS: Readonly<Record<OrderStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' | 'error' }>> = {
  pending: { label: '待处理', tone: 'neutral' },
  preparing: { label: '资源准备中', tone: 'info' },
  delivered: { label: '已交付', tone: 'success' },
  cancelled: { label: '已取消', tone: 'warning' },
  failed: { label: '处理失败', tone: 'error' },
};

function resourcePath(order: PurchaseOrder) {
  if (!order.resourceId) return undefined;
  return `/resources/${order.resourceType === 'cloud-server' ? 'cloud-servers' : 'physical-machines'}/${order.resourceId}`;
}

export function OrderListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<readonly PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const query = useMemo(
    () => ({
      search: searchParams.get('q') ?? '',
      resourceType: (searchParams.get('resourceType') ?? 'all') as
        | 'all'
        | 'cloud-server'
        | 'physical-machine',
      status: (searchParams.get('status') ?? 'all') as 'all' | OrderStatus,
      site: searchParams.get('site') ?? 'all',
      submittedAfter: searchParams.get('after') ?? '',
      related: (searchParams.get('related') ?? 'all') as 'all' | 'yes' | 'no',
    }),
    [searchParams],
  );

  useEffect(() => {
    let active = true;
    queryOrders(query).then((next) => {
      if (!active) return;
      setOrders(next);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [query]);

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
    { key: 'id', title: '申请编号', render: (order) => <Link to={`/orders/${order.id}`}>{order.id}</Link> },
    { key: 'type', title: '资源类型', render: (order) => order.resourceType === 'cloud-server' ? '云服务器' : '物理机' },
    { key: 'spec', title: '规格摘要', render: (order) => order.specificationSummary || order.productName, multiline: true },
    { key: 'quantity', title: '数量', render: (order) => order.quantity },
    { key: 'site', title: '站点', render: (order) => order.site },
    { key: 'applicant', title: '责任人', render: (order) => order.applicant },
    { key: 'time', title: '提交时间', render: (order) => formatDate(order.submittedAt) },
    { key: 'status', title: '当前状态', render: (order) => <StatusBadge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</StatusBadge> },
    { key: 'resource', title: '关联资源', render: (order) => resourcePath(order) ? <Link to={resourcePath(order)!}>{order.resourceName ?? order.resourceId}</Link> : '等待资源准备' },
  ];

  return (
    <div className="management-page">
      <Container className="management-toolbar">
        <div className="management-filter-grid management-filter-grid--orders">
          <SearchInput aria-label="搜索申请" value={query.search} placeholder="搜索申请编号或关联资源" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
          <Select aria-label="资源类型" value={query.resourceType} onValueChange={(value) => setParam('resourceType', value)} options={[{ value: 'all', label: '全部资源类型' }, { value: 'cloud-server', label: '云服务器' }, { value: 'physical-machine', label: '物理机' }]} />
          <Select aria-label="申请状态" value={query.status} onValueChange={(value) => setParam('status', value)} options={[{ value: 'all', label: '全部状态' }, ...Object.entries(ORDER_STATUS).map(([value, view]) => ({ value, label: view.label }))]} />
          <Select aria-label="站点" value={query.site} onValueChange={(value) => setParam('site', value)} options={[{ value: 'all', label: '全部站点' }, { value: '东部算力中心', label: '东部算力中心' }, { value: '西部算力中心', label: '西部算力中心' }]} />
          <Select aria-label="关联资源" value={query.related} onValueChange={(value) => setParam('related', value)} options={[{ value: 'all', label: '全部关联状态' }, { value: 'yes', label: '已关联资源' }, { value: 'no', label: '等待关联资源' }]} />
          <Input aria-label="提交日期起始" type="date" value={query.submittedAfter} onChange={(event) => setParam('after', event.target.value)} />
        </div>
      </Container>
      <Container className="management-results">
        <div className="management-results__header"><div><span>资源配置申请</span><h2>申请记录</h2></div><p>{loading ? '正在读取申请' : `共 ${orders.length} 个结果`}</p></div>
        <Table className="management-table" aria-label="订单列表" columns={columns} rows={rows} getRowKey={(order) => order.id} loading={loading} empty={<PageState title={query.search ? '没有匹配的申请记录' : '暂无申请记录'} description={query.search ? '请调整搜索或筛选条件。' : '从资源商城提交配置后可在此查看处理进度。'} />} renderRowActions={(order) => <Link to={`/orders/${order.id}`}>查看详情</Link>} />
        {!loading && orders.length > 0 && <Pagination page={safePage} totalPages={totalPages} totalItems={orders.length} onPageChange={(next) => setParam('page', String(next))} />}
      </Container>
    </div>
  );
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<PurchaseOrder>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getOrder(orderId).then((next) => {
      if (!active) return;
      setOrder(next);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) return <div className="management-page"><PageState tone="loading" title="正在读取申请详情" /></div>;
  if (!order) return <div className="management-page"><PageState title="未找到申请记录" description="该申请不存在或记录已移除。" actionLabel="返回申请列表" onAction={() => navigate('/orders')} /></div>;
  const relatedPath = resourcePath(order);
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
        <TextButton onClick={() => navigate('/orders')}>返回申请列表</TextButton>
        <div className="management-detail-header__main">
          <div><span>申请编号</span><h2>{order.id}</h2><p>{order.resourceType === 'cloud-server' ? '云服务器' : '物理机'} · {order.site}</p></div>
          <StatusBadge tone={ORDER_STATUS[order.status].tone}>{ORDER_STATUS[order.status].label}</StatusBadge>
        </div>
      </Container>
      <div className="management-detail-grid">
        <Container as="section" className="management-detail-section">
          <h3>提交信息</h3>
          <dl className="management-definition-grid">
            <div><dt>申请编号</dt><dd>{order.id}</dd></div>
            <div><dt>申请人</dt><dd>{order.applicant}</dd></div>
            <div><dt>提交时间</dt><dd>{formatDate(order.submittedAt)}</dd></div>
            <div><dt>当前状态</dt><dd>{ORDER_STATUS[order.status].label}</dd></div>
            <div><dt>资源类型</dt><dd>{order.resourceType === 'cloud-server' ? '云服务器' : '物理机'}</dd></div>
            <div><dt>数量</dt><dd>{order.quantity}</dd></div>
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>关联资源</h3>
          {relatedPath ? <div className="management-related-card"><strong>{order.resourceName ?? order.resourceId}</strong><span>{order.resourceId}</span><Link to={relatedPath}>查看资源详情</Link></div> : <PageState title="等待资源准备" description="当前申请尚未关联可访问的计算资源。" />}
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>资源配置</h3>
          <dl className="management-definition-grid">{order.summary.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
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
    { key: 'action', title: '操作类型', render: (record) => record.action },
    { key: 'module', title: '模块', render: (record) => MODULE_LABELS[record.module] },
    { key: 'target', title: '操作对象', render: (record) => record.targetPath ? <Link to={record.targetPath}>{record.targetName}</Link> : <div className="management-primary-cell"><span>{record.targetName}</span><span>{record.targetId}</span></div> },
    { key: 'actor', title: '操作人', render: (record) => record.actor },
    { key: 'time', title: '时间', render: (record) => formatDate(record.createdAt) },
    { key: 'status', title: '执行状态', render: (record) => <StatusBadge tone={record.status === 'completed' ? 'success' : record.status === 'failed' ? 'error' : 'info'}>{OPERATION_LABELS[record.status]}</StatusBadge> },
    { key: 'message', title: '结果说明', render: (record) => record.message, multiline: true },
  ];
  return (
    <div className="management-page">
      <Container className="management-toolbar">
        <div className="management-filter-grid management-filter-grid--four">
          <SearchInput aria-label="搜索操作记录" value={searchParams.get('q') ?? ''} placeholder="搜索操作、对象或结果" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
          <Select aria-label="操作模块" value={module} onValueChange={(value) => setParam('module', value)} options={[{ value: 'all', label: '全部模块' }, ...Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label }))]} />
          <Select aria-label="执行状态" value={status} onValueChange={(value) => setParam('status', value)} options={[{ value: 'all', label: '全部状态' }, ...Object.entries(OPERATION_LABELS).map(([value, label]) => ({ value, label }))]} />
          <Input aria-label="操作日期起始" type="date" value={after} onChange={(event) => setParam('after', event.target.value)} />
        </div>
      </Container>
      <Container className="management-results">
        <div className="management-results__header"><div><span>跨模块操作追踪</span><h2>操作记录</h2></div><p>共 {records.length} 个结果</p></div>
        <Table className="management-table" aria-label="操作记录列表" columns={columns} rows={rows} getRowKey={(record) => record.id} empty={<PageState title={search ? '没有匹配的操作记录' : '暂无操作记录'} description={search ? '请调整搜索或筛选条件。' : '资源、存储、镜像、软件、网络和配置提交操作将在此汇总。'} />} />
        {records.length > 0 && <Pagination page={safePage} totalPages={totalPages} totalItems={records.length} onPageChange={(next) => setParam('page', String(next))} />}
      </Container>
    </div>
  );
}
