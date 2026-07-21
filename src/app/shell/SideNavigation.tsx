import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ChevronIcon,
  CollapseIcon,
  NavigationIcon,
} from './icons/AppShellIcons';
import {
  navigationGroups,
  type NavigationGroup,
  type NavigationItem,
} from './navigation';

type SideNavigationProps = Readonly<{
  collapsed: boolean;
  activeItemId: string;
  onCollapsedChange: (collapsed: boolean) => void;
  groups?: readonly NavigationGroup[];
}>;

type TooltipState = Readonly<{
  label: string;
  top: number;
  left: number;
}> | null;

function isItemActive(item: NavigationItem, activeItemId: string) {
  return (
    item.id === activeItemId ||
    item.children?.some((child) => child.id === activeItemId) === true
  );
}

export function SideNavigation({
  collapsed,
  activeItemId,
  onCollapsedChange,
  groups = navigationGroups,
}: SideNavigationProps) {
  const scrollRegionRef = useRef<HTMLDivElement>(null);
  const [openItemIds, setOpenItemIds] = useState<readonly string[]>(['records']);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  const updateScrollMasks = useCallback(() => {
    const region = scrollRegionRef.current;

    if (!region) {
      return;
    }

    const remainingScroll = region.scrollHeight - region.clientHeight;
    setCanScrollUp(region.scrollTop > 0);
    setCanScrollDown(remainingScroll > 1 && region.scrollTop < remainingScroll - 1);
  }, []);

  useLayoutEffect(() => {
    updateScrollMasks();
  }, [collapsed, groups, openItemIds, updateScrollMasks]);

  useEffect(() => {
    const region = scrollRegionRef.current;
    const ResizeObserverConstructor = window.ResizeObserver;
    const resizeObserver = ResizeObserverConstructor
      ? new ResizeObserverConstructor(updateScrollMasks)
      : null;

    if (region && resizeObserver) {
      resizeObserver.observe(region);
      if (region.firstElementChild) {
        resizeObserver.observe(region.firstElementChild);
      }
    }

    window.addEventListener('resize', updateScrollMasks);
    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateScrollMasks);
    };
  }, [updateScrollMasks]);

  function showTooltip(
    label: string,
    target: HTMLElement,
  ) {
    if (!collapsed) {
      return;
    }

    const rect = target.getBoundingClientRect();
    setTooltip({
      label,
      top: rect.top + rect.height / 2,
      left: rect.right,
    });
  }

  function showMouseTooltip(label: string, event: MouseEvent<HTMLElement>) {
    showTooltip(label, event.currentTarget);
  }

  function showFocusTooltip(label: string, event: FocusEvent<HTMLElement>) {
    showTooltip(label, event.currentTarget);
  }

  function toggleItem(itemId: string) {
    setOpenItemIds((current) =>
      current.includes(itemId)
        ? current.filter((candidate) => candidate !== itemId)
        : [...current, itemId],
    );
  }

  function renderLink(item: NavigationItem, child = false) {
    const active = item.id === activeItemId;

    return (
      <Link
        className="side-navigation__link"
        data-active={active ? 'true' : 'false'}
        data-child={child ? 'true' : 'false'}
        to={item.path}
        aria-current={active ? 'page' : undefined}
        aria-label={collapsed ? item.label : undefined}
        onMouseEnter={(event) => showMouseTooltip(item.label, event)}
        onMouseLeave={() => setTooltip(null)}
        onFocus={(event) => showFocusTooltip(item.label, event)}
        onBlur={() => setTooltip(null)}
      >
        <NavigationIcon name={item.icon} className="side-navigation__icon" />
        {!collapsed && <span>{item.label}</span>}
      </Link>
    );
  }

  function renderItem(item: NavigationItem) {
    const open = openItemIds.includes(item.id);
    const active = isItemActive(item, activeItemId);

    if (collapsed && item.children) {
      const activeChild = item.children.find((child) => child.id === activeItemId);

      return (
        <li className="side-navigation__item" key={item.id}>
          <div className="side-navigation__item-row" data-active={active ? 'true' : 'false'}>
            {renderLink(activeChild ?? item)}
          </div>
        </li>
      );
    }

    return (
      <li className="side-navigation__item" key={item.id}>
        <div
          className="side-navigation__item-row"
          data-active={active ? 'true' : 'false'}
        >
          {renderLink(item)}
          {!collapsed && item.children && (
            <button
              type="button"
              className="side-navigation__expand-button"
              aria-label={`${open ? '收起' : '展开'}${item.label}`}
              aria-expanded={open}
              onClick={() => toggleItem(item.id)}
            >
              <ChevronIcon direction={open ? 'down' : 'right'} />
            </button>
          )}
        </div>
        {!collapsed && item.children && open && (
          <ul className="side-navigation__children">
            {item.children.map((child) => (
              <li key={child.id}>{renderLink(child, true)}</li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <aside
      className="side-navigation"
      data-collapsed={collapsed ? 'true' : 'false'}
      data-testid="side-navigation"
    >
      <div className="side-navigation__scroll-shell">
        <div
          ref={scrollRegionRef}
          className="side-navigation__scroll-region"
          data-testid="side-navigation-scroll-region"
          data-can-scroll-up={canScrollUp ? 'true' : 'false'}
          data-can-scroll-down={canScrollDown ? 'true' : 'false'}
          onScroll={() => {
            setTooltip(null);
            updateScrollMasks();
          }}
        >
          <nav aria-label="主导航">
            {groups.map((group) => (
              <section className="side-navigation__group" key={group.id}>
                {!collapsed && (
                  <h2 className="side-navigation__group-label">{group.label}</h2>
                )}
                <ul className="side-navigation__list">
                  {group.items.map(renderItem)}
                </ul>
              </section>
            ))}
          </nav>
        </div>
        <div
          className="side-navigation__scroll-mask side-navigation__scroll-mask--top"
          data-visible={canScrollUp ? 'true' : 'false'}
          data-testid="side-navigation-scroll-mask-top"
          aria-hidden="true"
        />
        <div
          className="side-navigation__scroll-mask side-navigation__scroll-mask--bottom"
          data-visible={canScrollDown ? 'true' : 'false'}
          data-testid="side-navigation-scroll-mask-bottom"
          aria-hidden="true"
        />
      </div>
      <div
        className="side-navigation__fixed-footer"
        data-testid="side-navigation-fixed-footer"
      >
        <button
          type="button"
          className="side-navigation__collapse-button"
          aria-label={collapsed ? '展开侧边菜单' : '收起侧边菜单'}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <CollapseIcon collapsed={collapsed} />
          {!collapsed && <span>收起菜单</span>}
        </button>
      </div>
      {tooltip &&
        createPortal(
          <div
            className="side-navigation-tooltip"
            role="tooltip"
            style={{ top: tooltip.top, left: tooltip.left }}
          >
            {tooltip.label}
          </div>,
          document.body,
        )}
    </aside>
  );
}
