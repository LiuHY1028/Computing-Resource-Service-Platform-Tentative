import { Modal } from '../../../components/ui';
import type { PurchaseSummaryItem } from '../types';

type ConfirmationModalProps = Readonly<{
  open: boolean;
  resourceLabel: string;
  productName: string;
  items: readonly PurchaseSummaryItem[];
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}>;

export function ConfirmationModal({
  open,
  resourceLabel,
  productName,
  items,
  submitting,
  onClose,
  onSubmit,
}: ConfirmationModalProps) {
  return (
    <Modal
      open={open}
      title="确认配置"
      onClose={onClose}
      busy={submitting}
      primaryAction={{ label: '提交配置', onClick: onSubmit }}
      secondaryAction={{ label: '返回修改', onClick: onClose }}
    >
      <div className="purchase-confirmation">
        <div className="purchase-confirmation__heading">
          <span>{resourceLabel}</span>
          <strong>{productName}</strong>
          <p>请核对下列配置，提交后将进入处理流程。</p>
        </div>
        <dl className="purchase-confirmation__list">
          {items.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
        <p aria-live="polite">{submitting ? '正在提交配置，请勿重复操作。' : ''}</p>
      </div>
    </Modal>
  );
}
