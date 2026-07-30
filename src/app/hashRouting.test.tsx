import { render, screen, waitFor } from '@testing-library/react';
import { HashRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { App } from './App';

afterEach(() => {
  window.location.hash = '';
});

describe('offline hash routing', () => {
  it('opens a formal deep link from the hash', () => {
    window.location.hash = '#/console/resources/cloud-servers';
    render(
      <HashRouter>
        <App />
      </HashRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: '云服务器列表' }),
    ).toBeInTheDocument();
  });

  it('redirects an empty hash to the marketplace', async () => {
    window.location.hash = '';
    render(
      <HashRouter>
        <App />
      </HashRouter>,
    );

    await waitFor(() =>
      expect(window.location.hash).toBe('#/marketplace'),
    );
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: '面向业务工作负载的算力资源',
      }),
    ).toBeInTheDocument();
  });

  it('keeps unknown hashes on the 404 page', () => {
    window.location.hash = '#/unknown-offline-route';
    render(
      <HashRouter>
        <App />
      </HashRouter>,
    );

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
  });
});
