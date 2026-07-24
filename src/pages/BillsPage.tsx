import { useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Container,
  DataTable,
  PageState,
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
} from '../app/routes';
import {
  BILL_STATUS_VIEWS,
  BILL_PAYMENT_METHOD_LABELS,
  BILL_TYPE_LABELS,
  getBill,
  queryBills,
  type Bill,
  type BillStatus,
  type BillType,
} from '../features/bills';
import { getOrder } from '../features/orders';
import { formatMoney } from '../features/pricing';
import '../styles/management.css';

function formatDate(value?: string) {
  return value
    ? new Date(value).toLocaleString('zh-CN', { hour12: false })
    : '—';
}

export function BillListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  useConsolePageHeader(useMemo(() => ({
    description: '查看订单产生的预付费、后付费、续费、调整和退款账单。',
  }), []));
  const query = useMemo(() => ({
    search: searchParams.get('q') ?? '',
    billType: (searchParams.get('type') ?? 'all') as 'all' | BillType,
    status: (searchParams.get('status') ?? 'all') as 'all' | BillStatus,
  }), [searchParams]);
  const bills = useMemo(() => queryBills(query), [query]);
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  }
  const columns: readonly TableColumn<Bill>[] = [
    {
      key: 'bill',
      title: '账单编号',
      hideable: false,
      render: (bill) => <Link to={billDetailPath(bill.id)}>{bill.id}</Link>,
    },
    {
      key: 'order',
      title: '关联订单',
      render: (bill) => <Link to={orderDetailPath(bill.orderId)}>{bill.orderId}</Link>,
    },
    {
      key: 'type',
      title: '账单类型',
      render: (bill) => BILL_TYPE_LABELS[bill.billType],
    },
    {
      key: 'product',
      title: '资源或商品',
      multiline: true,
      render: (bill) => (
        <div className="management-primary-cell">
          <strong>{bill.productName}</strong>
          <span>{bill.billingPeriod ? `${formatDate(bill.billingPeriod.startAt)} 至 ${formatDate(bill.billingPeriod.endAt)}` : '当前交易周期'}</span>
        </div>
      ),
    },
    {
      key: 'amount',
      title: '金额',
      sortable: true,
      sortValue: (bill) => bill.amount.amountFen,
      render: (bill) => <strong>{formatMoney(bill.amount)}</strong>,
    },
    {
      key: 'time',
      title: '出账与到期',
      multiline: true,
      render: (bill) => (
        <div className="management-primary-cell">
          <span>出账：{formatDate(bill.issuedAt)}</span>
          <span>到期：{formatDate(bill.dueAt)}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: '主状态',
      render: (bill) => (
        <StatusBadge tone={BILL_STATUS_VIEWS[bill.status].tone}>
          {BILL_STATUS_VIEWS[bill.status].label}
        </StatusBadge>
      ),
    },
  ];
  return (
    <div className="management-page">
      <DataTable
        className="management-table"
        aria-label="账单列表"
        eyebrow="费用与支付"
        title="账单"
        description="账单记录应收、支付和账期，订单负责交易与履约。"
        toolbar={(
          <div className="management-filter-grid management-filter-grid--four">
            <SearchInput
              aria-label="搜索账单"
              value={query.search}
              placeholder="搜索账单、订单或商品"
              onChange={(event) => setParam('q', event.target.value)}
              clearable
              onClear={() => setParam('q', '')}
            />
            <Select
              aria-label="账单类型"
              value={query.billType}
              onValueChange={(value) => setParam('type', value)}
              options={[
                { value: 'all', label: '全部账单类型' },
                ...Object.entries(BILL_TYPE_LABELS).map(([value, label]) => ({ value, label })),
              ]}
            />
            <Select
              aria-label="账单状态"
              value={query.status}
              onValueChange={(value) => setParam('status', value)}
              options={[
                { value: 'all', label: '全部状态' },
                ...Object.entries(BILL_STATUS_VIEWS).map(([value, view]) => ({ value, label: view.label })),
              ]}
            />
          </div>
        )}
        resultLabel={`共 ${bills.length} 个结果`}
        columns={columns}
        rows={bills}
        getRowKey={(bill) => bill.id}
        minWidth="1100px"
        empty={<PageState title="暂无账单" description="交易账单与按量周期账单将在此展示。" />}
        renderRowActions={(bill) => (
          <Link to={billDetailPath(bill.id)}>查看账单</Link>
        )}
      />
    </div>
  );
}

export function BillDetailPage() {
  const { billId = '' } = useParams();
  const navigate = useNavigate();
  const bill = getBill(billId);
  if (!bill) {
    return (
      <div className="management-page">
        <PageState
          title="未找到账单"
          description="该账单不存在或记录已移除。"
          actionLabel="返回账单列表"
          onAction={() => navigate(APP_PATHS.bills)}
        />
      </div>
    );
  }
  const order = getOrder(bill.orderId);
  return (
    <div className="management-page">
      <Container className="management-detail-header">
        <TextButton onClick={() => navigate(APP_PATHS.bills)}>返回账单列表</TextButton>
        <div className="management-detail-header__main">
          <div>
            <span>账单编号</span>
            <h2>{bill.id}</h2>
            <p>{BILL_TYPE_LABELS[bill.billType]} · {bill.productName}</p>
          </div>
          <StatusBadge tone={BILL_STATUS_VIEWS[bill.status].tone}>
            {BILL_STATUS_VIEWS[bill.status].label}
          </StatusBadge>
        </div>
      </Container>
      <div className="management-detail-grid">
        <Container as="section" className="management-detail-section">
          <h3>账单金额</h3>
          <dl className="management-definition-grid">
            <div><dt>应付金额</dt><dd><strong>{formatMoney(bill.amount)}</strong></dd></div>
            <div><dt>账单类型</dt><dd>{BILL_TYPE_LABELS[bill.billType]}</dd></div>
            <div><dt>出账时间</dt><dd>{formatDate(bill.issuedAt)}</dd></div>
            <div><dt>到期时间</dt><dd>{formatDate(bill.dueAt)}</dd></div>
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>关联信息</h3>
          <dl className="management-definition-grid">
            <div><dt>关联订单</dt><dd><Link to={orderDetailPath(bill.orderId)}>{bill.orderId}</Link></dd></div>
            <div><dt>关联资源</dt><dd>{bill.resourceId ?? order?.resourceId ?? '开通完成后关联'}</dd></div>
            <div><dt>支付时间</dt><dd>{formatDate(bill.paidAt)}</dd></div>
            <div>
              <dt>支付记录</dt>
              <dd>
                {bill.paidAt
                  ? bill.paymentMethod
                    ? `${BILL_PAYMENT_METHOD_LABELS[bill.paymentMethod]} · 应用内付款已确认`
                    : '应用内付款已确认'
                  : '暂无付款记录'}
              </dd>
            </div>
          </dl>
        </Container>
        <Container as="section" className="management-detail-section management-detail-section--wide">
          <h3>费用明细</h3>
          <dl className="management-definition-grid">
            {bill.lineItems.map((item) => (
              <div key={item.id}>
                <dt>{item.label}</dt>
                <dd>{item.quantity} × {formatMoney(item.unitPrice)} = {formatMoney(item.amount)}</dd>
              </div>
            ))}
          </dl>
        </Container>
        {bill.status === 'unpaid' && order && (
          <Container as="section" className="management-detail-section management-detail-section--wide">
            <h3>支付账单</h3>
            <p>完成支付后，订单将进入开通流程。</p>
            <Link to={checkoutPath(order.id)}>前往收银台</Link>
          </Container>
        )}
      </div>
    </div>
  );
}
