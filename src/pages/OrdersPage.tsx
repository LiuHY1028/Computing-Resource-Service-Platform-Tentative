import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Container,
  DataTable,
  DropdownMenu,
  DropdownMenuItem,
  Input,
  PageState,
  Pagination,
  PromptModal,
  SearchInput,
  Select,
  StatusBadge,
  TextButton,
  type TableColumn,
} from '../components/ui';
import { useConsolePageHeader } from '../app/shell/PageHeaderContext';
import {
  APP_PATHS,
  billDetailPath,
  checkoutPath,
  orderDetailPath,
  resourceDetailPath,
  storageDetailPath,
} from '../app/routes';
import {
  cancelCommerceOrder,
  getOrder,
  queryOrders,
  ORDER_STATUS_VIEWS,
  ORDER_TYPE_LABELS,
  type CommerceOrder,
  type OrderProductType,
  type OrderStatus,
  type OrderType,
} from '../features/orders';
import { getBillForOrder } from '../features/bills';
import { getResourceByAnyId } from '../features/resources';
import { getStorageSpace } from '../features/storage';
import {
  listOperationRecords,
  OPERATION_STATUS_VIEWS,
  type OperationModule,
  type OperationStatus,
  type PlatformOperationRecord,
} from '../features/operations';
import { formatMoney, PricingSummary } from '../features/pricing';
import '../styles/management.css';

const PAGE_SIZE = 8;

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleString('zh-CN', { hour12: false })
    : '—';
}

function productTypeLabel(type: OrderProductType) {
  if (type === 'cloud-server') return '云服务器';
  if (type === 'physical-machine') return '物理机';
  if (type === 'storage') return '存储';
  return '软件';
}

function relatedPath(order: CommerceOrder) {
  if (!order.resourceId) return undefined;
  if (order.productType === 'storage') {
    return getStorageSpace(order.resourceId)
      ? storageDetailPath(order.resourceId)
      : undefined;
  }
  if (
    order.productType === 'cloud-server' ||
    order.productType === 'physical-machine'
  ) {
    return getResourceByAnyId(order.resourceId)
      ? resourceDetailPath(order.productType, order.resourceId)
      : undefined;
  }
  return undefined;
}

function billingModeLabel(mode: string) {
  if (mode === 'subscription') return '包月';
  if (mode === 'pay-as-you-go') return '按量';
  if (mode === 'monthly-rental') return '按月租用';
  if (mode === 'monthly-capacity') return '按容量计费';
  return mode;
}

export function OrderListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cancelTarget, setCancelTarget] = useState<CommerceOrder>();
  const pageHeader = useMemo(() => ({
    description: '查看新购、续费、续租、扩容、变配和软件购买交易。',
    actions: (
      <>
        <Button variant="primary" onClick={() => navigate(APP_PATHS.marketplace)}>
          购买资源
        </Button>
        <Button onClick={() => navigate(APP_PATHS.storagePurchase)}>
          购买存储
        </Button>
      </>
    ),
  }), [navigate]);
  useConsolePageHeader(pageHeader);

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const query = useMemo(() => ({
    search: searchParams.get('q') ?? '',
    productType: (searchParams.get('productType') ?? 'all') as
      | 'all'
      | OrderProductType,
    orderType: (searchParams.get('orderType') ?? 'all') as 'all' | OrderType,
    status: (searchParams.get('status') ?? 'all') as 'all' | OrderStatus,
    site: searchParams.get('site') ?? 'all',
    createdAfter: searchParams.get('after') ?? '',
    related: (searchParams.get('related') ?? 'all') as 'all' | 'yes' | 'no',
  }), [searchParams]);
  const orders = useMemo(() => queryOrders(query), [query]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(orders.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = orders.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const columns: readonly TableColumn<CommerceOrder>[] = [
    {
      key: 'order',
      title: '订单与类型',
      hideable: false,
      width: '22%',
      multiline: true,
      sortable: true,
      sortValue: (order) => order.createdAt,
      render: (order) => (
        <div className="management-primary-cell">
          <Link to={orderDetailPath(order.id)}>{order.id}</Link>
          <strong>{ORDER_TYPE_LABELS[order.orderType]} · {productTypeLabel(order.productType)}</strong>
          <span>{formatDate(order.createdAt)}</span>
        </div>
      ),
    },
    {
      key: 'product',
      title: '商品或资源',
      width: '22%',
      multiline: true,
      render: (order) => (
        <div className="management-primary-cell">
          <strong>{order.resourceName ?? order.productName}</strong>
          <span>{order.site} · 数量 {order.quantity}</span>
        </div>
      ),
    },
    {
      key: 'configuration',
      title: '配置摘要',
      width: '23%',
      multiline: true,
      render: (order) => (
        <div className="management-primary-cell">
          {order.configurationSummary.slice(0, 2).map((item) => (
            <span key={item.label}>{item.label}：{item.value}</span>
          ))}
        </div>
      ),
    },
    {
      key: 'amount',
      title: '金额',
      width: '15%',
      sortable: true,
      sortValue: (order) => order.pricingSnapshot.total.amountFen,
      multiline: true,
      render: (order) => (
        <div className="management-primary-cell">
          <strong>{formatMoney(order.pricingSnapshot.total)}</strong>
          <span>{billingModeLabel(order.billingMode)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: '主状态',
      width: '12%',
      sortable: true,
      sortValue: (order) => order.status,
      render: (order) => (
        <StatusBadge tone={ORDER_STATUS_VIEWS[order.status].tone}>
          {ORDER_STATUS_VIEWS[order.status].label}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="management-page">
      <DataTable
        className="management-table"
        aria-label="订单列表"
        eyebrow="交易订单"
        title="订单"
        description="订单只显示当前交易或履约阶段；支付与开通历史保留在详情时间线。"
        toolbar={(
          <div className="management-filter-grid management-filter-grid--orders">
            <SearchInput
              aria-label="搜索订单"
              value={query.search}
              placeholder="搜索订单编号、商品或资源"
              onChange={(event) => setParam('q', event.target.value)}
              clearable
              onClear={() => setParam('q', '')}
            />
            <Select
              aria-label="订单类型"
              value={query.orderType}
              onValueChange={(value) => setParam('orderType', value)}
              options={[
                { value: 'all', label: '全部订单类型' },
                ...Object.entries(ORDER_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              aria-label="商品类型"
              value={query.productType}
              onValueChange={(value) => setParam('productType', value)}
              options={[
                { value: 'all', label: '全部商品类型' },
                { value: 'cloud-server', label: '云服务器' },
                { value: 'physical-machine', label: '物理机' },
                { value: 'storage', label: '存储' },
                { value: 'software', label: '软件' },
              ]}
            />
            <Select
              aria-label="订单状态"
              value={query.status}
              onValueChange={(value) => setParam('status', value)}
              options={[
                { value: 'all', label: '全部状态' },
                ...Object.entries(ORDER_STATUS_VIEWS).map(([value, view]) => ({ value, label: view.label })),
              ]}
            />
            <Input
              aria-label="创建日期起始"
              type="date"
              value={query.createdAfter}
              onChange={(event) => setParam('after', event.target.value)}
            />
          </div>
        )}
        resultLabel={`共 ${orders.length} 个结果`}
        columns={columns}
        rows={rows}
        getRowKey={(order) => order.id}
        layout="fixed"
        minWidth="1050px"
        actionsWidth="92px"
        renderRowActions={(order) => (
          <DropdownMenu
            trigger="更多"
            aria-label={`${order.id} 更多操作`}
          >
            <DropdownMenuItem onSelect={() => navigate(orderDetailPath(order.id))}>
              查看订单
            </DropdownMenuItem>
            {(order.status === 'awaiting-payment' || order.status === 'payment-failed') && (
              <DropdownMenuItem onSelect={() => navigate(checkoutPath(order.id))}>
                去支付
              </DropdownMenuItem>
            )}
            {relatedPath(order) && (
              <DropdownMenuItem onSelect={() => navigate(relatedPath(order)!)}>
                查看资源
              </DropdownMenuItem>
            )}
            {(order.status === 'awaiting-payment' || order.status === 'payment-failed') && (
              <DropdownMenuItem danger onSelect={() => setCancelTarget(order)}>
                取消订单
              </DropdownMenuItem>
            )}
          </DropdownMenu>
        )}
        empty={(
          <PageState
            title={query.search ? '没有匹配的订单' : '暂无订单'}
            description={query.search ? '请调整搜索条件。' : '从资源商城或存储购买页创建订单。'}
          />
        )}
        pagination={orders.length ? (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={orders.length}
            onPageChange={(next) => setParam('page', String(next))}
          />
        ) : undefined}
      />
      <PromptModal
        open={Boolean(cancelTarget)}
        title="取消订单"
        description={`确认取消订单 ${cancelTarget?.id ?? ''}？关联待支付账单将同步取消，且不会创建或变更资源。`}
        variant="danger"
        confirmLabel="确认取消"
        cancelLabel="保留订单"
        onClose={() => setCancelTarget(undefined)}
        onConfirm={() => {
          if (cancelTarget) cancelCommerceOrder(cancelTarget.id);
          setCancelTarget(undefined);
          setSearchParams(new URLSearchParams(searchParams));
        }}
      />
    </div>
  );
}

export function OrderDetailPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const [, setRevision] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const order = getOrder(orderId);

  if (!order) {
    return (
      <div className="management-page">
        <PageState
          title="未找到订单"
          description="该订单不存在或记录已移除。"
          actionLabel="返回订单列表"
          onAction={() => navigate(APP_PATHS.orders)}
        />
      </div>
    );
  }
  const bill = getBillForOrder(order.id);
  const path = relatedPath(order);

  return (
    <div className="management-page">
      <Container className="management-detail-header">
        <TextButton onClick={() => navigate(APP_PATHS.orders)}>返回订单列表</TextButton>
        <div className="management-detail-header__main">
          <div>
            <span>订单编号</span>
            <h2>{order.id}</h2>
            <p>{ORDER_TYPE_LABELS[order.orderType]} · {productTypeLabel(order.productType)} · {order.site}</p>
          </div>
          <StatusBadge tone={ORDER_STATUS_VIEWS[order.status].tone}>
            {ORDER_STATUS_VIEWS[order.status].label}
          </StatusBadge>
        </div>
        <div className="management-detail-actions">
          {(order.status === 'awaiting-payment' || order.status === 'payment-failed') && (
            <>
              <Button variant="primary" onClick={() => navigate(checkoutPath(order.id))}>
                去支付
              </Button>
              <Button onClick={() => setCancelOpen(true)}>取消订单</Button>
            </>
          )}
          {path && <Button onClick={() => navigate(path)}>查看资源</Button>}
        </div>
      </Container>
      <div className="management-detail-grid">
        <Container as="section" className="management-detail-section">
          <h3>订单信息</h3>
          <dl className="management-definition-grid">
            <div><dt>订单类型</dt><dd>{ORDER_TYPE_LABELS[order.orderType]}</dd></div>
            <div><dt>商品类型</dt><dd>{productTypeLabel(order.productType)}</dd></div>
            <div><dt>商品或资源</dt><dd>{order.resourceName ?? order.productName}</dd></div>
            <div><dt>创建时间</dt><dd>{formatDate(order.createdAt)}</dd></div>
            <div><dt>计费模式</dt><dd>{billingModeLabel(order.billingMode)}</dd></div>
            <div><dt>数量</dt><dd>{order.quantity}</dd></div>
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>关联信息</h3>
          <dl className="management-definition-grid">
            <div><dt>关联账单</dt><dd>{bill ? <Link to={billDetailPath(bill.id)}>{bill.id}</Link> : '按账期出账'}</dd></div>
            <div><dt>关联资源</dt><dd>{path ? <Link to={path}>{order.resourceId}</Link> : '开通完成后关联'}</dd></div>
            <div><dt>支付时间</dt><dd>{formatDate(order.paidAt)}</dd></div>
            <div><dt>完成时间</dt><dd>{formatDate(order.completedAt)}</dd></div>
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>配置快照</h3>
          <dl className="management-definition-grid">
            {order.configurationSummary.map((item) => (
              <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>
            ))}
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>费用明细</h3>
          <PricingSummary value={order.pricingSnapshot} title="订单价格快照" />
        </Container>
        <Container as="section" className="management-detail-section management-detail-section--wide">
          <h3>订单时间线</h3>
          <ol className="management-timeline">
            {order.timeline.map((item) => (
              <li key={`${item.label}-${item.time}`} data-status={item.status}>
                <strong>{item.label}</strong>
                <time>{formatDate(item.time)}</time>
                <p>{item.description}</p>
              </li>
            ))}
          </ol>
        </Container>
      </div>
      <PromptModal
        open={cancelOpen}
        title="取消订单"
        description="关联待支付账单将同步取消，且不会创建或变更资源。"
        variant="danger"
        confirmLabel="确认取消"
        cancelLabel="保留订单"
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          cancelCommerceOrder(order.id);
          setCancelOpen(false);
          setRevision((value) => value + 1);
        }}
      />
    </div>
  );
}

const MODULE_LABELS: Readonly<Record<OperationModule, string>> = {
  resource: '资源',
  storage: '存储',
  image: '镜像',
  software: '软件',
  network: '网络',
  order: '订单',
  bill: '账单',
};

export function OperationRecordsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  useConsolePageHeader(useMemo(() => ({
    description: '跨模块追踪等待执行、执行中、已完成、失败和已取消的操作。',
  }), []));
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('q')?.toLocaleLowerCase() ?? '';
  const module = (searchParams.get('module') ?? 'all') as 'all' | OperationModule;
  const status = (searchParams.get('status') ?? 'all') as 'all' | OperationStatus;
  const resourceId = searchParams.get('resourceId') ?? '';
  const dateFrom = searchParams.get('from') ?? '';
  const dateTo = searchParams.get('to') ?? '';
  const records = listOperationRecords().filter((record) => {
    if (search && ![record.action, record.targetId, record.targetName, record.message].join(' ').toLocaleLowerCase().includes(search)) return false;
    if (module !== 'all' && record.module !== module) return false;
    if (status !== 'all' && record.status !== status) return false;
    if (resourceId && record.targetId !== resourceId) return false;
    if (dateFrom && record.createdAt.slice(0, 10) < dateFrom) return false;
    if (dateTo && record.createdAt.slice(0, 10) > dateTo) return false;
    return true;
  });
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  }
  const totalPages = Math.max(1, Math.ceil(records.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const columns: readonly TableColumn<PlatformOperationRecord>[] = [
    { key: 'action', title: '操作类型', hideable: false, render: (record) => <strong>{record.action}</strong> },
    { key: 'module', title: '模块', render: (record) => MODULE_LABELS[record.module] },
    { key: 'target', title: '操作对象', render: (record) => record.targetPath ? <Link to={record.targetPath}>{record.targetName}</Link> : record.targetName },
    { key: 'time', title: '时间', sortable: true, sortValue: (record) => record.createdAt, render: (record) => formatDate(record.createdAt) },
    {
      key: 'status',
      title: '主状态',
      render: (record) => (
        <StatusBadge tone={OPERATION_STATUS_VIEWS[record.status].tone}>
          {OPERATION_STATUS_VIEWS[record.status].label}
        </StatusBadge>
      ),
    },
    { key: 'message', title: '结果说明', multiline: true, render: (record) => record.message },
  ];
  return (
    <div className="management-page">
      <DataTable
        className="management-table"
        aria-label="操作记录列表"
        eyebrow="跨模块操作追踪"
        title="操作记录"
        description="免费运维操作在此追踪，不生成订单或账单。"
        toolbar={(
          <div className="management-filter-grid management-filter-grid--four">
            <SearchInput
              aria-label="搜索操作记录"
              value={searchParams.get('q') ?? ''}
              placeholder="搜索操作、对象或结果"
              onChange={(event) => setParam('q', event.target.value)}
              clearable
              onClear={() => setParam('q', '')}
            />
            <Select
              aria-label="操作模块"
              value={module}
              onValueChange={(value) => setParam('module', value)}
              options={[
                { value: 'all', label: '全部模块' },
                ...Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Input
              aria-label="开始日期"
              type="date"
              value={dateFrom}
              onChange={(event) => setParam('from', event.target.value)}
            />
            <Input
              aria-label="结束日期"
              type="date"
              value={dateTo}
              onChange={(event) => setParam('to', event.target.value)}
            />
            <Select
              aria-label="执行状态"
              value={status}
              onValueChange={(value) => setParam('status', value)}
              options={[
                { value: 'all', label: '全部状态' },
                ...Object.entries(OPERATION_STATUS_VIEWS).map(
                  ([value, view]) => ({ value, label: view.label }),
                ),
              ]}
            />
          </div>
        )}
        resultLabel={`共 ${records.length} 个结果`}
        columns={columns}
        rows={rows}
        getRowKey={(record) => record.id}
        empty={<PageState title="暂无操作记录" />}
        pagination={records.length ? (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={records.length}
            onPageChange={(next) => setParam('page', String(next))}
          />
        ) : undefined}
      />
    </div>
  );
}
