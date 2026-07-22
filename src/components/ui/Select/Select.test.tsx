import { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { MultiSelect, Select, type SelectOption } from '../index';

const options: readonly SelectOption[] = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
  { value: 'disabled', label: 'Disabled', disabled: true },
];

function SelectFixture() {
  const [value, setValue] = useState('');
  return <Select aria-label="选择器" options={options} value={value} onValueChange={setValue} />;
}

function MultiFixture() {
  const [value, setValue] = useState<readonly string[]>(['alpha']);
  return <MultiSelect aria-label="多选器" options={options} value={value} onValueChange={setValue} />;
}

describe('Select', () => {
  it('opens, selects by pointer, toggles closed and closes outside', async () => {
    const user = userEvent.setup();
    render(<SelectFixture />);
    const trigger = screen.getByRole('combobox', { name: '选择器' });

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    await user.click(screen.getByRole('option', { name: 'Beta' }));
    expect(trigger).toHaveTextContent('Beta');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('supports arrows, Home, End, Enter, Escape and focus return', async () => {
    const user = userEvent.setup();
    render(<SelectFixture />);
    const trigger = screen.getByRole('combobox', { name: '选择器' });
    trigger.focus();
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(trigger).toHaveTextContent('Beta');

    await user.keyboard('{ArrowDown}{End}{Escape}');
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes on Tab without trapping focus', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SelectFixture />
        <button type="button">下一个控件</button>
      </>,
    );
    const trigger = screen.getByRole('combobox', { name: '选择器' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.tab();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '下一个控件' })).toHaveFocus();
  });

  it('does not respond when disabled', async () => {
    const user = userEvent.setup();
    render(<Select aria-label="禁用选择器" options={options} disabled />);
    const trigger = screen.getByRole('combobox', { name: '禁用选择器' });
    expect(trigger).toBeDisabled();
    await user.click(trigger);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('exposes combobox/listbox/option ARIA relationships', async () => {
    const user = userEvent.setup();
    render(<SelectFixture />);
    const trigger = screen.getByRole('combobox', { name: '选择器' });
    await user.click(trigger);
    const listbox = screen.getByRole('listbox');
    expect(trigger).toHaveAttribute('aria-controls', listbox.id);
    expect(trigger).toHaveAttribute('aria-activedescendant');
    expect(screen.getByRole('option', { name: 'Alpha' })).toHaveAttribute('aria-selected', 'false');
  });
});

describe('MultiSelect', () => {
  it('adds and removes values and exposes multiselect ARIA', async () => {
    const user = userEvent.setup();
    render(<MultiFixture />);
    const trigger = screen.getByRole('combobox', { name: '多选器' });
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-multiselectable', 'true');
    await user.click(screen.getByRole('option', { name: 'Beta' }));
    expect(trigger).toHaveTextContent('Beta');
    await user.click(screen.getByRole('button', { name: '移除Alpha' }));
    expect(trigger).not.toHaveTextContent('Alpha');
  });

  it('collapses values beyond the visible tag limit', () => {
    render(
      <MultiSelect
        aria-label="折叠多选"
        options={options}
        defaultValue={['alpha', 'beta', 'gamma']}
        maxVisibleTags={2}
      />,
    );
    expect(screen.getByRole('combobox', { name: '折叠多选' })).toHaveTextContent('+ 1 ...');
  });

  it('does not open or remove values when disabled', async () => {
    const user = userEvent.setup();
    render(
      <MultiSelect
        aria-label="禁用多选"
        options={options}
        defaultValue={['alpha']}
        disabled
      />,
    );
    const trigger = screen.getByRole('combobox', { name: '禁用多选' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('button', { name: '移除Alpha' })).toBeDisabled();
  });

  it('removes portal content on unmount', async () => {
    const user = userEvent.setup();
    const view = render(<MultiFixture />);
    await user.click(screen.getByRole('combobox', { name: '多选器' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    view.unmount();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
