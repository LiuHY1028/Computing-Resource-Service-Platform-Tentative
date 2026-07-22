import { matchPath } from 'react-router-dom';

export type PageId =
  | 'MKT-01'
  | 'BUY-01'
  | 'BUY-02'
  | 'RES-01'
  | 'RES-02'
  | 'RES-03'
  | 'RES-04'
  | 'STO-01'
  | 'STO-02'
  | 'IMG-01'
  | 'SW-01'
  | 'NET-01'
  | 'ORD-01'
  | 'ORD-02'
  | 'OPS-01';

export type AppPageRoute = Readonly<{
  pageId: PageId;
  path: string;
  pageTitle: string;
  navigationLabel: string;
  moduleLabel: string;
  purpose: string;
  implementationPhase: string;
  navigationItemId: string;
  relatedPageIds: readonly PageId[];
}>;

export type DevelopmentShellRoute = Readonly<{
  path: string;
  pageTitle: string;
  navigationItemId: string;
}>;

export const APP_PAGE_ROUTES: readonly AppPageRoute[] = Object.freeze([
  {
    pageId: 'MKT-01',
    path: '/marketplace',
    pageTitle: '资源商城',
    navigationLabel: '资源商城',
    moduleLabel: '资源商城',
    purpose: '浏览云服务器与物理机两类可购计算资源，并进入对应的购买配置。',
    implementationPhase: '阶段 5：资源商城',
    navigationItemId: 'marketplace',
    relatedPageIds: ['BUY-01', 'BUY-02'],
  },
  {
    pageId: 'BUY-01',
    path: '/marketplace/cloud-server/purchase',
    pageTitle: '云服务器购买配置',
    navigationLabel: '云服务器购买配置',
    moduleLabel: '资源商城',
    purpose: '配置云服务器的站点、规格、镜像、系统盘与适用的数据存储。',
    implementationPhase: '阶段 6：购买配置流程',
    navigationItemId: 'marketplace',
    relatedPageIds: ['MKT-01', 'STO-01', 'IMG-01'],
  },
  {
    pageId: 'BUY-02',
    path: '/marketplace/physical-machine/purchase',
    pageTitle: '物理机购买配置',
    navigationLabel: '物理机购买配置',
    moduleLabel: '资源商城',
    purpose: '配置物理机的站点与整机规格，并保留尚未确认的交付规则边界。',
    implementationPhase: '阶段 6：购买配置流程',
    navigationItemId: 'marketplace',
    relatedPageIds: ['MKT-01'],
  },
  {
    pageId: 'RES-01',
    path: '/resources/cloud-servers',
    pageTitle: '云服务器列表',
    navigationLabel: '我的资源',
    moduleLabel: '我的资源',
    purpose: '查看已购云服务器，并进入对应资源详情和适用的资源管理入口。',
    implementationPhase: '阶段 7：我的资源',
    navigationItemId: 'resources',
    relatedPageIds: ['RES-03', 'MKT-01'],
  },
  {
    pageId: 'RES-02',
    path: '/resources/cloud-servers/:resourceId',
    pageTitle: '云服务器详情',
    navigationLabel: '云服务器详情',
    moduleLabel: '我的资源',
    purpose: '查看云服务器规格、连接、存储、网络、软件与监控信息。',
    implementationPhase: '阶段 8：资源详情和监控',
    navigationItemId: 'resources',
    relatedPageIds: ['RES-01', 'STO-01', 'SW-01', 'NET-01', 'ORD-01'],
  },
  {
    pageId: 'RES-03',
    path: '/resources/physical-machines',
    pageTitle: '物理机列表',
    navigationLabel: '物理机列表',
    moduleLabel: '我的资源',
    purpose: '查看已购物理机，并进入对应详情和已确认适用的管理入口。',
    implementationPhase: '阶段 7：我的资源',
    navigationItemId: 'resources',
    relatedPageIds: ['RES-01', 'MKT-01'],
  },
  {
    pageId: 'RES-04',
    path: '/resources/physical-machines/:resourceId',
    pageTitle: '物理机详情',
    navigationLabel: '物理机详情',
    moduleLabel: '我的资源',
    purpose: '查看物理机整机规格、连接信息、网络、软件与适用监控。',
    implementationPhase: '阶段 8：资源详情和监控',
    navigationItemId: 'resources',
    relatedPageIds: ['RES-03', 'SW-01', 'NET-01', 'ORD-01'],
  },
  {
    pageId: 'STO-01',
    path: '/storage',
    pageTitle: '存储空间列表',
    navigationLabel: '存储管理',
    moduleLabel: '存储管理',
    purpose: '独立查看和管理本地数据存储与高性能共享存储空间。',
    implementationPhase: '阶段 9：存储、镜像、软件和网络',
    navigationItemId: 'storage',
    relatedPageIds: ['MKT-01', 'RES-01'],
  },
  {
    pageId: 'STO-02',
    path: '/storage/:storageId',
    pageTitle: '存储空间详情',
    navigationLabel: '存储空间详情',
    moduleLabel: '存储管理',
    purpose: '查看存储空间属性及其与计算资源之间的挂载关系。',
    implementationPhase: '阶段 9：存储、镜像、软件和网络',
    navigationItemId: 'storage',
    relatedPageIds: ['STO-01', 'RES-01'],
  },
  {
    pageId: 'IMG-01',
    path: '/images',
    pageTitle: '镜像管理',
    navigationLabel: '镜像管理',
    moduleLabel: '镜像管理',
    purpose: '管理云服务器购买与创建流程中可选择的镜像及上传入口。',
    implementationPhase: '阶段 9：存储、镜像、软件和网络',
    navigationItemId: 'images',
    relatedPageIds: ['MKT-01'],
  },
  {
    pageId: 'SW-01',
    path: '/software',
    pageTitle: '软件中心',
    navigationLabel: '软件中心',
    moduleLabel: '软件中心',
    purpose: '从软件目录选择软件或环境，并进入目标资源安装流程。',
    implementationPhase: '阶段 9：存储、镜像、软件和网络',
    navigationItemId: 'software',
    relatedPageIds: ['RES-01', 'OPS-01'],
  },
  {
    pageId: 'NET-01',
    path: '/network-access',
    pageTitle: '网络与访问',
    navigationLabel: '网络与访问',
    moduleLabel: '网络与访问',
    purpose: '按资源查看和管理端口暴露、转发关系与允许访问的 IP。',
    implementationPhase: '阶段 9：存储、镜像、软件和网络',
    navigationItemId: 'network-access',
    relatedPageIds: ['RES-01', 'OPS-01'],
  },
  {
    pageId: 'ORD-01',
    path: '/orders',
    pageTitle: '订单列表',
    navigationLabel: '订单',
    moduleLabel: '订单与记录',
    purpose: '查看资源购买记录，不展示尚未确认的价格、支付或账务字段。',
    implementationPhase: '阶段 10：订单与操作记录',
    navigationItemId: 'orders',
    relatedPageIds: ['MKT-01', 'RES-01', 'OPS-01'],
  },
  {
    pageId: 'ORD-02',
    path: '/orders/:orderId',
    pageTitle: '订单详情',
    navigationLabel: '订单详情',
    moduleLabel: '订单与记录',
    purpose: '查看单次购买的配置快照、处理反馈与关联资源入口。',
    implementationPhase: '阶段 10：订单与操作记录',
    navigationItemId: 'orders',
    relatedPageIds: ['ORD-01', 'RES-01'],
  },
  {
    pageId: 'OPS-01',
    path: '/operation-records',
    pageTitle: '操作记录',
    navigationLabel: '操作记录',
    moduleLabel: '订单与记录',
    purpose: '查看资源、存储、网络与软件操作的结果和可追踪信息。',
    implementationPhase: '阶段 10：订单与操作记录',
    navigationItemId: 'operation-records',
    relatedPageIds: ['RES-01', 'STO-01', 'SW-01', 'NET-01', 'ORD-01'],
  },
]);

export const DEFAULT_APP_ROUTE = APP_PAGE_ROUTES[0];

export const FOUNDATION_COMPONENTS_ROUTE: DevelopmentShellRoute = Object.freeze({
  path: '/__dev/components/foundation',
  pageTitle: '基础交互组件',
  navigationItemId: '',
});

export function getAppPageRoute(pageId: PageId) {
  const route = APP_PAGE_ROUTES.find((candidate) => candidate.pageId === pageId);

  if (!route) {
    throw new Error(`Application route ${pageId} is not registered.`);
  }

  return route;
}

export function findAppPageRoute(pathname: string) {
  return APP_PAGE_ROUTES.find((route) =>
    matchPath({ path: route.path, end: true }, pathname),
  );
}

export function findShellPageRoute(pathname: string) {
  return (
    findAppPageRoute(pathname) ??
    (matchPath(
      { path: FOUNDATION_COMPONENTS_ROUTE.path, end: true },
      pathname,
    )
      ? FOUNDATION_COMPONENTS_ROUTE
      : undefined)
  );
}
