import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TitleBarTabs, UnderlineTabs, type TabItem } from '../index';

const items: readonly TabItem[] = [
  { value: 'one', label: '选项一', panel: '面板一' },
  { value: 'two', label: '选项二', panel: '面板二' },
  { value: 'disabled', label: '禁用项', panel: '禁用面板', disabled: true },
  { value: 'three', label: '选项三', panel: '面板三' },
];

describe('Tabs', () => {
  it('supports controlled click changes and tabpanel relations', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<TitleBarTabs aria-label="测试标签" items={items} value="one" onValueChange={onValueChange} />);
    const second = screen.getByRole('tab', { name: '选项二' });
    await user.click(second);
    expect(onValueChange).toHaveBeenCalledWith('two');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', screen.getByRole('tab', { name: '选项一' }).id);
  });

  it('uses roving focus and manual activation with arrows, Home and End', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [value, setValue] = useState('one');
      return <UnderlineTabs aria-label="键盘标签" items={items} value={value} onValueChange={setValue} />;
    }
    render(<Harness />);
    const first = screen.getByRole('tab', { name: '选项一' });
    first.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: '选项二' })).toHaveFocus();
    expect(screen.getByText('面板一')).toBeInTheDocument();
    await user.keyboard('{Enter}');
    expect(screen.getByText('面板二')).toBeInTheDocument();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: '选项三' })).toHaveFocus();
    await user.keyboard(' ');
    expect(screen.getByText('面板三')).toBeInTheDocument();
    await user.keyboard('{Home}');
    expect(first).toHaveFocus();
    expect(screen.getByRole('tab', { name: '禁用项' })).toBeDisabled();
  });
});
