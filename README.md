# 算力资源服务平台

本仓库包含企业算力资源服务平台的前端应用。“算力资源服务平台”为可配置的工作名称，产品名称和 Logo 通过运行配置统一管理。

## 当前能力

AppShell 提供顶部导航、可展开侧栏、自适应主内容区、标准页面标题栏和正式信息架构菜单；公共 UI 从 `src/components/ui/index.ts` 统一导出。

`/marketplace` 提供云服务器与物理机资源目录，支持类型切换、搜索、站点与规格筛选、条件回显、组合过滤、结果数量、分页、可配置状态，以及加载、错误重试、空目录和无结果状态。

`/marketplace/cloud-server/purchase` 与 `/marketplace/physical-machine/purchase` 共用配置骨架、实时摘要、全表校验、确认 Modal、提交状态、草稿与离开提醒。云服务器支持固定 30 GB 系统盘、HostPath/NFS 数据存储、可选镜像和网络配置；物理机提供标准交付说明和网络访问意向。提交反馈使用正式的申请与处理中状态，不声明支付、订单或资源已由外部系统完成。

`/resources/cloud-servers` 与 `/resources/physical-machines` 提供两类资源列表、组合筛选、URL 状态恢复、分页和完整页面状态。详情页提供概览、监控、存储、网络与访问、软件与环境、操作记录；云服务器可提交启动、停止、重启和修改名称请求，物理机电源与两类资源释放能力在需求确认前保持禁用。

## 技术栈

- React 19
- TypeScript 5（严格模式）
- Vite 7
- React Router 7
- ESLint 9
- Vitest 4、React Testing Library、jsdom

项目使用 npm，并只提交 `package-lock.json`，不混用其他锁文件。

## 环境要求

- Node.js `^20.19.0` 或 `>=22.12.0`
- npm `>=10`

## 安装和启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

默认开发地址由 Vite 在启动时输出。商城视觉与交互可重点检查：

```text
http://127.0.0.1:5173/marketplace?type=cloud
http://127.0.0.1:5173/marketplace?type=physical
http://127.0.0.1:5173/marketplace?viewState=loading
http://127.0.0.1:5173/marketplace?viewState=error
http://127.0.0.1:5173/marketplace?viewState=empty
http://127.0.0.1:5173/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east
http://127.0.0.1:5173/marketplace/cloud-server/purchase?product=catalog-cloud-gpu-g1-east
http://127.0.0.1:5173/marketplace/physical-machine/purchase?product=catalog-physical-cpu-p1-east
http://127.0.0.1:5173/resources/cloud-servers
http://127.0.0.1:5173/resources/cloud-servers/cs-east-001
http://127.0.0.1:5173/resources/physical-machines
http://127.0.0.1:5173/resources/physical-machines/pm-east-002
```

根目录 `AGENTS.md` 规定前端任务只进行临时浏览器检查，不生成、保存或提交页面评审截图；最终视觉验收由用户在本地浏览器完成。

## 工程检查

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

测试监听模式和生产构建预览：

```bash
npm run test
npm run preview
```

`typecheck` 只检查类型，不生成文件；`test` 进入监听模式，`test:run` 一次性执行。

## 目录结构

```text
public/                 静态资源目录（当前为空）
src/
├── assets/fonts/       项目负责人提供的本地字体资产（仅一份 WOFF2）
├── app/                应用根节点、集中路由、页面定义、AppShell 和错误边界
├── components/ui/      公共组件及统一导出入口
├── config/             产品身份与运行模式配置
├── features/
│   ├── marketplace/    商城业务组件、类型、资源目录、访问层和返回上下文
│   ├── purchase/       两类购买配置、共享网络编辑器、校验、摘要和提交状态
│   └── resources/      两类资源模型、访问层、列表详情组件和基础操作
├── pages/              商城、购买配置、资源管理、服务状态、内部组件检查和 404 页
├── shared/types/       后续共享类型入口
├── styles/             Token、浅色主题、Reset 与基础样式
├── test/               Vitest/jsdom 测试环境初始化
├── theme/              CSS 变量引用与 Token 契约测试
├── main.tsx            浏览器入口
└── vite-env.d.ts       Vite 环境变量类型
```

## 路由

- `/`：重定向到默认正式模块 `/marketplace`
- `/marketplace`：`MKT-01` 正式资源商城；`?type=cloud|physical` 保留资源类型
- `/marketplace?viewState=loading|error|empty`：资源目录状态入口，不进入正式菜单
- `/marketplace/cloud-server/purchase?product=<ID>`：`BUY-01` 云服务器配置
- `/marketplace/physical-machine/purchase?product=<ID>`：`BUY-02` 物理机配置
- 两个购买页支持 `viewState=loading|error` 状态入口，不进入正式菜单
- `/resources/cloud-servers`：`RES-01` 云服务器列表
- `/resources/cloud-servers/:resourceId`：`RES-02` 云服务器详情
- `/resources/physical-machines`：`RES-03` 物理机列表
- `/resources/physical-machines/:resourceId`：`RES-04` 物理机详情
- 两类资源列表支持 `viewState=loading|error|empty`，详情支持 `viewState=loading|error`；这些状态入口不进入正式菜单
- `/storage`、`/images`、`/software`、`/network-access`：对应正式模块入口
- `/orders`、`/operation-records`：订单与操作记录入口
- `/__dev/components/foundation`：基础公共组件内部检查页，不加入正式菜单
- `/__dev/components/advanced`：高级公共组件内部检查页，不加入正式菜单
- `/__dev/ui-spec`：UI 规范与 Design Token 内部检查页，不加入正式菜单
- `*`：404 页面

15 个稳定页面 ID 的路径、标题、模块和用途统一定义在 `src/app/routes.ts`；正式菜单定义在 `src/app/shell/navigation.ts`；路由装配位于 `src/app/router.tsx`。详情路由使用动态对象 ID 参数。购买入口按 `product` 查询参数读取同一商城规格。`/__dev/*` 仅在开发模式注册，生产构建不可访问。

## 环境变量

参考 `.env.example`：

- `VITE_DATA_MODE`：`fixture` 或 `api`，默认 `fixture`；无效值会警告并安全回退。
- `VITE_PRODUCT_DISPLAY_NAME`：可替换工作名称。
- `VITE_PRODUCT_LOGO_SRC`：可选 Logo 地址；正式品牌未确认前保持为空。

## UI 规范与 Token

- 原始 UI 规范：`docs/source/03-ui-design-spec.pdf.pdf`
- 字体资产：`src/assets/fonts/MiSansVF.woff2`
- 字体声明：`src/styles/fonts.css`
- Token 单一事实来源：`src/styles/tokens.css`
- 默认浅色主题：`src/styles/theme.css`
- 全局基础样式：`src/styles/base.css`
- TypeScript CSS 变量引用：`src/theme/tokenVars.ts`
- 内部检查路由：`/__dev/ui-spec`
- 工程说明：`docs/engineering/design-tokens.md`
- 应用框架说明：`docs/engineering/app-shell.md`
- 基础公共组件说明：`docs/engineering/components-foundation.md`
- 高级公共组件说明：`docs/engineering/components-advanced.md`
- 资源商城说明：`docs/engineering/marketplace.md`
- 资源商城视觉竞品研究：`docs/research/marketplace-visual-benchmark.md`
- 资源商城视觉重构：`docs/engineering/marketplace-visual-redesign.md`
- 购买配置说明：`docs/engineering/purchase-configuration.md`
- 资源管理说明：`docs/engineering/resource-management.md`
- 字体资产与授权边界记录：`docs/engineering/font-assets.md`
- 逐页映射、冲突、缺口与核验记录：`docs/engineering/ui-spec-*.md`

字体由项目负责人提供并明确允许在当前项目内使用，仓库当前不包含书面授权文件；未经再次确认不应独立对外分发。工程没有复制来源 Logo，也没有引入 UI 组件库或 CSS 框架。正式产品名称和 Logo 仍由 `src/config/product.ts` 配置。

字体使用 Vite 本地资产机制构建为带哈希的 WOFF2 文件；内部检查页会显示字体加载状态、回退链、5 级字号和连续字重。

## 当前未实现

- 字体在目标 Windows/macOS 环境的像素级渲染复核与书面授权归档
- 存储、镜像、软件、网络、订单和操作记录的独立完整业务能力
- 商城与资源管理之外的数据访问服务和真实 API 客户端
- 资源查询、监控、操作受理、物理机电源、资源释放和 BMC 授权的真实后端能力
- 价格、支付、审批、权限、计费、资源状态或订单状态规则

`30 GB` 作为云服务器当前固定系统盘容量。完整筛选不进入 URL；同一浏览会话从购买页返回时通过版本化导航上下文恢复，直接刷新商城则只由 URL 恢复资源类型。状态参数不属于正式业务能力。

后续实现必须继续遵守根目录 `AGENTS.md` 和 `docs/analysis/` 中的需求约束。
