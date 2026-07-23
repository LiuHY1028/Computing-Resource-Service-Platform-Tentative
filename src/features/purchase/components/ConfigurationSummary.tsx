import { Button, Container, TextButton } from '../../../components/ui';
import type { PurchaseSummaryItem } from '../types';

type ConfigurationSummaryProps = Readonly<{
  title: string;
  items: readonly PurchaseSummaryItem[];
  missingItems: readonly string[];
  dirty: boolean;
  onConfirm: () => void;
  onReturn: () => void;
  onClearDraft: () => void;
}>;

const PRODUCT_SUMMARY_LABELS = new Set([
  '商品名称',
  '整机规格',
  '站点',
  'CPU',
  '内存',
  'GPU',
  '数量',
]);

export function ConfigurationSummary({
  title,
  items,
  missingItems,
  dirty,
  onConfirm,
  onReturn,
  onClearDraft,
}: ConfigurationSummaryProps) {
  const complete = missingItems.length === 0;
  const productItems = items.filter((item) => PRODUCT_SUMMARY_LABELS.has(item.label));
  const configurationItems = items.filter(
    (item) => item.label !== '资源类型' && !PRODUCT_SUMMARY_LABELS.has(item.label),
  );
  return (
    <Container as="aside" className="purchase-summary" aria-labelledby="purchase-summary-title">
      <div className="purchase-summary__header">
        <div>
          <span>实时配置摘要</span>
          <h3 id="purchase-summary-title">{title}</h3>
        </div>
        <span className="purchase-draft-status" data-dirty={dirty}>
          {dirty ? '未保存草稿' : '草稿已同步'}
        </span>
      </div>
      <section className="purchase-summary__group" aria-labelledby="purchase-product-summary-title">
        <h4 id="purchase-product-summary-title">商品摘要</h4>
        <dl className="purchase-summary__product-grid">
          {productItems.map((item) => (
            <div key={item.label} data-pending={item.pending || undefined}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="purchase-summary__group" aria-labelledby="purchase-configuration-summary-title">
        <h4 id="purchase-configuration-summary-title">配置摘要</h4>
        <dl className="purchase-summary__configuration-list">
          {configurationItems.map((item) => (
            <div key={item.label} data-pending={item.pending || undefined}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className="purchase-summary__validation" data-complete={complete} role="status">
        <strong>{complete ? '必填项已完成' : `还有 ${missingItems.length} 项必填项待完成`}</strong>
        {!complete && <span>{missingItems.join('、')}</span>}
      </div>
      <div className="purchase-summary__actions">
        <Button variant="primary" onClick={onConfirm}>确认配置</Button>
        <Button variant="secondary" onClick={onReturn}>返回资源商城</Button>
        <TextButton onClick={onClearDraft}>清除当前草稿</TextButton>
      </div>
    </Container>
  );
}
