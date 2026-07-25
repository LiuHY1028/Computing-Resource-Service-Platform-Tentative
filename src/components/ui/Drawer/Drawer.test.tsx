import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Drawer } from './Drawer';

function DrawerHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>打开续费</button>
      <Drawer
        open={open}
        title="续费"
        description="核对周期与费用"
        onClose={() => setOpen(false)}
        primaryAction={{ label: '确认续费' }}
      >
        <label>
          续费周期
          <input />
        </label>
      </Drawer>
    </>
  );
}

describe('Drawer', () => {
  it('traps focus, closes on Escape and restores the trigger focus', async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);
    const trigger = screen.getByRole('button', { name: '打开续费' });

    await user.click(trigger);
    const drawer = screen.getByRole('dialog', { name: '续费' });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(document.body).toHaveStyle({ overflow: 'hidden' });
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: '续费' })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).toBe('');
  });
});
