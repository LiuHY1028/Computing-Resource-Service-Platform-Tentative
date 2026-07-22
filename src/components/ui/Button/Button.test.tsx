import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, FilterTag, IconButton } from '../index';
import { InfoIcon } from '../icons/UiIcons';

describe('Button components', () => {
  it('renders a primary variant and handles pointer and keyboard activation', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button variant="primary" onClick={onClick}>确认</Button>);

    const button = screen.getByRole('button', { name: '确认' });
    expect(button).toHaveAttribute('data-variant', 'primary');
    await user.click(button);
    button.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does not activate a disabled button', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>禁用</Button>);

    await user.click(screen.getByRole('button', { name: '禁用' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('requires an accessible IconButton name and toggles FilterTag', async () => {
    const user = userEvent.setup();
    render(
      <>
        <IconButton aria-label="查看说明" icon={<InfoIcon />} />
        <FilterTag>筛选</FilterTag>
      </>,
    );

    expect(screen.getByRole('button', { name: '查看说明' })).toBeInTheDocument();
    const tag = screen.getByRole('button', { name: '筛选' });
    expect(tag).toHaveAttribute('aria-pressed', 'false');
    await user.click(tag);
    expect(tag).toHaveAttribute('aria-pressed', 'true');
  });

  it('forwards refs', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref}>带引用</Button>);
    expect(ref.current).toBe(screen.getByRole('button', { name: '带引用' }));
  });
});
