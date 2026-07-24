import { useRef, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button, Modal, MultiSelect, PromptModal, Select } from '../index';

function ModalHarness({ closeOnOverlayClick = false }: Readonly<{ closeOnOverlayClick?: boolean }>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <Button ref={triggerRef} onClick={() => setOpen(true)}>打开弹窗</Button>
      <Modal
        open={open}
        title="测试弹窗"
        onClose={() => setOpen(false)}
        returnFocusRef={triggerRef}
        closeOnOverlayClick={closeOnOverlayClick}
        primaryAction={{ label: '确定' }}
        secondaryAction={{ label: '取消', onClick: () => setOpen(false) }}
      >
        <input aria-label="弹窗输入" />
      </Modal>
    </>
  );
}

function ModalSelectionHarness() {
  const [value, setValue] = useState('');
  const [values, setValues] = useState<readonly string[]>([]);
  const options = [
    { value: 'alpha', label: 'Alpha' },
    { value: 'beta', label: 'Beta' },
  ];
  return (
    <Modal open title="弹窗选择器" onClose={() => undefined}>
      <Select aria-label="弹窗单选" value={value} onValueChange={setValue} options={options} />
      <MultiSelect aria-label="弹窗多选" value={values} onValueChange={setValues} options={options} />
    </Modal>
  );
}

describe('Modal', () => {
  it('opens in a body portal, moves and traps focus, closes with Escape and returns focus', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const trigger = screen.getByRole('button', { name: '打开弹窗' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: '测试弹窗' });
    expect(dialog.parentElement?.parentElement).toBe(document.body);
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    await waitFor(() => expect(screen.getByRole('button', { name: '关闭弹窗' })).toHaveFocus());

    fireEvent.keyDown(screen.getByRole('button', { name: '关闭弹窗' }), { key: 'Tab', shiftKey: true });
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(trigger).not.toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.overflow).toBe('');
  });

  it('supports close button and configurable overlay closing', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ModalHarness />);
    await user.click(screen.getByRole('button', { name: '打开弹窗' }));
    await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<ModalHarness closeOnOverlayClick />);
    await user.click(screen.getByRole('button', { name: '打开弹窗' }));
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    await user.click(overlay);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('disables actions and repeated closing while busy', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open title="提交中" onClose={onClose} busy primaryAction={{ label: '提交' }}>
        内容
      </Modal>,
    );
    expect(screen.getByRole('button', { name: '处理中' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '关闭弹窗' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('supports pointer selection through portaled controls inside a modal', async () => {
    const user = userEvent.setup();
    render(<ModalSelectionHarness />);
    const dialog = screen.getByRole('dialog', { name: '弹窗选择器' });

    const select = screen.getByRole('combobox', { name: '弹窗单选' });
    await user.click(select);
    expect(dialog).not.toContainElement(screen.getByRole('listbox'));
    await user.click(screen.getByRole('option', { name: 'Beta' }));
    expect(select).toHaveTextContent('Beta');

    const multiSelect = screen.getByRole('combobox', { name: '弹窗多选' });
    await user.click(multiSelect);
    expect(dialog).not.toContainElement(screen.getByRole('listbox'));
    await user.click(screen.getByRole('option', { name: 'Alpha' }));
    expect(multiSelect).toHaveTextContent('Alpha');
  });

  it('uses alertdialog for warning prompts and cleans the portal on unmount', () => {
    const { unmount } = render(
      <PromptModal open title="警告" description="说明" variant="warning" onClose={() => undefined} />,
    );
    expect(screen.getByRole('alertdialog', { name: '警告' })).toHaveAttribute('aria-describedby');
    unmount();
    expect(document.querySelector('.ui-modal-overlay')).toBeNull();
  });
});
