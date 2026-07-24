import type { HTMLAttributes } from 'react';
import { getUsageState } from './usageThresholds';
import './usage-meter.css';

export type UsageMeterSize = 'mini' | 'standard' | 'large';
export type UsageMeterVariant = 'table' | 'overview' | 'sidebar';

export type UsageMeterProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
  Readonly<{
    used: number;
    total: number;
    unit?: string;
    label: string;
    size?: UsageMeterSize;
    variant?: UsageMeterVariant;
    showLegend?: boolean;
  }>;

export function UsageMeter({
  used,
  total,
  unit = 'GB',
  label,
  size = 'standard',
  variant,
  showLegend = true,
  className,
  ...rest
}: UsageMeterProps) {
  const safeTotal = Math.max(0, total);
  const safeUsed = Math.min(Math.max(0, used), safeTotal || used);
  const percent = safeTotal > 0 ? Math.round((safeUsed / safeTotal) * 100) : 0;
  const available = Math.max(0, safeTotal - safeUsed);
  const state = getUsageState(percent);
  const resolvedVariant = variant ?? (
    size === 'mini' ? 'table' : size === 'large' ? 'overview' : 'sidebar'
  );
  const formatter = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
  return (
    <div
      {...rest}
      className={['ui-usage-meter', className].filter(Boolean).join(' ')}
      data-version="2"
      data-tone={state.tone}
      data-size={size}
      data-variant={resolvedVariant}
    >
      <div className="ui-usage-meter__headline">
        <strong>{formatter.format(safeUsed)} / {formatter.format(safeTotal)} {unit}</strong>
        <span className="ui-usage-meter__state">{percent}% · {state.label}</span>
      </div>
      <div
        className="ui-usage-meter__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuenow={safeUsed}
        aria-valuetext={`已使用 ${safeUsed} ${unit}，共 ${safeTotal} ${unit}，${state.label}`}
      >
        <span className="ui-usage-meter__fill" style={{ width: `${percent}%` }} />
      </div>
      {showLegend && (
        <span className="ui-usage-meter__legend">剩余 {formatter.format(available)} {unit}</span>
      )}
    </div>
  );
}

export const CapacityBar = UsageMeter;
export const MiniProgress = UsageMeter;
export const MetricProgress = UsageMeter;
