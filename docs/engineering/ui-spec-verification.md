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
| p.4 | Navbar 高度、品牌区、右侧区、Hover 色及临时 40 px Token | 正式 Navbar | 40 px 含义保持临时，不扩成全局规则 |
| p.5 | Sidebar 展开/收起宽度、颜色、间距与圆角基础值 | 正式 Sidebar、48 px 语义 | 48 px 未误设为全局菜单项高度 |
| p.6 | Navbar/Sidebar/Main Content 关系及 8 px 间隙 | 正式应用框架 | 只展示尺寸关系，无业务布局组件 |
| p.7 | 标题栏 64 px、20 px 内边距、8 px 操作间距、20 px 悬浮偏移 | 正式 Main Content | 尺寸 Token 已落地 |
| p.8 | 容器语义色、边框、圆角、三类阴影 | 正式容器组件 | 成功背景与透明填充冲突已单独记录 |
| p.9 | 32/24 px 高度、内边距、图标尺寸、按钮相关颜色基础值 | 正式 Button/IconButton | 未建立公共组件 API |
| p.10 | Input/Textarea 高度、内边距、清除/拖拽色、Focus/Error 阴影 | 正式 Input/Textarea | 组件错误色与全局错误色分离 |
| p.11 | Radio/Checkbox 卡片高度、间距和排版基础值 | 正式 Radio/Checkbox | 静态页未提供的完整状态不补设计 |
| p.12 | Select 高度、圆角、边框、下拉阴影和状态基础值 | 正式 Select | Loading/Empty/Error 等列为缺口 |
| p.13 | 弹窗头/底 64 px、20 px 内边距、8 px 圆角 | 正式 Modal | 宽度、遮罩、层级和焦点规则列为缺口 |
| p.14 | Title Bar Tab 40 px、Tab 32 px 与间距基础值 | 正式 Tabs | 未补溢出和 Disabled 规则 |
| p.15 | Tooltip 220 px 最大宽度、6/8/12 px 内间距基础值 | 正式 Tooltip | 背景精确值、箭头、方位和时序列为缺口 |
| p.16 | 24 栏、1704 px 内容宽度、20 px 边距/栏距及常用组合示意 | 响应式断点 | 验证页在两种视口无横向溢出 |
| p.17 | 表格水平内边距、多行留白/间距和排版基础值 | 正式 Table/Pagination、行高/列宽等 | 未把静态示例补成业务规则 |
| p.18 | 表单分组/字段/标签/锚点间距和 800 px 上传区宽度 | 正式 Form/Upload、窄屏规则 | 组合基础值已落地 |

## 浏览器核验

| 项目 | 结果 |
|---|---|
| 根路由 | 标题与工程占位内容正常，入口可达 |
| 404 | 明确显示 `404`，返回入口存在 |
| `/__dev/ui-spec` | 标题明确，按 p.1-p.18 顺序组织已 Token 化内容 |
| 1920 × 1080 | 无横向溢出；色卡、排版、布局关系、阴影和栅格显示正常 |
| 1366 × 768 | 无横向溢出；布局自然换行，24 栏比例保持 |
| 键盘 Focus | Tab 键触发 `:focus-visible`；1 px 主色轮廓、4 px 偏移清晰可见 |
| 控制台 | 根路由、404、验证页均无 warning 或 error |

## 字体补充核验

| 项目 | 结果 |
|---|---|
| 字体文件 | `src/assets/fonts/MiSansVF.woff2`；WOFF2 TrueType；11,870,264 bytes；SHA-256 见 `font-assets.md` |
| 字体元数据 | Family `MiSans VF`；Variable Font；仅 `wght` 轴 150–700，默认 330；Demibold 命名实例 450 |
| 加载顺序 | `reset.css` → `fonts.css` → `tokens.css` → `theme.css` → `base.css` |
| Network | 字体请求 HTTP 200、`font/woff2`、无 404；同一页面一条 WOFF2 资源记录 |
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
- 已核验：工程内引用统一指向受版本控制的原始文件 `docs/source/03-ui-design-spec.pdf.pdf`，未复制或重命名原文件。
- 保留差异：验证页是 Token 核验工具，不逐像素复刻 PDF 说明文档；不嵌入截图、不显示来源 Logo。
- 保留差异：全局 `:focus-visible` 与 `prefers-reduced-motion` 是工程可访问性暂定，PDF 未定义完整全局规范。

## 后续处理

- p.4-p.7 的正式应用框架在下一阶段消费当前布局 Token。
- p.8-p.15、p.17-p.18 的正式公共组件在后续组件阶段实现，并继续遵守冲突与缺口记录。
- p.4 的 40 px、p.5 的 48 px、p.8 的成功容器标注仍需设计确认；p.5 的 Demibold 已按字体命名实例映射到 450，但是否就是设计预期仍需确认。
