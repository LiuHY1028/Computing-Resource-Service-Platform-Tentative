import type { Money, PricePolicy } from './types';

export function formatMoney(
  money: Money,
  options: Readonly<{ forceDecimals?: boolean }> = {},
) {
  const whole = Math.floor(money.amountFen / 100);
  const fraction = money.amountFen % 100;
  const decimal =
    options.forceDecimals || fraction
      ? `.${String(fraction).padStart(2, '0')}`
      : '';
  return `¥${whole.toLocaleString('zh-CN')}${decimal}`;
}

export function formatMonthlyPrice(money: Money) {
  return `${formatMoney(money)}/月`;
}

export function formatHourlyPrice(money: Money) {
  return `${formatMoney(money, { forceDecimals: true })}/小时`;
}

export function pricePolicyLabel(policy: PricePolicy, monthlyPrice?: Money) {
  if (policy === 'free') return '免费';
  if (policy === 'included') return '包含在资源费用中';
  if (policy === 'requires-license') return '需授权';
  return monthlyPrice ? formatMonthlyPrice(monthlyPrice) : '按月收费';
}
