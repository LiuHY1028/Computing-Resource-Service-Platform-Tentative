import { render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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

function LocationObserver() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

describe('application routes', () => {
  it('redirects the root to the first formal module', () => {
    renderRoute('/');

    expect(DEFAULT_APP_ROUTE.pageId).toBe('MKT-01');
    expect(
      screen.getByRole('heading', { level: 1, name: '让每一份算力都匹配真实工作负载' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: '选择适合当前工作负载的资源',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('模块占位页面')).not.toBeInTheDocument();
  });

  it.each([
    ['/marketplace', '让每一份算力都匹配真实工作负载'],
    ['/console/resources/cloud-servers', '云服务器列表'],
    ['/console/storage', '存储管理'],
    ['/console/images', '镜像管理'],
    ['/software', '软件中心'],
    ['/console/network-access', '网络与访问'],
    ['/console/orders', '订单列表'],
    ['/console/operation-records', '操作记录'],
  ])('renders formal route %s', (path, title) => {
    renderRoute(path);

    expect(
      screen.getByRole('heading', { level: 1, name: title }),
    ).toBeInTheDocument();
  });

  it('renders the storage management page instead of a service placeholder', async () => {
    renderRoute('/console/storage');

    expect(await screen.findByRole('table', { name: '存储列表' })).toBeInTheDocument();
    expect(screen.queryByText(/服务状态|暂未开放/)).not.toBeInTheDocument();
  });

  it('registers every stable page route', () => {
    expect(APP_PAGE_ROUTES).toHaveLength(17);
  });

  it.each([
    [
      '/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east',
      '配置云服务器',
    ],
    [
      '/marketplace/physical-machine/purchase?product=catalog-physical-cpu-p1-east',
      '配置物理机',
    ],
  ])('renders the formal purchase page at %s', async (path, title) => {
    renderRoute(path);

    const pageTitle = screen.getByRole('heading', { level: 1, name: title });
    expect(pageTitle).toBeInTheDocument();
    expect(pageTitle.closest('.purchase-page__header')).toBeInTheDocument();
    expect(await screen.findByLabelText('配置说明')).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: '返回资源商城' })[0],
    ).toBeInTheDocument();
    expect(screen.getByText('配置说明')).toBeInTheDocument();
    expect(document.querySelector('.purchase-guide')).toBeNull();
    expect(screen.queryByText('模块占位页面')).not.toBeInTheDocument();
  });

  it('uses independent layouts for the two product areas and the console', () => {
    const marketplace = renderRoute('/marketplace');
    expect(screen.getByTestId('marketplace-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('side-navigation')).not.toBeInTheDocument();
    marketplace.unmount();

    const software = renderRoute('/software');
    expect(screen.getByTestId('software-center-layout')).toBeInTheDocument();
    expect(screen.queryByTestId('side-navigation')).not.toBeInTheDocument();
    software.unmount();

    renderRoute('/console/resources/cloud-servers');
    expect(screen.getByTestId('console-layout')).toBeInTheDocument();
    expect(screen.getByTestId('side-navigation')).toBeInTheDocument();
  });

  it.each([
    ['/resources/cloud-servers?q=研发', '/console/resources/cloud-servers?q=研发'],
    ['/storage', '/console/storage'],
    ['/orders', '/console/orders'],
    ['/operation-records', '/console/operation-records'],
  ])('redirects legacy route %s to %s', async (legacyPath, targetPath) => {
    render(
      <MemoryRouter initialEntries={[legacyPath]}>
        <App />
        <LocationObserver />
      </MemoryRouter>,
    );

    expect(await screen.findByTestId('location')).toHaveTextContent(targetPath);
  });

  it('renders the UI specification route', () => {
    renderRoute('/__dev/ui-spec');

    expect(
      screen.getByRole('heading', { name: 'UI 规范与 Design Token' }),
    ).toBeInTheDocument();
    expect(screen.getByText('字体加载状态')).toBeInTheDocument();
    expect(screen.getByText('中文排版')).toBeInTheDocument();
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
