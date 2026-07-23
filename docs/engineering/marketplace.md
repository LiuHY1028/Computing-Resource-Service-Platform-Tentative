# 资源商城

## 范围

`#/marketplace` 展示云服务器和物理机两类资源，支持类型切换、搜索、站点、计算类型、加速卡规格、可配置性筛选、条件移除与分页。可配置商品进入对应配置页，不可配置商品保留可见原因和禁用反馈。

页面继续遵守 `REQ-002/003/005/007/013/016/020/022/023` 及相关决策：云服务器与物理机语义分离，`30 GB` 只表示云服务器暂定系统盘容量，不显示价格、支付、审批或库存规则。

## 数据与状态

`src/features/marketplace/data/marketplaceCatalog.ts` 包含类型安全的商品目录、筛选选项和同步查询。查询只处理随应用打包的数据，不产生等待、超时、请求取消或远程错误状态。

页面保留有意义的状态：正常结果、目录为空、筛选无结果、不可配置与路由商品不存在。筛选、分页和滚动上下文由 `state/marketplaceNavigationState.ts` 管理；浏览器会话存储不可用时安全回退。

商品 ID 被配置页复用，不建立第二份规格。返回商城时恢复资源类型、筛选、页码和滚动上下文；直接刷新时由 Hash 路由和查询参数恢复可表达的状态。

## 视觉与公共组件

页面复用 AppShell、PageTitleBar、Container、TitleBarTabs、SearchInput、Select、MultiSelect、FilterTag、Button、Tooltip、Grid 和 Pagination。1920 视口使用四列商品卡，1366 视口使用三列；业务 CSS 集中在商城范围内并遵守公共 Token 与减少动效设置。
