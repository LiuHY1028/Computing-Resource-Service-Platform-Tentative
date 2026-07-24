export const USAGE_THRESHOLDS = Object.freeze({
  elevated: 70,
  critical: 90,
});

export type UsageTone = 'normal' | 'warning' | 'critical';

export function getUsageState(percent: number): Readonly<{ tone: UsageTone; label: string }> {
  if (percent >= USAGE_THRESHOLDS.critical) return { tone: 'critical', label: '容量不足' };
  if (percent >= USAGE_THRESHOLDS.elevated) return { tone: 'warning', label: '使用率偏高' };
  return { tone: 'normal', label: '容量正常' };
}
