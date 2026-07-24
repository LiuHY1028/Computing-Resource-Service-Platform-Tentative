import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { App } from '../App';
import { productConfig } from '../../config/product';
import { SideNavigation } from './SideNavigation';
import { TopNavbar } from './TopNavbar';
import { MainContent } from './MainContent';
import { FloatingAction } from './FloatingAction';
import type { NavigationGroup } from './navigation';

function renderRoute(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AppShell', () => {
  it('renders the top navbar and expanded side navigation', () => {
    renderRoute('/console/resources/cloud-servers');

    expect(screen.getByTestId('top-navbar')).toBeInTheDocument();
    expect(screen.getByTestId('side-navigation')).toHaveAttribute(
      'data-collapsed',
      'false',
    );
    expect(screen.getByText(productConfig.displayName)).toBeInTheDocument();
  });

  it('collapses and restores the side navigation without changing the route', async () => {
    const user = userEvent.setup();
    renderRoute('/console/storage');

    await user.click(screen.getByRole('button', { name: '收起侧边菜单' }));

    expect(screen.getByTestId('side-navigation')).toHaveAttribute(
      'data-collapsed',
      'true',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '存储空间列表' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '存储管理' })).toHaveAttribute(
      'aria-current',
      'page',
    );

    await user.click(screen.getByRole('button', { name: '展开侧边菜单' }));

    expect(screen.getByTestId('side-navigation')).toHaveAttribute(
      'data-collapsed',
      'false',
    );
  });

  it('updates the selected item and page title after navigation', async () => {
    const user = userEvent.setup();
    renderRoute('/console/resources/cloud-servers');

    await user.click(screen.getByRole('link', { name: '存储管理' }));

    expect(screen.getByRole('link', { name: '存储管理' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('heading', { level: 1, name: '存储空间列表' }),
    ).toBeInTheDocument();
  });

  it('shows an accessible tooltip for a collapsed navigation item', async () => {
    const user = userEvent.setup();
    renderRoute('/console/resources/cloud-servers');
    await user.click(screen.getByRole('button', { name: '收起侧边菜单' }));

    const storageLink = screen.getByRole('link', { name: '存储管理' });
    await user.hover(storageLink);

    expect(screen.getByRole('tooltip')).toHaveTextContent('存储管理');
  });

  it('provides accurate feedback for both top navbar entries', async () => {
    const user = userEvent.setup();
    renderRoute('/console/resources/cloud-servers');

    await user.click(screen.getByRole('button', { name: '消息入口' }));
    expect(screen.getByText('暂无新消息').closest('[role="status"]')).toHaveTextContent(
      '新的平台通知将在这里显示。',
    );

    await user.click(screen.getByRole('button', { name: '当前用户入口' }));
    expect(screen.getByText('当前会话').closest('[role="status"]')).toHaveTextContent(
      '当前会话未提供账号、组织或权限信息。',
    );
  });

  it('does not render a broken image when no logo is configured', () => {
    render(
      <MemoryRouter>
        <TopNavbar
          product={{ displayName: '集中配置测试名称' }}
          collapsed={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('集中配置测试名称')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('keeps the optional floating action capability out of formal pages by default', () => {
    const { rerender } = render(
      <MainContent pageTitle="开发定位验证">
        <div>验证内容</div>
      </MainContent>,
    );

    expect(screen.queryByRole('button', { name: '悬浮定位验证' })).not.toBeInTheDocument();

    rerender(
      <MainContent
        pageTitle="开发定位验证"
        floatingAction={
          <FloatingAction
            label="悬浮定位验证"
            icon={<span aria-hidden="true">+</span>}
            onClick={() => undefined}
          />
        }
      >
        <div>验证内容</div>
      </MainContent>,
    );

    expect(screen.getByRole('button', { name: '悬浮定位验证' }).parentElement).toHaveClass(
      'main-content__floating-slot',
    );
  });
});

describe('SideNavigation overflow fixture', () => {
  const overflowGroups: readonly NavigationGroup[] = [
    {
      id: 'overflow-fixture',
      label: '测试导航',
      items: Array.from({ length: 20 }, (_, index) => ({
        id: `fixture-${index}`,
        label: `测试菜单 ${index + 1}`,
        path: `/fixture-${index}`,
        icon: 'marketplace' as const,
        pageTitle: `测试页面 ${index + 1}`,
      })),
    },
  ];

  it('keeps the menu scrollable, footer independent, and masks in sync', () => {
    render(
      <MemoryRouter>
        <SideNavigation
          collapsed={false}
          activeItemId="fixture-0"
          onCollapsedChange={() => undefined}
          groups={overflowGroups}
        />
      </MemoryRouter>,
    );

    const region = screen.getByTestId('side-navigation-scroll-region');
    Object.defineProperties(region, {
      scrollHeight: { configurable: true, value: 900 },
      clientHeight: { configurable: true, value: 200 },
      scrollTop: { configurable: true, writable: true, value: 0 },
    });

    fireEvent.scroll(region);
    expect(region).toHaveAttribute('data-can-scroll-down', 'true');
    expect(screen.getByTestId('side-navigation-scroll-mask-bottom')).toHaveAttribute(
      'data-visible',
      'true',
    );
    expect(screen.getByTestId('side-navigation-fixed-footer')).toBeInTheDocument();

    region.scrollTop = 700;
    fireEvent.scroll(region);

    expect(screen.getByTestId('side-navigation-scroll-mask-top')).toHaveAttribute(
      'data-visible',
      'true',
    );
    expect(screen.getByTestId('side-navigation-scroll-mask-bottom')).toHaveAttribute(
      'data-visible',
      'false',
    );
  });
});
