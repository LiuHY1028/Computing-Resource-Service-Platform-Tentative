# 算力资源服务平台

企业算力资源服务平台前端应用。产品名称与 Logo 由运行配置统一管理，页面复用项目 Design Token、MiSans VF、AppShell 和公共 UI 组件。

## 启动

环境要求：Node.js `^20.19.0` 或 `>=22.12.0`，npm `>=10`。

```bash
npm install
cp .env.example .env.local
npm run dev
```

Vite 默认本地地址为 `http://127.0.0.1:5173`。生产构建预览使用：

```bash
npm run build
npm run preview
```

## 正式页面

- `/marketplace`：资源商城
- `/marketplace/cloud-server/purchase?product=<ID>`：云服务器配置
- `/marketplace/physical-machine/purchase?product=<ID>`：物理机配置
- `/resources/cloud-servers`：云服务器列表
- `/resources/cloud-servers/:resourceId`：云服务器详情
- `/resources/physical-machines`：物理机列表
- `/resources/physical-machines/:resourceId`：物理机详情
- `/storage`：存储管理
- `/storage/:storageId`：存储详情
- `/images`：镜像管理
- `/software`：软件中心
- `/network-access`：网络与访问
- `/orders`：订单列表
- `/orders/:orderId`：订单详情
- `/operation-records`：操作记录
- `*`：404

根路径 `/` 重定向到资源商城。`/__dev/*` 只在开发环境注册，不进入正式菜单，生产构建统一返回 404。

## 项目结构

```text
src/
├── app/                应用路由、AppShell、正式菜单和错误边界
├── assets/fonts/       MiSans VF 字体资产
├── components/ui/      公共 UI 组件及统一导出
├── config/             产品身份与运行配置
├── features/
│   ├── marketplace/    资源目录与筛选
│   ├── purchase/       云服务器和物理机配置
│   ├── resources/      计算资源列表、详情和基础操作
│   ├── storage/        存储空间与挂载关系
│   ├── images/         镜像目录与导入任务
│   ├── software/       软件目录与安装任务
│   ├── network/        网络连接与端口规则
│   ├── orders/         配置申请与处理进度
│   ├── operations/     统一操作记录
│   └── platform/       版本化本地持久化适配层
├── pages/              正式页面与仅开发环境页面
├── styles/             Design Token、主题和管理页样式
├── test/               测试环境
└── theme/              Token 与产品化策略测试
```

各领域 Repository 是页面数据读写边界；资源 ID 用于跨模块关联。订单、操作记录、存储、镜像、软件和网络状态通过版本化 `localStorage` 保留，购买表单草稿通过版本化 `sessionStorage` 保留。数据损坏或版本不兼容时，对应领域恢复到安全初始状态。

## 自动检查

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
git diff --check
```

## 后端接入边界

当前应用未连接真实支付、计费、审批、库存、资源编排、存储系统、镜像仓库、远程软件安装、安全组、公网 IP 分配、账号权限或凭据服务。配置申请、扩容、挂载、导入、安装和网络变更只记录应用内受理状态，不代表外部基础设施已经完成操作。

接入 API 时应保持现有领域边界：资源目录与资源身份、配置申请、存储与挂载、镜像与导入任务、软件与安装任务、网络规则、统一操作记录分别由对应服务提供；跨模块继续使用稳定的资源 ID、存储 ID、镜像 ID 和申请编号关联。

完整工程约束见根目录 `AGENTS.md`，交付边界见 `docs/engineering/final-delivery.md`。
