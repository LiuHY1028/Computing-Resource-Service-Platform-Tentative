# Design Token 与基础主题

## 依据与范围

- 原始视觉依据：`docs/source/03-ui-design-spec.pdf.pdf`，18 页。
- 辅助索引：`docs/analysis/07-ui-spec-extraction.md`。
- 本阶段只建立 Token、默认浅色主题、全局基础样式和开发验证页；不建立正式公共组件或业务页面。
- 来源规范中的品牌名称与 Logo 不作为当前产品品牌。产品身份继续由 `src/config/product.ts` 集中配置。

## 单一事实来源

所有来自 PDF 的原始颜色、尺寸、间距、圆角、阴影和排版数值只维护在：

```text
src/styles/tokens.css
```

其他文件只能引用 CSS Custom Properties：

- `src/styles/fonts.css`：注册负责人提供的本地可变字体；字体元数据描述符按资产事实维护，不复制 Token 数值。
- `src/styles/theme.css`：消费 Token 建立默认浅色主题。
- `src/styles/base.css`：工程占位页基础布局。
- `src/pages/ui-spec-page.css`：开发验证页展示样式。
- `src/theme/tokenVars.ts`：只导出 `var(--token-name)` 引用，不保存原始值。

## Token 分类与 PDF 来源

| 分类 | 代表 Token | 来源页 | 说明 |
|---|---|---:|---|
| 品牌与功能色 | `--color-primary`、`--color-success`、`--color-warning`、`--color-error` | p.2 | 品牌渐变仅保留为局部表达，不提升为全局背景 |
| 功能状态色阶 | `--color-primary-hover`、`--color-error-active` 等 | p.2 | 色阶名称不等于所有组件都必须使用全部状态 |
| 中性色 | `--color-text-title`、`--color-border-default`、`--color-background-page` | p.2 | 保留透明度等价实色的语义结果 |
| 组件专用色 | `--color-border-control`、`--color-input-error` | p.8-p.12 | 与 p.2 冲突时分开维护，不强行统一 |
| 字体与排版 | `--font-family-base`、字号、行高、字重 | p.3、p.5、p.9、p.11-p.13、p.17-p.18 | 连续字重保留；冲突见单独记录 |
| 间距 | `--space-4` 至 `--space-40` | p.5、p.7、p.9-p.18 | 只收录 PDF 明确或重复标注的值 |
| 圆角与边框 | `--radius-control`、`--radius-container`、`--border-control` | p.5-p.13 | 控件线宽为工程暂定，颜色来自组件专用页 |
| 阴影与 Focus | `--shadow-button-hover`、`--shadow-dropdown`、`--shadow-focus-control` | p.8、p.10 | 不增加 PDF 以外的阴影层级 |
| 控件尺寸 | `--height-control-default`、`--height-textarea-default`、图标尺寸 | p.9-p.15 | 仅供后续组件实现消费，本阶段不建立组件 API |
| 应用布局 | Navbar、Sidebar、Main Content、标题栏尺寸 | p.4-p.7 | 本阶段只做 Token 与关系示意，正式框架在阶段 3 |
| 栅格与表单组合 | 24 栏、1704 px、边距/栏距、表单间距、上传区宽度 | p.16-p.18 | 窄屏断点未在 PDF 中定义 |

## 字体回退

基础字体栈为：

```css
font-family: var(--font-family-base);
```

其语义顺序为：

1. 首选：MiSans VF。资产位于 `src/assets/fonts/MiSansVF.woff2`，内部 Family Name 与 CSS Family Name 均为 `MiSans VF`。
2. 同家族兼容回退：MiSans。
3. macOS 回退：PingFang SC。
4. Windows 回退：Microsoft YaHei。
5. 兼容回退：SimSun。
6. 通用回退：`sans-serif`。

字体元数据确认该文件是只有 `wght` 轴的 Variable Font，范围 150–700、默认 330；没有读取到其他 Variation Axis。PDF p.3 的主排版样例使用字重 330，组件页还出现 300、305、380、480 与 `Demibold`，均在文件支持范围内，可由 `font-weight` 连续表达。字体命名实例明确给出 Demibold 450，因此保留现有 `--font-weight-demibold-temporary` 键但把值更新为 450；p.5 是否确实指向该命名实例仍待设计确认。系统回退字体可能把连续值映射到相邻可用字重，因此同一数值在不同平台可能略有粗细差异。

CSS 入口加载顺序为 `reset.css` → `fonts.css` → `tokens.css` → `theme.css` → `base.css`。`fonts.css` 使用 `font-display: swap`；Vite 负责生成带哈希的 WOFF2 构建资源。字体提供与授权边界见 `docs/engineering/font-assets.md`，仓库当前没有书面授权文件。

本地浏览器核验中，Computed Style 的首选项为 `MiSans VF`，Font Loading API 返回 loaded；Chrome DevTools Protocol 报告中文/英文/数字混排样例及全部连续字重行实际使用 `MiSans VF` 自定义字体。字体请求返回 200、MIME 为 `font/woff2`，同一页面只观察到一条 WOFF2 资源记录。

## 工程暂定 Token

下列值不是声称来自 PDF 的已确认全局规范，均以 `temporary` 或 `engineering` 命名：

| Token | 原因 | 后续处理 |
|---|---|---|
| `--border-width-control-temporary` | PDF 可见细边框，但未可靠文字标注线宽 | 公共组件阶段与设计确认 |
| `--font-weight-demibold-temporary` | 字体元数据给出 Demibold 450，但 p.5 未写数值 | 保留旧键并映射到 450；公共组件阶段确认 p.5 是否采用该命名实例 |
| `--layout-navbar-hover-area-temporary` | p.4 标注 40 px，但无法确认是宽度还是最小点击区 | 应用框架阶段确认 |
| `--engineering-focus-outline-width`、`--engineering-focus-outline-offset` | p.10 只有输入控件 Focus，项目仍需全局键盘可见性 | 公共组件无障碍规范完成后替换 |
| `--engineering-reduced-motion-duration` | PDF 未给动效时长，基础主题必须响应降低动态效果偏好 | 后续动效规范统一确认 |

## 基础浅色主题

`src/styles/theme.css` 处理：

- `html`、`body`、`#root` 最小高度与浅色背景；
- 默认字体、字号、字重、行高和字体平滑；
- 标题、正文、链接 Hover/Active；
- 原生表单控件字体继承，但不把原生控件制作成正式组件；
- 文本选中状态；
- `:focus-visible` 的工程暂定可见状态；
- 禁用光标；
- `prefers-reduced-motion`。

本阶段没有暗色模式、第三方组件库或 CSS 框架。字体资产仅按本次补充任务接入，不扩展其他视觉规则。

## 使用规则

```css
.example {
  color: var(--color-text-body);
  border: var(--border-control);
  border-radius: var(--radius-control);
}
```

- 页面和组件优先使用语义 Token。
- 不在 TypeScript、页面 CSS 或主题文件复制 PDF 原始色值和尺寸集合。
- 组件专用规则优先于泛化色板；冲突必须保留场景 Token 和文档记录。
- PDF 缺失的 Loading、Toast、Drawer、响应式等规范不得用第三方默认样式填补。

## 验证入口

- 开发路由：`/__dev/ui-spec`
- 路由不加入正式产品菜单。
- 页面按 PDF p.1-p.18 顺序展示已 Token 化内容，并显示对应 CSS 变量名称供核验。
