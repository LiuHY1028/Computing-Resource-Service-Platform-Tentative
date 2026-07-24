import { formatMoney } from './formatMoney';
import type { PriceQuote, PriceSnapshot } from './types';
import './pricing.css';

function lineUnit(
  item: PriceQuote['lineItems'][number],
) {
  if (item.included) return item.unitLabel ?? '已包含';
  const suffix = item.unitLabel ? `/${item.unitLabel}` : '';
  return `${formatMoney(item.unitPrice)}${suffix}`;
}

export function PricingSummary({
  value,
  title = '费用明细',
}: Readonly<{
  value: PriceQuote | PriceSnapshot;
  title?: string;
}>) {
  const hourly = value.billingMode === 'pay-as-you-go';
  return (
    <section className="pricing-summary" aria-label={title}>
      <div className="pricing-summary__heading">
        <strong>{title}</strong>
        <span>
          {hourly
            ? '按当前小时单价估算'
            : value.duration
              ? `${value.duration} 个月`
              : '当前费用'}
        </span>
      </div>
      <dl className="pricing-summary__lines">
        {value.lineItems.map((item) => (
          <div key={item.id}>
            <dt>
              <strong>{item.label}</strong>
              <span>
                {lineUnit(item)}
                {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                {item.duration && item.duration > 1 ? ` × ${item.duration} 个月` : ''}
              </span>
            </dt>
            <dd>{item.included ? item.unitLabel ?? '已包含' : formatMoney(item.amount, { forceDecimals: hourly })}</dd>
          </div>
        ))}
      </dl>
      <div className="pricing-summary__total">
        <span>{hourly ? '预计每小时费用' : '预计总费用'}</span>
        <strong>{formatMoney(value.total, { forceDecimals: hourly })}</strong>
      </div>
    </section>
  );
}
