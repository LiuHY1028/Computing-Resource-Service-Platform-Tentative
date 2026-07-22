import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Form,
  FormActions,
  FormAnchorNav,
  FormField,
  FormSection,
  Input,
} from '../index';

describe('Form layout', () => {
  it('submits semantically and can prevent native submission', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <Form aria-label="测试表单" onSubmit={onSubmit}>
        <FormActions primaryAction={{ label: '提交' }} />
      </Form>,
    );
    await user.click(screen.getByRole('button', { name: '提交' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0]?.[0].defaultPrevented).toBe(true);
  });

  it('associates label, required, help and error with a public Input', async () => {
    const user = userEvent.setup();
    render(
      <FormField label="字段名称" required help="帮助说明" error="错误说明">
        <Input />
      </FormField>,
    );
    const input = screen.getByRole('textbox', { name: /字段名称/ });
    await user.click(screen.getByText('字段名称'));
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('-help');
    expect(describedBy).toContain('-error');
    expect(screen.getByText('必填')).toHaveClass('ui-visually-hidden');
  });

  it('passes disabled state to the slotted control and renders sections/actions', () => {
    render(
      <Form>
        <FormSection title="分区标题" description="分区说明">
          <FormField label="禁用字段" disabled><Input /></FormField>
        </FormSection>
        <FormActions submitting primaryAction={{ label: '保存' }} secondaryAction={{ label: '取消' }} />
      </Form>,
    );
    expect(screen.getByRole('heading', { name: '分区标题' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '禁用字段' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '处理中' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '取消' })).toBeDisabled();
  });

  it('scrolls to anchors and supports keyboard activation', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    const onActiveChange = vi.fn();
    render(
      <>
        <section id="section-a">内容</section>
        <FormAnchorNav items={[{ id: 'section-a', label: '分区 A' }, { id: 'disabled', label: '禁用分区', disabled: true }]} onActiveChange={onActiveChange} />
      </>,
    );
    document.getElementById('section-a')!.scrollIntoView = scrollIntoView;
    const anchor = screen.getByRole('button', { name: '分区 A' });
    anchor.focus();
    await user.keyboard('{Enter}');
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(onActiveChange).toHaveBeenCalledWith('section-a');
    expect(screen.getByRole('button', { name: '禁用分区' })).toBeDisabled();
  });

  it('treats an upload-shaped child as layout only', () => {
    render(
      <FormField label="布局插槽" width="upload">
        <div role="group">通用内容</div>
      </FormField>,
    );
    expect(screen.getByText('通用内容')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /上传/ })).not.toBeInTheDocument();
  });
});
