# 算力资源服务平台交互原型

本仓库用于构建企业算力资源服务平台的高保真交互原型。“算力资源服务平台”目前只是可替换的工作名称，不代表正式产品品牌。

## 当前阶段

Task 03（应用框架）、Task 04A（基础公共组件）和 Task 04B（高级公共组件）已经完成。AppShell 提供 56 px 顶部导航、208/64 px 可展开侧栏、自适应主内容区、64 px 页面标题栏、正式信息架构菜单和 15 个稳定页面 ID；公共 UI 从 `src/components/ui/index.ts` 统一导出，并在两个不进入正式菜单的开发页中验证。

Task 05A 已把 `/marketplace` 替换为第一个正式业务页面：资源商城支持云服务器/物理机切换、搜索、站点与规格筛选、条件回显、组合过滤、结果数量、分页、可配置/不可配置商品，以及 Loading、Error/Retry、Empty 和 No Result 状态。商城通过类型安全的本地演示数据访问层工作，不包含真实库存、价格、计费、审批或订单规则。

Task 05A 视觉重构在现有 UI 规范内引入低饱和蓝白商城气氛、居中分类导航、类型化商品分区和“浅色头部 + 2 × 2 核心指标 + 浅色操作带”卡片。1920 为四列、1366 为三列，云服务器与物理机、CPU 与 GPU 通过页面级蓝/青/紫装饰 Token 区分；商品数据、筛选业务、状态逻辑、购买入口和公共组件 API 均未改变。参考取舍与实测对比见 `docs/engineering/marketplace-visual-redesign.md`。

`/marketplace/cloud-server/purchase` 和 `/marketplace/physical-machine/purchase` 已作为明确购买入口接通，目前仍是 Task 05A 的范围说明与返回商城占位页；完整购买配置由 Task 05B 接管。其余业务模块继续使用稳定占位路由。

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
http://127.0.0.1:5173/marketplace?demoState=loading
http://127.0.0.1:5173/marketplace?demoState=error
http://127.0.0.1:5173/marketplace?demoState=empty
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
├── components/ui/      Task 04A/04B 公共组件及统一导出入口
├── config/             产品身份与运行模式配置
├── features/
│   └── marketplace/    商城业务组件、类型、本地演示数据和最小数据访问层
├── pages/              商城、购买入口占位、模块占位、开发验证和 404 页
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
- `/marketplace?demoState=loading|error|empty`：仅用于商城开发验收，不进入正式菜单
- `/marketplace/cloud-server/purchase`：`BUY-01` 云服务器购买配置入口，完整表单由 Task 05B 实现
- `/marketplace/physical-machine/purchase`：`BUY-02` 物理机购买配置入口，完整表单由 Task 05B 实现
- `/resources/cloud-servers`：`RES-01` 云服务器列表占位页
- `/storage`、`/images`、`/software`、`/network-access`：对应正式模块占位页
- `/orders`、`/operation-records`：订单与操作记录占位页
- `/__dev/components/foundation`：Task 04A 基础公共组件验证页，不加入正式菜单
- `/__dev/components/advanced`：Task 04B 高级公共组件验证页，不加入正式菜单
- `/__dev/ui-spec`：UI 规范 Design Token 开发验证页，不加入正式菜单
- `*`：404 页面

15 个稳定页面 ID 的路径、标题、模块和用途统一定义在 `src/app/routes.ts`；正式菜单定义在 `src/app/shell/navigation.ts`；路由装配位于 `src/app/router.tsx`。详情路由使用动态对象 ID 参数。当前只有商城具有业务演示数据；购买入口按 `product` 查询参数回显同一商城规格，不创建订单或资源。

## 环境变量

参考 `.env.example`：

- `VITE_DATA_MODE`：`mock` 或 `api`，默认 `mock`。当前只校验并暴露模式，不创建 Mock 服务或 API 客户端；无效值会警告并安全回退到 `mock`。
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
- 验证路由：`/__dev/ui-spec`
- 工程说明：`docs/engineering/design-tokens.md`
- 应用框架说明：`docs/engineering/app-shell.md`
- 基础公共组件说明：`docs/engineering/components-foundation.md`
- 高级公共组件说明：`docs/engineering/components-advanced.md`
- 资源商城说明：`docs/engineering/marketplace.md`
- 资源商城视觉竞品研究：`docs/research/marketplace-visual-benchmark.md`
- 资源商城视觉重构：`docs/engineering/marketplace-visual-redesign.md`
- 字体资产与授权边界记录：`docs/engineering/font-assets.md`
- 逐页映射、冲突、缺口与核验记录：`docs/engineering/ui-spec-*.md`

字体由项目负责人提供并明确允许在当前项目内使用，仓库当前不包含书面授权文件；未经再次确认不应独立对外分发。工程没有复制来源 Logo，也没有引入 UI 组件库或 CSS 框架。正式产品名称和 Logo 仍由 `src/config/product.ts` 配置。

字体使用 Vite 本地资产机制构建为带哈希的 WOFF2 文件；开发验证页会显示字体加载状态、回退链、5 级字号和连续字重。浏览器已确认三条当前路由字体加载正常且无字体 404，验证页混排与字重样例实际命中 `MiSans VF`。

## 当前未实现

- 字体在目标 Windows/macOS 环境的像素级渲染复核与书面授权归档
- Task 05B 的完整云服务器/物理机购买配置、确认、提交与结果流程
- 我的资源、存储、镜像、软件、网络、订单和操作记录正式业务页面
- 商城之外的业务 Mock 数据；Mock HTTP 接口和真实 API 客户端
- 价格、支付、审批、权限、计费、资源状态或订单状态规则

商城当前的站点、规格、加速卡、可配置性和 4/8 卡物理机均为明确标记的中性演示数据；`30 GB` 只作为云服务器默认系统盘的暂定存储容量。筛选深链只保留资源类型，其他筛选条件不跨刷新持久化。开发状态参数不属于正式业务能力。

后续实现必须继续遵守根目录 `AGENTS.md` 和 `docs/analysis/` 中的需求约束。
