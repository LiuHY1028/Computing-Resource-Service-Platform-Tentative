import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  CardRadio,
  Container,
  PageState,
  PromptModal,
  RadioGroup,
  StatusBadge,
} from '../components/ui';
import {
  APP_PATHS,
  billDetailPath,
  orderDetailPath,
  resourceDetailPath,
  storageDetailPath,
} from '../app/routes';
import {
  cancelCommerceOrder,
  getOrder,
  ORDER_STATUS_VIEWS,
} from '../features/orders';
import { getBillForOrder } from '../features/bills';
import {
  payAndFulfillOrder,
  type PaymentMethod,
} from '../features/commerce';
import { formatMoney, PricingSummary } from '../features/pricing';
import '../styles/checkout.css';

export function CheckoutPage() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('account-balance');
  const [busy, setBusy] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  void revision;
  const order = getOrder(orderId);
  const bill = order ? getBillForOrder(order.id) : undefined;

  if (!order || !bill) {
    return (
      <div className="checkout-page">
        <PageState
          title="无法进入收银台"
          description="订单或待支付账单不存在。"
          actionLabel="返回订单列表"
          onAction={() => navigate(APP_PATHS.orders)}
        />
      </div>
    );
  }

  const payable =
    order.status === 'awaiting-payment' || order.status === 'payment-failed';
  const activeOrder = order;
  const completed = order.status === 'completed';
  const resourcePath = order.resourceId
    ? order.productType === 'storage'
      ? storageDetailPath(order.resourceId)
      : order.productType === 'cloud-server' ||
          order.productType === 'physical-machine'
        ? resourceDetailPath(order.productType, order.resourceId)
        : undefined
    : undefined;

  async function pay() {
    if (!payable || busy) return;
    setBusy(true);
    setPaymentError('');
    try {
      await payAndFulfillOrder(activeOrder.id, paymentMethod);
      setRevision((value) => value + 1);
    } catch (nextError) {
      setPaymentError(
        nextError instanceof Error ? nextError.message : '付款未完成，请重试。',
      );
    } finally {
      setBusy(false);
    }
  }

  if (completed) {
    return (
      <div className="checkout-page">
        <Container as="section" className="checkout-result" variant="success">
          <StatusBadge tone="success">开通完成</StatusBadge>
          <h2>资源已开通</h2>
          <p>订单 {order.id} 已完成，关联账单已支付。</p>
          <div className="checkout-result__actions">
            {resourcePath && <Link to={resourcePath}>查看资源</Link>}
            <Link to={orderDetailPath(order.id)}>查看订单</Link>
            <Link to={APP_PATHS.marketplace}>继续购买</Link>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <div>
          <span>SECURE CHECKOUT</span>
          <h2>核对订单与付款</h2>
          <p>核对订单与费用后选择支付方式。</p>
        </div>
        <StatusBadge tone={ORDER_STATUS_VIEWS[order.status].tone}>
          {ORDER_STATUS_VIEWS[order.status].label}
        </StatusBadge>
      </header>
      <nav className="checkout-progress" aria-label="购买进度">
        <ol>
          <li data-complete="true">配置</li>
          <li data-complete="true">确认订单</li>
          <li aria-current="step">支付</li>
        </ol>
      </nav>
      <div className="checkout-workspace">
        <div className="checkout-main">
          <Container as="section" className="checkout-section">
            <div className="checkout-section__heading">
              <div><span>订单信息</span><h2>{order.productName}</h2></div>
              <Link to={orderDetailPath(order.id)}>查看订单</Link>
            </div>
            <dl className="checkout-definition">
              <div><dt>订单编号</dt><dd>{order.id}</dd></div>
              <div><dt>商品与数量</dt><dd>{order.productName} × {order.quantity}</dd></div>
              <div><dt>站点</dt><dd>{order.site}</dd></div>
              <div><dt>账单编号</dt><dd><Link to={billDetailPath(bill.id)}>{bill.id}</Link></dd></div>
            </dl>
          </Container>
          <Container as="section" className="checkout-section">
            <div className="checkout-section__heading">
              <div><span>PAYMENT METHOD</span><h2>支付方式</h2></div>
            </div>
            <RadioGroup
              className="checkout-payment-methods"
              aria-label="支付方式"
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <CardRadio value="account-balance" title="账户余额" description="使用当前账户可用余额完成支付" />
              <CardRadio value="enterprise-account" title="企业付款账户" description="使用已配置的企业付款账户" />
              <CardRadio value="online-payment" title="在线支付" description="通过已支持的在线支付渠道完成付款" />
            </RadioGroup>
          </Container>
        </div>
        <Container as="aside" className="checkout-summary">
          <span>应付金额</span>
          <strong>{formatMoney(bill.amount)}</strong>
          <PricingSummary value={order.pricingSnapshot} title="费用明细" />
          {(paymentError || order.status === 'payment-failed') && (
            <p className="checkout-summary__error" role="alert">
              {paymentError || '付款未完成，请核对支付方式后重试。'}
            </p>
          )}
          <Button variant="primary" disabled={!payable || busy} onClick={() => void pay()}>
            {busy
              ? '支付处理中'
              : order.status === 'payment-failed'
                ? '重新支付'
                : '确认支付'}
          </Button>
          <Button disabled={!payable || busy} onClick={() => setCancelOpen(true)}>
            取消订单
          </Button>
          <p>支付完成后，订单将进入资源开通或变更流程。</p>
        </Container>
      </div>
      <PromptModal
        open={cancelOpen}
        title="取消订单"
        description="订单与关联账单将同步取消，且不会创建或变更资源。"
        variant="danger"
        confirmLabel="确认取消"
        cancelLabel="继续支付"
        onClose={() => setCancelOpen(false)}
        onConfirm={() => {
          cancelCommerceOrder(order.id);
          navigate(orderDetailPath(order.id));
        }}
      />
    </div>
  );
}
