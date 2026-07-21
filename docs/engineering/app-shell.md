# 应用框架 AppShell

## 范围与依据

Task 03 实现可运行的桌面应用框架，不实现正式业务页面、业务数据或公共组件体系。直接视觉依据为原始 UI 规范 `docs/source/03-ui-design-spec.pdf.pdf`：

- p.4：56 px 顶部导航、208 px 品牌区、100 px 右侧区域、30 px 中性用户占位与 Hover 背景；
- p.5：208/64 px 侧栏、16 px 内边距、12 px 菜单间距、分组标题、选中态、独立滚动区、底部固定区、渐变模糊遮罩与收起 Tooltip；
- p.6：顶部导航、侧栏与自适应主内容关系，8 px 主内容外间隙与 8 px 圆角；
- p.7：64 px 页面标题栏、20 px 左右内边距、8 px 操作间距与可选悬浮入口定位；
- p.2、p.3、p.8、p.15、p.16：颜色、MiSans VF、容器/阴影、Tooltip 与栅格辅助规则。

信息架构与路由依据为 `docs/analysis/04-information-architecture.md` 和 `docs/analysis/05-page-inventory.md`。订单与操作记录共用一级菜单的组织仍是 `OQ-002` 暂定方案；商城与“我的资源”的云服务器/物理机关系仍按 `OQ-058` 作为页面内标签关系，不拆成新一级菜单。

## 结构与职责

| 文件/组件 | 职责 |
|---|---|
| `src/app/shell/AppShell.tsx` | 组合顶栏、侧栏、标题栏、主内容和路由 Outlet；维护本次会话内的展开/收起状态 |
| `src/app/shell/TopNavbar.tsx` | 配置化品牌展示、消息入口、当前用户入口及应用框架私有反馈面板 |
| `src/app/shell/SideNavigation.tsx` | 正式菜单、路由选中、分组/子菜单、展开/收起、滚动遮罩、底部固定区和收起 Tooltip |
| `src/app/shell/MainContent.tsx` | 自适应内容容器、标题栏、正文独立滚动区和可选悬浮入口插槽 |
| `src/app/shell/PageTitleBar.tsx` | 统一页面标题和可选右侧操作区 |
| `src/app/shell/FloatingAction.tsx` | p.7 壳层私有可选能力；正式页面默认不渲染，不绑定业务用途 |
| `src/app/shell/icons/AppShellIcons.tsx` | 少量本地线性 SVG 图标，统一使用 `currentColor`，不依赖图标库或远程资产 |
| `src/pages/ModulePlaceholderPage.tsx` | 15 个稳定页面 ID 的统一占位表现，不包含业务数据和虚假操作 |

壳层使用 CSS Grid 组织 56 px 顶栏与剩余视口高度，使用 Flex/Grid 组织侧栏内部和正文。没有用截图或大量绝对定位复刻画板；绝对定位只用于 Tooltip、反馈浮层、滚动遮罩和可选悬浮入口。

## 菜单与路由配置

- 菜单配置：`src/app/shell/navigation.ts`。
- 页面路由及标题、模块、用途、后续阶段：`src/app/routes.ts`。
- 路由装配与根路由重定向：`src/app/router.tsx`。
- 正式一级菜单为七个：资源商城、我的资源、存储管理、镜像管理、软件中心、网络与访问、订单与记录。
- “订单与记录”展开后提供订单与操作记录入口。
- `/__dev/ui-spec` 继续保留，但不进入正式菜单。
- 根路由 `/` 重定向到 `/marketplace`，对应 `MKT-01`。

15 个稳定页面 ID 均注册为可直接刷新的路由。对象详情采用语义清晰的动态参数路径，不建立业务数据：

| 页面 ID | 路径 |
|---|---|
| `MKT-01` | `/marketplace` |
| `BUY-01` | `/marketplace/cloud-server/purchase` |
| `BUY-02` | `/marketplace/physical-machine/purchase` |
| `RES-01` | `/resources/cloud-servers` |
| `RES-02` | `/resources/cloud-servers/:resourceId` |
| `RES-03` | `/resources/physical-machines` |
| `RES-04` | `/resources/physical-machines/:resourceId` |
| `STO-01` | `/storage` |
| `STO-02` | `/storage/:storageId` |
| `IMG-01` | `/images` |
| `SW-01` | `/software` |
| `NET-01` | `/network-access` |
| `ORD-01` | `/orders` |
| `ORD-02` | `/orders/:orderId` |
| `OPS-01` | `/operation-records` |

## 展开、收起与选中规则

- 初始为 208 px 展开状态；点击底部固定按钮切换为 64 px 收起状态。
- 切换不刷新页面、不改变当前路由，也不跨会话持久化。
- 收起状态只展示菜单图标；链接保留明确 `aria-label`，Hover 与键盘 Focus 都显示 Portal Tooltip，避免被侧栏或主内容裁切。
- 当前菜单同时使用选中背景和字重变化；对应链接设置 `aria-current="page"`。
- 订单与记录子菜单默认展开。收起时，如当前页面是操作记录，使用当前子项图标、名称和链接维持明确选中状态。
- 宽度变化使用 160 ms 工程补充过渡；`prefers-reduced-motion` 下移除过渡。

## 滚动与固定区域

- 菜单中部为唯一 `overflow-y: auto` 的独立滚动区。
- 底部收起按钮位于滚动区外，始终固定在侧栏底部。
- 滚动区根据 `scrollTop`、`scrollHeight` 和 `clientHeight` 计算上下边界。
- 未到顶部或底部时显示对应渐变模糊遮罩；遮罩使用 `pointer-events: none`，不阻挡菜单点击。
- 正式菜单不足以自然溢出时，不增加虚构菜单；测试使用专用 overflow fixture 验证遮罩出现、消失和固定底部区。

## 品牌配置

- 产品名称来自 `src/config/product.ts` 的 `productConfig.displayName`。
- 可选 Logo 来自 `productConfig.logoSrc`。
- 未配置 Logo 时，展开态显示中性文字标记和完整工作名称；收起态显示克制的首字符文字标记。
- 不复制或重绘来源 Logo，不硬编码来源品牌名称。

## 工程补充

PDF 未定义完整动效、层级、Tooltip 方位/触发时序和窄屏断点。本阶段的最小补充集中在 `src/styles/tokens.css`：

- `--engineering-shell-motion-duration`：侧栏宽度与遮罩的克制过渡；
- `--engineering-z-index-shell`、`--engineering-z-index-overlay`：顶栏、遮罩、Tooltip 与反馈浮层的层级；
- Tooltip 同时响应 Hover/Focus，Escape 可关闭顶部反馈面板；
- 桌面布局使用 `minmax(0, 1fr)`，在 1920×1080 和 1366×768 下避免负宽度和横向溢出。

这些补充不宣称来自 PDF，也不形成公共 Tooltip、Button 或浮层组件 API。

## 未实现与后续接入

- 资源商城卡片、购买表单、资源表格、详情、监控、存储、镜像、软件、网络、订单和操作记录仍是统一占位页。
- 没有业务 Mock 数据、Mock 接口、计费、审批、权限、资源状态或订单状态机。
- TopNavbar 按钮、收起 Tooltip、悬浮入口均为 AppShell 私有实现；阶段 4 公共组件完成后，应以公共 IconButton、Tooltip、Overlay/Notice 能力替换内部实现，同时保持本文件记录的布局和可访问性契约。
- p.4 的 40 px Hover 标注、p.5 的 48 px 标注与 Demibold 具体视觉仍保留设计确认，不在本阶段扩大为全局规则。
