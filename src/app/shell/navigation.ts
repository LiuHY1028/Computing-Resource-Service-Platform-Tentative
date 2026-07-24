import { getAppPageRoute, type PageId } from '../routes';

export type NavigationIconName =
  | 'marketplace'
  | 'resources'
  | 'storage'
  | 'images'
  | 'software'
  | 'network'
  | 'orders'
  | 'operations';

export type NavigationItem = Readonly<{
  id: string;
  label: string;
  path: string;
  icon: NavigationIconName;
  pageTitle: string;
  pageId?: PageId;
  children?: readonly NavigationItem[];
}>;

export type NavigationGroup = Readonly<{
  id: string;
  label: string;
  items: readonly NavigationItem[];
}>;

function pageNavigationItem(
  id: string,
  pageId: PageId,
  icon: NavigationIconName,
): NavigationItem {
  const route = getAppPageRoute(pageId);

  return Object.freeze({
    id,
    label: route.navigationLabel,
    path: route.path,
    icon,
    pageTitle: route.pageTitle,
    pageId,
  });
}

const ordersItem = pageNavigationItem('orders', 'ORD-01', 'orders');
const billsItem = pageNavigationItem('bills', 'BILL-01', 'orders');
const operationRecordsItem = pageNavigationItem(
  'operation-records',
  'OPS-01',
  'operations',
);

const recordsNavigationItem: NavigationItem = Object.freeze({
  id: 'records',
  label: '订单与账单',
  path: ordersItem.path,
  icon: 'orders',
  pageTitle: ordersItem.pageTitle,
  children: Object.freeze([ordersItem, billsItem, operationRecordsItem]),
});

export const navigationGroups: readonly NavigationGroup[] = Object.freeze([
  Object.freeze({
    id: 'product-navigation',
    label: '控制台',
    items: Object.freeze([
      // 云服务器/物理机暂时使用页面内标签关系，不拆成一级菜单，见 OQ-058。
      pageNavigationItem('resources', 'RES-01', 'resources'),
      pageNavigationItem('storage', 'STO-01', 'storage'),
      pageNavigationItem('images', 'IMG-01', 'images'),
      pageNavigationItem('network-access', 'NET-01', 'network'),
      recordsNavigationItem,
    ]),
  }),
]);

export function flattenNavigationItems(
  groups: readonly NavigationGroup[] = navigationGroups,
) {
  return groups.flatMap((group) =>
    group.items.flatMap((item) => [item, ...(item.children ?? [])]),
  );
}
