import {
  Button,
  Container,
  StatusBadge,
  TextButton,
} from '../../../components/ui';
import type { PurchaseSubmissionResult } from '../types';
import { PricingSummary } from '../../pricing';

type PurchaseSuccessStateProps = Readonly<{
  result: PurchaseSubmissionResult;
  onReturn: () => void;
  onViewOrder: (orderId: string) => void;
  onPay: (orderId: string) => void;
}>;

export function PurchaseSuccessState({
  result,
  onReturn,
  onViewOrder,
  onPay,
}: PurchaseSuccessStateProps) {
  const pendingPayment = result.orderStatus === 'awaiting-payment';
  return (
    <section
      className="purchase-page purchase-success-page"
      data-resource-type={result.resourceType}
      aria-label={pendingPayment ? '订单已创建' : '资源已开通'}
    >
      <Container
        as="section"
        className="purchase-success"
        variant="success"
        aria-labelledby="purchase-success-title"
      >
        <StatusBadge tone="success">
          {pendingPayment ? '订单已创建' : '开通完成'}
        </StatusBadge>
        <span className="purchase-success__eyebrow">
          {pendingPayment ? '订单创建成功' : '开通完成'}
        </span>
        <h2 id="purchase-success-title">
          {pendingPayment ? '订单已创建，请完成支付' : '资源已开通'}
        </h2>
        <p>订单编号 <strong>{result.orderId}</strong></p>
        <div className="purchase-success__identity">
          <span>
            {result.resourceType === 'cloud-server' ? '云服务器' : '物理机'}
          </span>
          <strong>{result.productName}</strong>
        </div>
        <details className="purchase-success__details">
          <summary>查看配置摘要</summary>
          <dl>
            {result.summary.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </details>
        <PricingSummary value={result.priceSnapshot} title="订单费用快照" />
        <div className="purchase-processing-status" role="status">
          <span>当前进度</span>
          <strong>{pendingPayment ? '待支付' : '已完成'}</strong>
          <p>
            {pendingPayment
              ? '支付完成后将执行资源开通。'
              : '按量费用将根据账期进入账单。'}
          </p>
        </div>
        <div className="purchase-success__actions">
          {pendingPayment && (
            <Button variant="primary" onClick={() => onPay(result.orderId)}>
              去支付
            </Button>
          )}
          <Button
            variant={pendingPayment ? 'secondary' : 'primary'}
            onClick={() => onViewOrder(result.orderId)}
          >
            查看订单
          </Button>
          <Button variant="secondary" onClick={onReturn}>继续购买</Button>
          <TextButton
            onClick={() =>
              document
                .querySelector<HTMLDetailsElement>('.purchase-success__details')
                ?.setAttribute('open', '')}
          >
            查看配置摘要
          </TextButton>
        </div>
      </Container>
    </section>
  );
}
