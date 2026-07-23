import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from './DropdownMenu';

function Subject({ onSelect = vi.fn() }: Readonly<{ onSelect?: () => void }>) {
  return (
    <div>
      <DropdownMenu trigger="操作" aria-label="资源操作">
        <DropdownMenuGroup label="管理">
          <DropdownMenuItem onSelect={onSelect}>查看</DropdownMenuItem>
          <DropdownMenuItem disabled onSelect={onSelect}>不可用</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem danger onSelect={onSelect}>删除</DropdownMenuItem>
      </DropdownMenu>
      <button type="button">后续控件</button>
    </div>
  );
}

describe('DropdownMenu', () => {
  it('opens near its button and closes on outside click or Escape', async () => {
    const user = userEvent.setup();
    render(<Subject />);
    const trigger = screen.getByRole('button', { name: '资源操作' });
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: '后续控件' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('supports arrows, disabled and danger items, then restores focus', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Subject onSelect={onSelect} />);
    const trigger = screen.getByRole('button', { name: '资源操作' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: '查看' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: '删除' })).toHaveFocus();
    expect(screen.getByRole('menuitem', { name: '不可用' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('menuitem', { name: '删除' })).toHaveAttribute('data-danger', 'true');
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(trigger).toHaveFocus();
  });

  it('moves into the menu when ArrowDown follows pointer opening', async () => {
    const user = userEvent.setup();
    render(<Subject />);
    const trigger = screen.getByRole('button', { name: '资源操作' });
    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: '查看' })).toHaveFocus();
  });

  it('closes on Tab without trapping normal focus order', async () => {
    const user = userEvent.setup();
    render(<Subject />);
    await user.click(screen.getByRole('button', { name: '资源操作' }));
    await user.keyboard('{Tab}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
