import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  CardRadio,
  Checkbox,
  CheckboxGroup,
  Radio,
  RadioGroup,
} from '../index';

function RadioFixture() {
  const [value, setValue] = useState('one');
  return (
    <RadioGroup aria-label="单选组" value={value} onValueChange={setValue}>
      <Radio value="one">单选一</Radio>
      <Radio value="two">单选二</Radio>
    </RadioGroup>
  );
}

function CheckboxFixture() {
  const [value, setValue] = useState<readonly string[]>(['one']);
  return (
    <CheckboxGroup aria-label="复选组" value={value} onValueChange={setValue}>
      <Checkbox value="one">复选一</Checkbox>
      <Checkbox value="two">复选二</Checkbox>
    </CheckboxGroup>
  );
}

describe('Radio and Checkbox components', () => {
  it('toggles Radio labels, enforces single selection and supports arrows', async () => {
    const user = userEvent.setup();
    render(<RadioFixture />);

    await user.click(screen.getByText('单选二'));
    expect(screen.getByRole('radio', { name: '单选二' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '单选一' })).not.toBeChecked();

    screen.getByRole('radio', { name: '单选二' }).focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: '单选一' })).toBeChecked();
  });

  it('supports CardRadio keyboard operation and disabled radio state', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <RadioGroup aria-label="卡片组" onValueChange={onValueChange}>
        <CardRadio value="card" title="卡片选项" description="说明" />
        <CardRadio value="disabled" title="禁用卡片" disabled />
      </RadioGroup>,
    );
    const card = screen.getByRole('radio', { name: /卡片选项/ });
    card.focus();
    await user.keyboard(' ');
    expect(onValueChange).toHaveBeenCalledWith('card');
    expect(screen.getByRole('radio', { name: '禁用卡片' })).toBeDisabled();
  });

  it('toggles CheckboxGroup values and respects disabled controls', async () => {
    const user = userEvent.setup();
    render(
      <>
        <CheckboxFixture />
        <Checkbox disabled>禁用复选</Checkbox>
      </>,
    );

    await user.click(screen.getByText('复选二'));
    expect(screen.getByRole('checkbox', { name: '复选一' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '复选二' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '禁用复选' })).toBeDisabled();
  });

  it('sets native and ARIA indeterminate state', () => {
    render(<Checkbox indeterminate>部分选择</Checkbox>);
    const checkbox = screen.getByRole('checkbox', { name: '部分选择' });
    expect(checkbox).toHaveProperty('indeterminate', true);
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed');
  });
});
