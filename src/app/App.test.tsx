import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { APP_PAGE_ROUTES, DEFAULT_APP_ROUTE } from './routes';
import { App } from './App';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('application routes', () => {
  it('redirects the root to the first formal module', () => {
    renderRoute('/');

    expect(DEFAULT_APP_ROUTE.pageId).toBe('MKT-01');
    expect(
      screen.getByRole('heading', { level: 1, name: '资源商城' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '发现适合业务的计算资源',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('模块占位页面')).not.toBeInTheDocument();
  });

  it.each([
    ['/marketplace', '资源商城'],
    ['/resources/cloud-servers', '云服务器列表'],
    ['/storage', '存储空间列表'],
    ['/images', '镜像管理'],
    ['/software', '软件中心'],
    ['/network-access', '网络与访问'],
    ['/orders', '订单列表'],
    ['/operation-records', '操作记录'],
  ])('renders formal route %s', (path, title) => {
    renderRoute(path);

    expect(
      screen.getByRole('heading', { level: 1, name: title }),
    ).toBeInTheDocument();
  });

  it('registers every stable page route', () => {
    expect(APP_PAGE_ROUTES).toHaveLength(15);
  });

  it.each([
    [
      '/marketplace/cloud-server/purchase',
      '云服务器购买配置',
    ],
    [
      '/marketplace/physical-machine/purchase',
      '物理机购买配置',
    ],
  ])('keeps the Task 05B purchase placeholder at %s', (path, title) => {
    renderRoute(path);

    expect(
      screen.getByRole('heading', { level: 1, name: title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '购买配置将在 Task 05B 实现',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '返回资源商城' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('模块占位页面')).not.toBeInTheDocument();
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

  it('renders foundation components inside AppShell without adding a formal menu item', () => {
    renderRoute('/__dev/components/foundation');

    expect(
      screen.getByRole('heading', { level: 1, name: '基础交互组件' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Select 与 MultiSelect' })).toBeInTheDocument();
    expect(document.querySelector('nav a[href="/__dev/components/foundation"]')).toBeNull();
  });

  it('renders advanced components inside AppShell without adding a formal menu item', () => {
    renderRoute('/__dev/components/advanced');

    expect(
      screen.getByRole('heading', { level: 1, name: '高级公共组件' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Table' })).toBeInTheDocument();
    expect(document.querySelector('nav a[href="/__dev/components/advanced"]')).toBeNull();
  });

  it('shows the not-found page for an unknown route', () => {
    renderRoute('/unknown-route');

    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回资源商城' })).toHaveAttribute(
      'href',
      '/marketplace',
    );
  });
});
