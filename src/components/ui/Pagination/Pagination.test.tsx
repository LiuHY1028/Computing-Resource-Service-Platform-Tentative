import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { getPaginationItems, Pagination } from '../index';

describe('getPaginationItems', () => {
  it('returns all pages for short ranges', () => {
    expect(getPaginationItems(2, 4)).toEqual([1, 2, 3, 4]);
  });

  it('places ellipses correctly for long ranges', () => {
    expect(getPaginationItems(1, 20)).toEqual([1, 2, 3, 4, 5, 'ellipsis-end', 20]);
    expect(getPaginationItems(10, 20)).toEqual([1, 'ellipsis-start', 9, 10, 11, 'ellipsis-end', 20]);
    expect(getPaginationItems(20, 20)).toEqual([1, 'ellipsis-start', 16, 17, 18, 19, 20]);
  });
});

describe('Pagination', () => {
  it('changes pages, disables boundaries and marks the current page', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<Pagination page={1} totalPages={10} onPageChange={onChange} />);
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '第 1 页' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(onChange).toHaveBeenCalledWith(2);

    rerender(<Pagination page={10} totalPages={10} onPageChange={onChange} />);
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();
  });

  it('renders simple mode and changes page size through the public Select', async () => {
    const user = userEvent.setup();
    const onSizeChange = vi.fn();
    const { rerender } = render(<Pagination variant="simple" page={2} totalPages={3} onPageChange={() => undefined} />);
    expect(screen.getByRole('button', { current: 'page' })).toHaveTextContent('2');

    rerender(<Pagination page={2} totalPages={12} totalItems={90} pageSize={10} pageSizeOptions={[10, 20]} onPageSizeChange={onSizeChange} onPageChange={() => undefined} />);
    await user.click(screen.getByRole('combobox', { name: '每页数量' }));
    await user.click(screen.getByRole('option', { name: '20 条/页' }));
    expect(onSizeChange).toHaveBeenCalledWith(20);
  });
});
