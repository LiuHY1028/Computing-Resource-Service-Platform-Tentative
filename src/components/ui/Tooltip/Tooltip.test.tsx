import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button, Tooltip } from '../index';

describe('Tooltip', () => {
  it('opens on hover and focus, and closes with Escape', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="提示内容" openDelay={0} closeDelay={0}>
        <Button>有名称的触发器</Button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: '有名称的触发器' });
    await user.hover(trigger);
    expect(await screen.findByRole('tooltip')).toHaveTextContent('提示内容');
    await user.unhover(trigger);
    await waitFor(() => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument());

    trigger.focus();
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps interactive content open while moving into the tooltip', async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content={<button type="button">提示内操作</button>} openDelay={0} closeDelay={20}>
        <Button>交互提示</Button>
      </Tooltip>,
    );
    await user.hover(screen.getByRole('button', { name: '交互提示' }));
    const tooltip = await screen.findByRole('tooltip');
    await user.hover(tooltip);
    expect(screen.getByRole('button', { name: '提示内操作' })).toBeInTheDocument();
  });

  it('does not use Tooltip as the trigger accessible name and cleans its portal', async () => {
    const user = userEvent.setup();
    const view = render(
      <Tooltip content="不能成为名称" openDelay={0}>
        <Button aria-label="明确名称">图标</Button>
      </Tooltip>,
    );
    const trigger = screen.getByRole('button', { name: '明确名称' });
    expect(screen.queryByRole('button', { name: '不能成为名称' })).not.toBeInTheDocument();
    await user.hover(trigger);
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    view.unmount();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
