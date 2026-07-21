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

  it('shows the not-found page for an unknown route', () => {
    renderRoute('/unknown-route');

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
  });
});
