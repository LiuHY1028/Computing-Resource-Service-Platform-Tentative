import { Modal } from '../../../components/ui';
import type { PurchaseSummaryItem } from '../types';
import { PricingSummary, type PriceQuote } from '../../pricing';

type ConfirmationModalProps = Readonly<{
  open: boolean;
  resourceLabel: string;
  productName: string;
  items: readonly PurchaseSummaryItem[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  quote: PriceQuote;
}>;

export function ConfirmationModal({
  open,
  resourceLabel,
  productName,
  items,
  submitting,
  onClose,
  onSubmit,
  quote,
}: ConfirmationModalProps) {
  return (
    <Modal
      open={open}
      title="确认订单"
      onClose={onClose}
      busy={submitting}
      primaryAction={{
        label: quote.billingMode === 'pay-as-you-go'
          ? '确认开通'
          : '创建订单并支付',
        onClick: onSubmit,
      }}
      secondaryAction={{ label: '返回修改', onClick: onClose }}
    >
      <div className="purchase-confirmation">
        <div className="purchase-confirmation__heading">
          <span>{resourceLabel}</span>
          <strong>{productName}</strong>
          <p>请核对商品配置与费用，创建后价格快照将保留在订单中。</p>
        </div>
        <dl className="purchase-confirmation__list">
          {items.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <PricingSummary value={quote} title="预计费用" />
        <p aria-live="polite">{submitting ? '正在创建订单，请勿重复操作。' : ''}</p>
      </div>
    </Modal>
  );
}
