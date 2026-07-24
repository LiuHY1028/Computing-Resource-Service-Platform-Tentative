# 三套布局拆分影响分析

## 本次拆分的事实来源

- Task 11 明确将资源商城、软件中心、控制台拆为三类体验，并规定 `/marketplace/*`、`/software/*`、`/console/*` 路由边界。
- `docs/analysis/01-requirements-baseline.md` 的 `REQ-007`、`BR-004` 确认商城与购后管理分离；`REQ-017` 确认软件安装到机器的能力。
- `docs/analysis/06-user-flows.md` 要求购买、安装、资源、订单与操作记录保持跨页一致。
- 当前 `src/app/router.tsx` 将所有正式页面置于同一个 `AppShell`；`src/app/shell/navigation.ts` 同时把商城、软件和管理模块放入侧栏。

## 受影响模块

| 模块 | 影响 |
|---|---|
| 路由与标题 | 正式后台路由增加 `/console` 前缀；根路径进入商城；旧路径重定向；三套布局分别更新页面标题 |
| 应用布局 | 新增 `MarketplaceLayout`、`SoftwareCenterLayout`、`ConsoleLayout`；商城和软件中心不再经过控制台侧栏 |
| 全局导航 | 商城、软件中心、控制台顶部互相可达；控制台侧栏移除商城和软件中心 |
| 商城与购买 | 保留 URL 类型状态、筛选、价格排序、规格卡、草稿、配置、确认和提交；成功后的订单入口改为控制台路径 |
| 软件与安装 | 保留分类、兼容性、版本、目标资源和安装状态；增加独立发现区与详情区；结果跳转到控制台资源或操作记录 |
| 资源与详情 | 列表、详情、软件环境、镜像、存储、网络、订单和操作记录链接统一改为 `/console/*` |
| 存储、镜像、网络 | 列表和详情主路径迁移；领域状态写入的 `targetPath` 同步迁移 |
| 订单与操作记录 | 列表、详情、购买成功入口和记录目标路径迁移；购买配置快照与统一价格目录不变 |
| 测试与验证器 | 路由、应用壳、导航、页面跳转、关系验证、主题策略和离线 Hash 路由断言更新 |
| 离线交付 | 单 HTML 继续使用 `HashRouter`；需要覆盖三套布局、重定向、刷新和前进后退 |

## 必须同步修改的模块

- `src/app/routes.ts`、`src/app/router.tsx`、三套布局组件及控制台导航必须同批修改，避免标题、菜单高亮和 404 判断使用不同路由表。
- 所有页面内 `Link` / `navigate`、资源/存储/网络/软件/订单状态层写入的 `targetPath`、初始操作记录路径必须统一迁移。
- 购买成功页、软件安装结果、资源详情关联入口、空状态 CTA 必须使用同一组路径构造函数。
- `scripts/verify-relations.mjs`、相关单元测试、`README.md`、`docs/engineering/offline-delivery.md` 和离线产物必须同步更新。
- 商城、软件中心只改变页面组合和视觉，不复制领域目录、价格目录、资源数据、安装状态或订单状态。

## 旧路径如何处理

| 旧路径 | 新路径 | 处理 |
|---|---|---|
| `/resources/cloud-servers` 与详情 | `/console/resources/cloud-servers` 与详情 | 保留查询参数并替换重定向 |
| `/resources/physical-machines` 与详情 | `/console/resources/physical-machines` 与详情 | 保留查询参数并替换重定向 |
| `/storage` 与详情 | `/console/storage` 与详情 | 保留查询参数并替换重定向 |
| `/images` | `/console/images` | 保留查询参数并替换重定向 |
| `/network-access` | `/console/network-access` | 保留查询参数并替换重定向 |
| `/orders` 与详情 | `/console/orders` 与详情 | 保留查询参数并替换重定向 |
| `/operation-records` | `/console/operation-records` | 保留查询参数并替换重定向 |
| `/marketplace`、`/marketplace/*` | 不变 | 进入 `MarketplaceLayout` |
| `/software` | 不变 | 进入 `SoftwareCenterLayout` |
| `/` | `/marketplace` | 替换重定向 |
| 其他路径 | 无 | 显示 404，不归入任一错误布局 |

## 不受影响的模块

- 统一价格目录、价格计算和金额格式化逻辑。
- 商城商品目录、资源、存储、镜像、软件、网络、订单和操作记录的领域模型与持久化键。
- 公共 UI 组件 API、Design Token、控制台列表和详情的既有交互规则。
- 纯前端、无网络请求、无人工延迟、单一离线 HTML 的交付方式。
- 开放问题、产品边界以及未确认的计费、支付、审批、权限、库存和交付规则。
