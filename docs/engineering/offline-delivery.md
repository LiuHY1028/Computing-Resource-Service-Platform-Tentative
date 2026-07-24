# 单文件交付

## 纯前端架构

应用只运行在浏览器中。商品目录、计算资源、存储、镜像、软件、网络、订单和操作记录随 JavaScript 打包，不读取远程文件，也不使用 HTTP 数据边界。

## 静态数据位置

商品和购买配置数据位于各领域的 `data/`；统一价格目录位于 `src/features/pricing/data/priceCatalog.json`；资源、存储、镜像、软件、网络、订单与操作记录的内置初始数据位于对应 `state/*Store.ts`。对象通过稳定 ID 和价格快照保持跨模块一致。

## 前端状态边界

领域 Store 管理当前页面会话内的修改和关联操作。`persistence.ts` 以内存为可靠边界，并在浏览器存储可用时执行可选的版本化读写；所有存储访问均受保护。刷新后恢复内置初始数据可以接受，核心功能不依赖持久化。

## Hash 路由

应用使用 `HashRouter`。空 Hash 重定向到 `#/marketplace`，未知 Hash 显示 404；菜单、Tabs、详情、返回、跨模块跳转以及浏览器前进、后退和刷新不依赖服务器重写。开发路由只在开发环境注册。

## 单 HTML 构建

`vite.offline.config.ts` 使用单文件构建插件，将 JavaScript、CSS、MiSans VF、图标和数据内联，并禁用 Source Map、CSS 拆分和外部 Chunk。构建完成后生成：

```text
release/算力资源服务平台.html
```

## file 协议兼容

运行时不使用路径式路由、远程资源或动态 Chunk。复制操作优先使用 Clipboard API，失败时回退到临时文本选择；浏览器存储不可用时回退到内存状态，不弹出存储错误。

## 构建与验证

```bash
npm run build:offline
npm run verify:offline
npm run verify:pricing
npm run verify:relations
```

验证器检查目标文件、单文件结构、内联入口、样式、字体、外部资源、API 地址、动态 Chunk、开发路由和合理文件体积。
