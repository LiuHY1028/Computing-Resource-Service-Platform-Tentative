import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PurchaseStepper } from './PurchaseStepper';

describe('PurchaseStepper', () => {
  it('marks completed, current and upcoming stages without allowing future jumps', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();
    render(
      <PurchaseStepper
        currentStep="confirmation"
        onStepChange={onStepChange}
      />,
    );

    const configuration = screen.getByRole('button', { name: '配置已完成' });
    const confirmation = screen.getByRole('button', {
      name: '确认订单当前步骤',
    });
    const payment = screen.getByRole('button', { name: '支付尚未开始' });

    expect(configuration).toBeEnabled();
    expect(confirmation).toHaveAttribute('aria-current', 'step');
    expect(confirmation).toBeDisabled();
    expect(payment).toBeDisabled();

    await user.click(configuration);
    expect(onStepChange).toHaveBeenCalledWith('configuration');
  });
});
