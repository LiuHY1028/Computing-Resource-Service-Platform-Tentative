import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { UsageMeter, getUsageState } from '../index';

describe('UsageMeter', () => {
  it('shows total, used, remaining, percentage and text threshold state', () => {
    const { rerender } = render(<UsageMeter used={68} total={100} label="容量" />);
    expect(screen.getByRole('progressbar', { name: '容量' })).toHaveAttribute('aria-valuetext', '已使用 68 GB，共 100 GB，容量正常');
    expect(screen.getByText('剩余 32 GB')).toBeInTheDocument();

    rerender(<UsageMeter used={74} total={100} label="容量" />);
    expect(screen.getByText(/使用率偏高/)).toBeInTheDocument();
    rerender(<UsageMeter used={94} total={100} label="容量" />);
    expect(screen.getByText(/容量不足/)).toBeInTheDocument();
    expect(getUsageState(94).tone).toBe('critical');
  });
});
