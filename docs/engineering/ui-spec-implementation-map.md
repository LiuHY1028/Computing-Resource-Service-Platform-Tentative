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
| p.8 | Container & Shadow | 是 | 容器语义色、边框与三种阴影 Token、验证页 | 已实现 Token 与样例 | 成功背景、透明填充标注冲突 |
| p.9 | Button 按钮 | 是，仅基础值 | 控件高度、圆角、内边距、图标与标签尺寸 Token | 基础 Token 已实现；正式 Button 后续实现 | 完整 Hover/Focus/Active/Loading 缺失 |
| p.10 | Input 与 Textarea | 是，仅基础值与 Focus | 控件/文本域尺寸、颜色、Focus/Error 阴影 Token | 基础 Token 已实现；正式 Input 后续实现 | 错误色与 p.2 冲突；超长输入策略缺失 |
| p.11 | Radio & Checkbox | 是，仅基础值 | 卡片高度、间距、排版 Token | 基础 Token 已实现；正式控件后续实现 | 基础控件精确尺寸、Focus/Error 缺失 |
| p.12 | Select 选择器 | 是，仅基础值 | 控件高度、圆角、下拉阴影、状态色 Token | 基础 Token 已实现；正式 Select 后续实现 | Loading/Empty/Error/搜索型选择器缺失 |
| p.13 | Pop-up 弹窗 | 是，仅基础值 | 头部/底部高度、内边距、圆角、排版 Token | 基础 Token 已实现；正式 Modal 后续实现 | 宽度、遮罩、层级、滚动与焦点规则缺失 |
| p.14 | Tabs 标签页 | 是，仅基础值 | Tab 操作区/项目高度、间距 Token | 基础 Token 已实现；正式 Tabs 后续实现 | Hover/Disabled/溢出规则缺失 |
| p.15 | Tooltip 文字提示 | 是，仅基础值 | 最大宽度与内间距 Token、验证页指标 | 基础 Token 已实现；正式 Tooltip 后续实现 | 背景精确值、箭头、方位、触发时序缺失 |
| p.16 | Grid 栅格 | 是 | 24 栏、1704 px、边距/栏距 Token 与验证页 | 已实现 | 响应式断点和最低宽度缺失 |
| p.17 | Table 与 Pagination | 是，仅基础值 | 表格排版/内边距/多行间距 Token、验证页 | 基础 Token 已实现；正式 Table/Pagination 后续实现 | 行高、列宽、固定列、Loading/Error 等缺失 |
| p.18 | Form 表单 | 是，仅组合基础值 | 分组/字段/标签/锚点间距与上传宽度 Token | 基础 Token 已实现；正式 Form/Upload 后续实现 | 标签宽度、必填、窄屏及底部是否固定缺失 |

## 阶段结论

- 本阶段直接实现基础体系的主要页码：p.2、p.3、p.8、p.16，以及 p.4-p.7、p.9-p.15、p.17-p.18 中可转成公共 Token 的明确数值。
- p.1 只实施品牌隔离；不复制来源 Logo。
- p.4-p.7 的正式应用框架已由 Task 03 实现；工程说明见 `docs/engineering/app-shell.md`。
- p.9-p.15、p.17-p.18 的正式公共组件留给阶段 4。
