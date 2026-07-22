import { createRef, useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Input, SearchInput, Textarea } from '../index';

function ClearableFixture() {
  const [value, setValue] = useState('可清空');
  return (
    <Input
      aria-label="可清空输入"
      clearable
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}

describe('Input and Textarea', () => {
  it('supports placeholder, input and clear interactions', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Input aria-label="基础输入" placeholder="请输入" />
        <ClearableFixture />
      </>,
    );

    const input = screen.getByRole('textbox', { name: '基础输入' });
    expect(input).toHaveAttribute('placeholder', '请输入');
    await user.type(input, '内容');
    expect(input).toHaveValue('内容');

    await user.click(screen.getByRole('button', { name: '清空输入' }));
    expect(screen.getByRole('textbox', { name: '可清空输入' })).toHaveValue('');
  });

  it('submits SearchInput with Enter and displays character counts', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    render(
      <>
        <SearchInput aria-label="搜索" onSearch={onSearch} />
        <Input aria-label="限长" maxLength={8} showCount defaultValue="abc" />
        <Textarea aria-label="限长文本域" maxLength={10} showCount defaultValue="abcd" />
      </>,
    );

    const search = screen.getByRole('searchbox', { name: '搜索' });
    await user.type(search, 'query{Enter}');
    expect(onSearch).toHaveBeenCalledWith('query');
    expect(screen.getByText('3/8')).toBeInTheDocument();
    expect(screen.getByText('4/10')).toBeInTheDocument();
  });

  it('supports disabled, readOnly and ARIA-linked errors', () => {
    render(
      <>
        <Input aria-label="禁用" disabled />
        <Input aria-label="只读" readOnly />
        <Input aria-label="错误" error errorMessage="需要检查" />
      </>,
    );

    expect(screen.getByRole('textbox', { name: '禁用' })).toBeDisabled();
    expect(screen.getByRole('textbox', { name: '只读' })).toHaveAttribute('readonly');
    const errorInput = screen.getByRole('textbox', { name: '错误' });
    const message = screen.getByText('需要检查').closest('p');
    expect(errorInput).toHaveAttribute('aria-invalid', 'true');
    expect(message).toHaveAttribute('id');
    expect(errorInput).toHaveAttribute('aria-describedby', message?.id);
  });

  it('forwards input and textarea refs', () => {
    const inputRef = createRef<HTMLInputElement>();
    const textareaRef = createRef<HTMLTextAreaElement>();
    render(
      <>
        <Input ref={inputRef} aria-label="引用输入" />
        <Textarea ref={textareaRef} aria-label="引用文本域" />
      </>,
    );
    expect(inputRef.current).toBe(screen.getByRole('textbox', { name: '引用输入' }));
    expect(textareaRef.current).toBe(screen.getByRole('textbox', { name: '引用文本域' }));
  });
});
