import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MARKETPLACE_DEMO_PRODUCTS } from '../data/marketplaceProducts';
import { MarketplaceResults } from './MarketplaceResults';

describe('MarketplaceResults', () => {
  it('keeps the existing pagination branch functional with a paged fixture', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    const products = MARKETPLACE_DEMO_PRODUCTS.slice(0, 2);
    const commonProps = {
      state: {
        status: 'success' as const,
        result: {
          items: products,
          total: products.length,
          catalogTotal: products.length,
        },
      },
      resourceType: 'cloud-server' as const,
      search: '',
      pageSize: 1,
      onPageChange,
      onConfigure: vi.fn(),
      onRetry: vi.fn(),
      onClearSearch: vi.fn(),
      onResetFilters: vi.fn(),
      onSwitchResourceType: vi.fn(),
    };

    const { rerender } = render(
      <MarketplaceResults {...commonProps} page={1} />,
    );

    expect(screen.getByRole('navigation', { name: '分页' })).toBeInTheDocument();
    expect(
      screen.getByRole('article', { name: '通用计算 C8，可继续配置' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: '通用计算 C16，暂不可配置' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '第 2 页' }));

    expect(onPageChange).toHaveBeenCalledWith(2);

    rerender(<MarketplaceResults {...commonProps} page={2} />);
    expect(
      screen.getByRole('article', { name: '通用计算 C16，暂不可配置' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('article', { name: '通用计算 C8，可继续配置' }),
    ).not.toBeInTheDocument();
  });
});
