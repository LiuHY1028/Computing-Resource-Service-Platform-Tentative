# 算力资源服务平台

企业算力资源服务平台纯前端应用。资源商城、软件中心和控制台使用独立布局，复用统一字体、公共 UI 组件和领域数据，全部业务数据随前端代码打包。

## 直接查看

双击打开：

```text
release/算力资源服务平台.html
```

文件可单独复制，通过 `file://` 和 Hash 路由运行，不需要安装 Node、启动服务或连接互联网。空 Hash 自动进入资源商城。

## 源码开发

环境要求：Node.js `^20.19.0` 或 `>=22.12.0`，npm `>=10`。

```bash
npm install
npm run dev
```

Vite 开发地址以终端输出为准。正式构建和独立 HTML 构建分别使用：

```bash
npm run build
npm run build:offline
npm run verify:offline
npm run verify:pricing
npm run verify:relations
```

## 应用结构

- `src/app/`：Hash 路由、三套布局、控制台菜单和错误边界。
- `src/components/ui/`：公共 UI 组件及统一导出。
- `src/features/*/data/`：随应用打包的目录与配置数据。
- `src/features/*/state/`：领域状态、操作和跨模块关联。
- `src/features/pricing/`：SKU 价目、整数分报价、统一格式化和价格快照。
- `src/features/platform/`：可选浏览器存储与兼容能力。
- `src/pages/`：正式页面及只在开发环境注册的组件检查页。
- `release/算力资源服务平台.html`：可直接打开的交付文件。

资源、存储、镜像、软件、网络、订单和操作记录使用稳定 ID 联动。运行中的修改以内存状态为准；浏览器存储可用时会保存部分状态，不可用时自动回退到内存。刷新后恢复内置初始数据是允许的，核心功能不依赖持久化能力。

## 正式路由

- 资源商城：`#/marketplace` 及 `#/marketplace/*` 购买配置。
- 软件中心：`#/software`。
- 控制台：`#/console/resources/*`、`#/console/storage/*`、`#/console/images`、`#/console/network-access`、`#/console/orders/*`、`#/console/operation-records`。

根路径进入资源商城；旧的资源、存储、镜像、网络、订单和操作记录路径会保留查询参数并重定向到 `/console/*`。未知 Hash 显示 404，开发检查路由不会进入正式构建。

商城与软件中心使用无侧栏的独立顶部导航；控制台保留侧栏，并在顶栏提供前往商城和软件中心的跨区入口。

## 自动检查

```bash
npm run typecheck
npm run lint
npm run test:run
npm run verify:pricing
npm run verify:relations
npm run build
npm run build:offline
npm run verify:offline
git diff --check
```

完整工程约束见 `AGENTS.md`，离线交付边界见 `docs/engineering/offline-delivery.md`。
