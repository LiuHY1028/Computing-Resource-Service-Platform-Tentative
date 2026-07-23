import type { HTMLAttributes } from 'react';
import './progress.css';

export type ProgressTone = 'normal' | 'warning' | 'critical';

export type ProgressProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> &
  Readonly<{
    value: number;
    max?: number;
    label: string;
    tone?: ProgressTone;
    showValue?: boolean;
  }>;

export function Progress({
  value,
  max = 100,
  label,
  tone = 'normal',
  showValue = true,
  className,
  ...rest
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((safeValue / safeMax) * 100);
  return (
    <div
      {...rest}
      className={['ui-progress', className].filter(Boolean).join(' ')}
      data-tone={tone}
    >
      <div className="ui-progress__meta">
        <span>{label}</span>
        {showValue && <strong>{percent}%</strong>}
      </div>
      <div
        className="ui-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
        aria-valuetext={`${percent}%`}
      >
        <span className="ui-progress__fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
