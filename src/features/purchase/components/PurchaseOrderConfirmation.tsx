import { Button, Container } from '../../../components/ui';
import { PricingSummary, formatMoney, type PriceQuote } from '../../pricing';
import type { PurchaseSummaryItem } from '../types';
import { PurchaseStepper } from './PurchaseStepper';

export type PurchaseOrderConfirmationProps = Readonly<{
  resourceLabel: string;
  productName: string;
  items: readonly PurchaseSummaryItem[];
  quote: PriceQuote;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}>;

export function PurchaseOrderConfirmation({
  resourceLabel,
  productName,
  items,
  quote,
  submitting,
  onBack,
  onSubmit,
}: PurchaseOrderConfirmationProps) {
  return (
    <section className="purchase-confirmation-page">
      <PurchaseStepper
        currentStep="confirmation"
        onStepChange={(step) => step === 'configuration' && onBack()}
      />
      <div className="purchase-confirmation-page__workspace">
        <Container as="section" className="purchase-confirmation-page__main">
          <header>
            <span>{resourceLabel}</span>
            <h1>确认订单</h1>
            <p>请核对商品配置与费用。创建订单后，配置和价格快照将保持不变。</p>
          </header>
          <section>
            <h2>商品信息</h2>
            <dl className="purchase-confirmation__list">
              <div>
                <dt>商品</dt>
                <dd>{productName}</dd>
              </div>
              {items.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section className="purchase-confirmation-page__notice">
            <h2>交易说明</h2>
            <ul>
              <li>预付费订单创建后进入收银台，付款完成后开始履约。</li>
              <li>按量资源确认开通后直接进入履约，并按账期生成账单。</li>
              <li>如需修改已创建的待支付订单，请先取消订单并重新配置。</li>
            </ul>
          </section>
        </Container>
        <Container as="aside" className="purchase-confirmation-page__quote">
          <PricingSummary value={quote} title="费用明细" />
          <div className="purchase-confirmation-page__total">
            <span>{quote.billingMode === 'pay-as-you-go' ? '预计费用' : '应付金额'}</span>
            <strong>{formatMoney(quote.total)}</strong>
          </div>
          <Button variant="primary" disabled={submitting} onClick={onSubmit}>
            {submitting
              ? '正在创建订单'
              : quote.billingMode === 'pay-as-you-go'
                ? '确认开通'
                : '创建订单并支付'}
          </Button>
          <Button disabled={submitting} onClick={onBack}>返回修改</Button>
        </Container>
      </div>
    </section>
  );
}
