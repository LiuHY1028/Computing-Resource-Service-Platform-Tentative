# 算力资源服务平台交互原型

本仓库用于构建企业算力资源服务平台的高保真交互原型。“算力资源服务平台”目前只是可替换的工作名称，不代表正式产品品牌。

## 当前阶段

Task 01（前端工程初始化）已经建立可运行、可检查、可扩展的工程骨架。当前只包含工程占位页与 404 页面，没有业务页面、业务 Mock 数据、Design Token、正式主题或公共业务组件。

下一阶段是 Design Token 和基础主题。

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

默认开发地址由 Vite 在启动时输出。

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
├── app/                应用根节点、集中路由和错误边界
├── config/             产品身份与运行模式配置
├── pages/              工程占位页和 404 页
├── shared/types/       后续共享类型入口
├── styles/             最小 Reset 与基础渲染样式
├── test/               Vitest/jsdom 测试环境初始化
├── main.tsx            浏览器入口
└── vite-env.d.ts       Vite 环境变量类型
```

## 路由

- `/`：工程初始化占位页
- `*`：404 页面

所有路径统一定义在 `src/app/router.tsx`，本阶段没有预注册业务路由。

## 环境变量

参考 `.env.example`：

- `VITE_DATA_MODE`：`mock` 或 `api`，默认 `mock`。当前只校验并暴露模式，不创建 Mock 服务或 API 客户端；无效值会警告并安全回退到 `mock`。
- `VITE_PRODUCT_DISPLAY_NAME`：可替换工作名称。
- `VITE_PRODUCT_LOGO_SRC`：可选 Logo 地址；正式品牌未确认前保持为空。

## 当前未实现

- Design Token、正式主题与 MiSans 字体资产
- 顶部导航、侧边栏、页面标题栏等应用框架
- Button、Input、Table 等公共 UI 组件
- 资源商城、购买、资源、存储、镜像、软件、网络、订单和操作记录页面
- 业务 Mock 数据、Mock 接口和真实 API 客户端
- 价格、支付、审批、权限、计费、资源状态或订单状态规则

后续实现必须继续遵守根目录 `AGENTS.md` 和 `docs/analysis/` 中的需求约束。
