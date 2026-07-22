# UI 规范实现核验记录

## 原始规范与检查方式

- 原始文件：`docs/source/03-ui-design-spec.pdf.pdf`
- 总页数：18 页
- PDF 页面尺寸：`pdfinfo` 报告基础页尺寸为 1920 × 1286 pt；部分页面画布比例不同。
- 图像检查：使用 Poppler 将全部页面渲染为 PNG，逐页查看页面图像，不以文本抽取替代视觉检查。
- 第一次检查：实现前逐页检查 p.1-p.18，提取颜色、排版、布局、控件基础值、状态和冲突。
- 第二次检查：完成验证页及浏览器核验后，再次逐页检查 p.1-p.18，并与 Token、主题和验证页对照。
- 临时渲染图只用于核验，不作为页面实现、背景或仓库资产。

## 逐页对照结果

| 页码 | 本阶段已落地 | 本阶段未落地或保留事项 | 对照结论 |
|---:|---|---|---|
| p.1 | 品牌隔离与可配置边界说明 | 来源 Logo 资产及正式品牌 | 未复制、未重绘、未作为当前品牌展示 |
| p.2 | 品牌渐变、功能色阶、中性色 Token 与色卡 | 无正式业务色彩绑定 | 颜色按页面图像和标注落地 |
| p.3 | 本地 MiSans VF、5 级字号/行高、连续字重 Token、中文/英文/数字符号与加载状态验证 | 书面授权文件、跨平台像素级一致性 | WOFF2 元数据、150–700 `wght` 轴、Demibold 450 命名实例与回退链已记录 |
| p.4 | Navbar 高度、品牌区、右侧区、Hover 状态与私有反馈面板 | 真实消息、用户与账号系统 | 品牌和操作区域按原图关系落地，40 px 含义保持临时 |
| p.5 | Sidebar 展开/收起、菜单分组、选中/Hover、独立滚动、固定底部、渐变遮罩与收起 Tooltip | 正式公共 Tooltip | 48 px 未误设为全局菜单项高度；超量菜单由测试 fixture 覆盖 |
| p.6 | Navbar/Sidebar/Main Content 关系、8 px 间隙、自适应列宽和视口内滚动 | 正式业务正文 | CSS Grid/Flex 实现应用框架，无大面积绝对定位 |
| p.7 | 64 px 标题栏、20 px 内边距、8 px 操作间距和可选悬浮能力 | 正式业务操作 | 悬浮能力默认不在正式页面显示，未虚构业务用途 |
| p.8 | 容器语义色、边框、圆角、三类显式阴影及 `Container` | 后续业务语义绑定 | 成功背景与透明填充冲突已单独记录 |
| p.9 | 32/24 px 高度、内边距、图标尺寸及 Button 完整体系 | PDF 未定义 Loading | 公共 API、交互状态、disabled 与 ref 已建立 |
| p.10 | Input/SearchInput/Textarea、清空、计数、Error/Focus 与 ARIA 关联 | 密码/日期/数字等未定义类型 | 组件错误色与全局错误色分离，Resize 工程补充已记录 |
| p.11 | Radio/RadioGroup/CardRadio、Checkbox/CheckboxGroup 全部图示状态 | 精确 16 px 尺寸待确认 | 使用原生 input 语义；选中不只依赖颜色 |
| p.12 | Select/MultiSelect、标签折叠、ARIA、键盘与 Portal | 异步 Loading/Empty/Error/远程搜索 | 本地通用选项能力完成，浮层不受 AppShell 裁切 |
| p.13 | 弹窗头/底 64 px、20 px 内边距、8 px 圆角 | 正式 Modal | 宽度、遮罩、层级和焦点规则列为缺口 |
| p.14 | Title Bar Tab 40 px、Tab 32 px 与间距基础值 | 正式 Tabs | 未补溢出和 Disabled 规则 |
| p.15 | Tooltip 220 px 最大宽度、五类内容、Hover/Focus/Escape 和 Portal | 箭头及正式方位/时序 | 最小方位与延时作为工程补充集中维护 |
| p.16 | 24 栏、1704 px 内容宽度、20 px 边距/栏距及常用组合示意 | 响应式断点 | 验证页在两种视口无横向溢出 |
| p.17 | 表格水平内边距、多行留白/间距和排版基础值 | 正式 Table/Pagination、行高/列宽等 | 未把静态示例补成业务规则 |
| p.18 | 表单分组/字段/标签/锚点间距和 800 px 上传区宽度 | 正式 Form/Upload、窄屏规则 | 组合基础值已落地 |

## 浏览器核验

| 项目 | 结果 |
|---|---|
| 根路由 | 重定向至首个正式模块 `/marketplace`，不再显示工程初始化占位页 |
| 正式路由 | 15 个稳定页面路由均可访问；7 个一级菜单入口逐一检查，页面标题与选中项同步 |
| AppShell | Navbar、208/64 px Sidebar、Main Content 和 64 px PageTitleBar 正常；展开/收起不刷新、不丢路由 |
| 菜单交互 | Hover、选中、展开/收起、二级菜单、固定底部区域正常；收起 Tooltip Portal 位于 `body`，未被裁切 |
| 菜单溢出 | 自动化 fixture 注入 20 个仅测试菜单项，验证独立滚动区域、顶部/底部遮罩出现与消失、固定底部区域 |
| 顶部入口 | 消息与用户入口均有明确“功能待接入”反馈，点击无死控件 |
| 404 | 明确显示 `404`，返回资源商城入口存在 |
| `/__dev/ui-spec` | 标题明确，按 p.1-p.18 顺序组织已 Token 化内容 |
| 1920 × 1080 | 展开和收起两种侧栏均无横向溢出；主内容分别从 x=216/x=72 开始，标题栏 64 px |
| 1366 × 768 | 展开侧栏、页面标题和正文均可读，无横向溢出或负宽度；主内容宽度 1142 px |
| 键盘 Focus | Tab 键触发 `:focus-visible`；1 px 主色轮廓、4 px 偏移清晰可见 |
| 控制台 | 正式路由、404、验证页和交互过程均无 warning 或 error |
| 评审截图 | `artifacts/app-shell/` 已生成 4 张 PNG；目录由 `.gitignore` 排除 |

## Task 04A 基础组件核验

| 项目 | 结果 |
|---|---|
| 验证路由 | `/__dev/components/foundation` 使用现有 AppShell；正式导航内没有开发路由链接 |
| 组件范围 | Container、Button、IconButton、TextButton、FilterTag、Input、SearchInput、Textarea、Radio/Group/CardRadio、Checkbox/Group、Select、MultiSelect、Tooltip 均由公共入口导入 |
| Button | 主要/次要/警示/危险/幽灵、文字、图标、文字图标、悬浮和筛选标签均完成点击；disabled 不可用；Focus 计算样式含 1 px 主色轮廓与 Focus 阴影 |
| Input | 清空后 value 为空；SearchInput Enter 提交 `交互验证`；Error Input 实际获得焦点且显示可见错误文字 |
| Radio/Checkbox | label 点击、RadioGroup 方向键、CardRadio 选择、CheckboxGroup 多选及 disabled 均在浏览器与自动化测试中通过 |
| Select | 鼠标选中 Alpha、键盘选中 Gamma；Escape 关闭后焦点返回触发器；外部点击关闭；disabled 不响应 |
| MultiSelect | 添加 Delta、移除 Alpha、过量标签折叠、Escape 关闭与焦点返回通过 |
| Select Portal | listbox 的父节点为 `BODY`，z-index 为 30；1920 × 1080 核验时边界为 left 274/right 558/top 785/bottom 955，完全位于视口内 |
| Tooltip | Focus 打开、Escape 关闭、正文内操作与 Portal 清理通过；Hover 路径由自动化用例覆盖；交互内容点击后保持打开 |
| Tooltip Portal | 父节点为 `BODY`；1920 × 1080 核验时边界为 left 429/right 585/top 943/bottom 991，完全位于视口内；触发器使用 `aria-describedby` |
| 1920 × 1080 | document 1920/1920，Main Content 1696/1696，无横向溢出 |
| 1366 × 768 | document 1366/1366，Main Content 1142/1142，可纵向滚动且无横向溢出 |
| 正式默认页 | `/` 重定向 `/marketplace`，标题为“资源商城”，无横向溢出 |
| UI 规范页 | `/__dev/ui-spec` 正常；MiSans VF 命中；可进入基础组件验证页；无横向溢出 |
| 404 | 标题与返回 `/marketplace` 链接正常，无横向溢出 |
| 控制台 | 全部浏览器路线及交互完成后 warning/error 列表为空 |
| 自动化 | 12 个测试文件、73 项测试通过，包含组件交互、ARIA、Portal 清理与工程约束扫描 |
| 评审截图 | `artifacts/components-foundation/` 生成 5 张真实浏览器 PNG；1920 × 1080 四张、1366 × 768 一张；目录由 `.gitignore` 排除 |

## 字体补充核验

| 项目 | 结果 |
|---|---|
| 字体文件 | `src/assets/fonts/MiSansVF.woff2`；WOFF2 TrueType；11,870,264 bytes；SHA-256 见 `font-assets.md` |
| 字体元数据 | Family `MiSans VF`；Variable Font；仅 `wght` 轴 150–700，默认 330；Demibold 命名实例 450 |
| 加载顺序 | `reset.css` → `fonts.css` → `tokens.css` → `theme.css` → `base.css` |
| Network | 本轮刷新字体请求 HTTP 304（缓存命中）、`font/woff2`、无 404 或加载失败；Font Loading API 返回已加载 |
| Computed Style | `"MiSans VF", MiSans, "PingFang SC", "Microsoft YaHei", SimSun, sans-serif`；首选为 MiSans VF |
| 实际字体命中 | 浏览器调试协议返回 `familyName: MiSans VF`、`isCustomFont: true`；不是直接回退 |
| 连续字重 | 300、305、330、380、480 与 Demibold(450) 的 Computed Style 均符合 Token；各行均实际命中 MiSans VF，视觉粗细有连续差异 |
| 字符样例 | 中文、英文、数字与标点正常显示，未观察到乱码或缺字框 |
| 字体闪烁 | 本地正常网络导航未观察到明显闪烁；未在限速网络下做定量测试 |
| 1920 × 1080 | 根路由、404、验证页均无横向溢出；字体样例与连续字重布局正常 |
| 1366 × 768 | 根路由、404、验证页均无横向溢出；字体样例自然缩放，无严重布局偏移 |
| 控制台 | 三条路由均无 warning/error |

## 视觉偏差与处理

- 已修复：移除验证页页头额外的主色顶部边框，避免加入 PDF 未支持的装饰。
- 已修复：所有验证页色值和尺寸均改为 CSS 变量消费，页面与 TypeScript 不重复维护原始色值。
- 已实现：AppShell 只消费集中 Token；产品名和可选 Logo 由 `productConfig` 提供，未复制来源品牌资产。
- 已实现：原图未定义的折叠过渡仅补充 160 ms 工程 Token，并在 `prefers-reduced-motion` 下关闭。
- 已核验：工程内引用统一指向受版本控制的原始文件 `docs/source/03-ui-design-spec.pdf.pdf`，未复制或重命名原文件。
- 保留差异：验证页是 Token 核验工具，不逐像素复刻 PDF 说明文档；不嵌入截图、不显示来源 Logo。
- 保留差异：全局 `:focus-visible` 与 `prefers-reduced-motion` 是工程可访问性暂定，PDF 未定义完整全局规范。

## 后续处理

- p.4-p.7 的应用框架已经落地；下一阶段只需把正式业务内容和公共组件接入现有 Outlet 与标题栏操作插槽。
- p.8-p.12、p.15 的第一批正式公共组件已由 Task 04A 实现；目录、API、键盘与工程补充见 `components-foundation.md`。
- p.13-p.14、p.17-p.18 的 Modal、Tabs、Table、Pagination 和 Form 组合继续留给 Task 04B。
- p.4 的 40 px、p.5 的 48 px、p.8 的成功容器标注仍需设计确认；p.5 的 Demibold 已按字体命名实例映射到 450，但是否就是设计预期仍需确认。
