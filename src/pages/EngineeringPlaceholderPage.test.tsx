import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/product', () => ({
  productConfig: {
    displayName: '集中配置测试名称',
  },
}));

import { EngineeringPlaceholderPage } from './EngineeringPlaceholderPage';

describe('EngineeringPlaceholderPage', () => {
  it('reads the product name from the centralized product config', () => {
    render(
      <MemoryRouter>
        <EngineeringPlaceholderPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: '集中配置测试名称' }),
    ).toBeInTheDocument();
  });
});
