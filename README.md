# 算力资源服务平台

企业算力资源服务平台纯前端应用。资源商城与软件中心共用品牌基础，控制台提供计算资源、独立存储、文件管理、镜像、网络、订单、账单和操作记录，全部数据随前端代码打包。

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
npm run verify:storage
npm run verify:ui
npm run verify:visual-structure
npm run verify:status
npm run verify:commerce
```

## 应用结构

- `src/app/`：Hash 路由、三套布局、控制台菜单和错误边界。
- `src/components/ui/`：公共 UI 组件及统一导出，包含可扩展数据表格和容量使用率体系。
- `src/features/*/data/`：随应用打包的目录与配置数据。
- `src/features/*/state/`：领域状态、操作和跨模块关联。
- `src/features/pricing/`：SKU 价目、整数分报价、统一格式化和价格快照。
- `src/features/commerce/`、`src/features/orders/`、`src/features/bills/`：交易编排、订单、账单和应用内收银台状态。
- `src/features/files/`：离线文件树、文件操作、撤销记录和任务中心。
- `src/features/platform/`：可选浏览器存储与兼容能力。
- `src/pages/`：正式页面及只在开发环境注册的组件检查页。
- `release/算力资源服务平台.html`：可直接打开的交付文件。

资源、存储、镜像、软件、网络、订单、账单和操作记录使用稳定 ID 联动。每个业务对象只展示一个主状态，健康、到期、容量和计费信息作为辅助事实呈现。预付费购买、续费、续租、收费扩容和收费变配创建订单与账单；免费运维操作直接执行并写入操作记录。数据密集页面共享表格工具栏、排序、密度、选择和状态反馈，容量信息统一展示已用、总量、剩余和风险。文件管理器提供紧凑命令栏、快速访问、列表/网格、按需详情面板、上下文菜单、任务抽屉及本地撤销。运行中的修改以内存状态为准；浏览器存储可用时会保存部分状态，不可用时自动回退到内存。刷新后恢复内置初始数据是允许的，核心功能不依赖持久化能力。

## 正式路由

- 资源商城：`#/marketplace` 及 `#/marketplace/*` 购买配置。
- 软件中心：`#/software`。
- 控制台：`#/console/resources/*`、`#/console/storage`、`#/console/storage/purchase`、`#/console/storage/:storageId/files`、镜像、网络、订单、账单和操作记录。
- 交易：`#/checkout/:orderId`、`#/console/orders/:orderId` 与 `#/console/bills/:billId`。

根路径进入资源商城；旧的资源、存储、镜像、网络、订单和操作记录路径会保留查询参数并重定向到 `/console/*`。未知 Hash 显示 404，开发检查路由不会进入正式构建。

商城与软件中心使用无侧栏的独立页面和同一套 56px 白色顶部导航、1200px 内容版心与深色多栏页尾；控制台保留侧栏，并在顶栏提供前往商城和软件中心的跨区入口。

资源商城按“蓝色算力 Hero—四项能力—真实价格矩阵—完整筛选目录—GPU 规格对比—购买说明”组织。价格矩阵和商品卡均读取同一商品目录与统一价目，规格对比中的进度只表达当前可购买卡数规模，不表示理论性能。

软件中心按“软件部署 Hero—四项能力—精选版本矩阵—完整软件目录—资源适配与安装覆盖—安装说明”组织。版本、费用、兼容资源和覆盖率均由现有软件、价格、资源与安装关系派生；详情、目标资源选择、订单或安装任务、操作记录和资源详情联动保持一致。

参考结构与三种桌面视口的实测记录见 [`docs/engineering/public-product-reference-rebuild.md`](docs/engineering/public-product-reference-rebuild.md)。

## 自动检查

```bash
npm run typecheck
npm run lint
npm run test:run
npm run verify:pricing
npm run verify:relations
npm run verify:storage
npm run verify:ui
npm run verify:visual-structure
npm run verify:status
npm run verify:commerce
npm run build
npm run build:offline
npm run verify:offline
git diff --check
```

完整工程约束见 `AGENTS.md`，离线交付边界见 `docs/engineering/offline-delivery.md`。
