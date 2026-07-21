import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from './App';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('application routes', () => {
  it('renders the application root', () => {
    const { container } = renderRoute('/');

    expect(container.querySelector('main')).toBeInTheDocument();
  });

  it('shows the engineering placeholder on the root route', () => {
    renderRoute('/');

    expect(screen.getByText('前端工程初始化')).toBeInTheDocument();
  });

  it('renders the UI specification verification route', () => {
    renderRoute('/__dev/ui-spec');

    expect(
      screen.getByRole('heading', { name: 'UI 规范 Design Token 验证页' }),
    ).toBeInTheDocument();
    expect(screen.getByText('字体加载状态')).toBeInTheDocument();
    expect(screen.getByText('中文示例')).toBeInTheDocument();
    expect(screen.getByText('Demibold')).toBeInTheDocument();
  });

  it('shows the not-found page for an unknown route', () => {
    renderRoute('/unknown-route');

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
  });
});
