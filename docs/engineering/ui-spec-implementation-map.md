# UI 规范逐页实施映射

原始文件：`docs/source/03-ui-design-spec.pdf.pdf`，共 18 页。状态中的“后续实现”表示正式公共组件或业务内容不属于当前 AppShell 阶段，不表示该页被遗漏。

| PDF 页码 | 规范主题 | 本阶段是否涉及 | 对应 Token 或文件 | 是否已经实现 | 是否存在疑问 |
|---:|---|---|---|---|---|
| p.1 | Logo 平台标识 | 是，仅品牌边界 | `UiSpecPage.tsx`、`productConfig` | 已实现边界说明；未复制资产 | 正式品牌、Logo 安全区与资产路径均未确认 |
| p.2 | Color 色彩 | 是 | `tokens.css` 颜色组、验证页色卡 | 已实现 | 无；与组件页冲突见冲突文档 |
| p.3 | Typography 文字 | 是 | `fonts.css`、`tokens.css` 排版组、`theme.css`、验证页排版 | 已实现 Token、Variable Font、加载状态与中英数符号/连续字重样例；浏览器确认实际命中 | 仓库未包含书面授权文件；系统回退渲染存在平台差异 |
| p.4 | Navbar 导航栏 | 是 | `TopNavbar.tsx`、`AppShell.css`、Navbar Token | 已实现配置化品牌、右侧入口及私有反馈 | 40 px 暂按局部点击区使用，精确语义仍待确认 |
| p.5 | Sidebar 侧边菜单栏 | 是 | `SideNavigation.tsx`、`navigation.ts`、`AppShell.css` | 已实现 208/64 px 状态、选中/Hover、Tooltip、独立滚动、遮罩和底部固定区 | 48 px 未提升为菜单项 Token；Demibold 450 仍待确认 |
| p.6 | Main Layout 主界面布局 | 是 | `AppShell.tsx`、`MainContent.tsx`、`AppShell.css` | 已实现视口壳层、自适应剩余空间、8 px 间隙与圆角 | PDF 无响应式断点；本阶段补充 1366 桌面适配 |
| p.7 | Main Content 主内容区布局 | 是 | `PageTitleBar.tsx`、`MainContent.tsx`、`FloatingAction.tsx` | 已实现 64 px 标题栏和可选悬浮定位能力；正式页面默认不显示悬浮入口 | 悬浮入口业务含义仍未定义 |
| p.8 | Container & Shadow | 是 | `Container`、容器语义色、边框与三种阴影 Token、基础组件验证页 | 公共组件已实现全部图示语义变体；阴影需显式选择 | 成功背景、透明填充标注冲突 |
| p.9 | Button 按钮 | 是 | `Button`、`IconButton`、`TextButton`、`FilterTag` 与组件 Token | 公共组件和真实状态交互已实现 | PDF 未定义 Loading，本阶段不扩展 |
| p.10 | Input 与 Textarea | 是 | `Input`、`SearchInput`、`Textarea`、Focus/Error Token | 输入、清空、搜索 Enter、计数、错误关联和文本域已实现 | 错误色与 p.2 冲突；纵向 Resize 为工程补充 |
| p.11 | Radio & Checkbox | 是 | `Radio`、`RadioGroup`、`CardRadio`、`Checkbox`、`CheckboxGroup` | 原生表单语义、全部图示状态及键盘行为已实现 | 基础控件 16 px 为工程 Token，需设计确认 |
| p.12 | Select 选择器 | 是 | `Select`、`MultiSelect`、`SelectOption`、Portal 与下拉 Token | 单选/多选、折叠标签、ARIA、键盘、外部关闭与定位已实现 | Loading/Empty/Error/远程搜索不属于 Task 04A |
| p.13 | Pop-up 弹窗 | 是 | `Modal`、`PromptModal`、Portal、Focus Trap、滚动锁与工程 Token | 普通/提示/警告/危险/成功/关闭型和提交中已实现 | 宽度、遮罩和动效仍需设计确认 |
| p.14 | Tabs 标签页 | 是 | `Tabs`、`TitleBarTabs`、`UnderlineTabs`、Roving Tabindex | 两类视觉、受控切换、Disabled 和手动键盘激活已实现 | 正式溢出形式与路由同步未定义 |
| p.15 | Tooltip 文字提示 | 是 | `Tooltip`、最大宽度、颜色与内间距 Token、Portal | 五类图示内容、Hover/Focus/Escape、交互内容与视口定位已实现 | 方位与触发时序为明确记录的工程补充；未增加箭头 |
| p.16 | Grid 栅格 | 是 | `Grid`、`GridItem`、24 栏与常用组合 | 24 栏、Span、Start、自动换行和非法值保护已实现 | 正式响应式断点仍缺失 |
| p.17 | Table 与 Pagination | 是 | 泛型 `Table`、公共 Checkbox 选择、`EmptyTable`、`Pagination` 与页码算法 | Regular/Multi-select/Multi-line/Compact/Blank、Loading/Error、简易/复杂分页已实现 | 业务列宽、排序、固定列等不在本阶段 |
| p.18 | Form 表单 | 是 | `Form`、`FormSection`、`FormField`、`FormActions`、`FormAnchorNav` | 分区、字段关联、锚点、操作区、Grid 组合和通用上传 Slot 布局已实现 | 正式窄屏规则与底部是否固定仍待确认 |

## 阶段结论

- 本阶段直接实现基础体系的主要页码：p.2、p.3、p.8、p.16，以及 p.4-p.7、p.9-p.15、p.17-p.18 中可转成公共 Token 的明确数值。
- p.1 只实施品牌隔离；不复制来源 Logo。
- p.4-p.7 的正式应用框架已由 Task 03 实现；工程说明见 `docs/engineering/app-shell.md`。
- Task 04A 已正式实现 p.8-p.12、p.15 的第一批公共组件；API、状态和工程补充见 `components-foundation.md`。
- Task 04B 已实现 p.13、p.14、p.16-p.18 的 Modal、Tabs、Grid、Table、Pagination 和 Form 组合；工程行为见 `components-advanced.md`。
