# 基础交互组件

## 范围与依据

Task 04A 的正式公共组件位于 `src/components/ui/`，统一从 `src/components/ui/index.ts` 导出。视觉直接依据原始 `docs/source/03-ui-design-spec.pdf.pdf` 的 p.8-p.12、p.15，并辅助核对 p.2、p.3、p.7、p.16。验证入口为 `/__dev/components/foundation`，使用现有 AppShell，但不注册到正式菜单。

本阶段没有实现业务页面、业务数据、业务状态机、远程搜索或 API。Modal、Tabs、Grid、Table、Pagination、Form 布局、Drawer、Toast、Notification、Skeleton 留给 Task 04B 或后续业务阶段。

## 目录与公共入口

| 目录 | 公共组件 | PDF 依据 |
|---|---|---:|
| `Container/` | `Container` | p.8 |
| `Button/` | `Button`、`IconButton`、`TextButton`、`FilterTag` | p.9 |
| `Input/` | `Input`、`SearchInput`、`Textarea` | p.10 |
| `Radio/` | `Radio`、`RadioGroup`、`CardRadio` | p.11 |
| `Checkbox/` | `Checkbox`、`CheckboxGroup` | p.11 |
| `Select/` | `Select`、`MultiSelect`、`SelectOption` | p.12 |
| `Tooltip/` | `Tooltip` | p.15 |
| `icons/` | 少量通用 `currentColor` React SVG | p.9-p.12 的组件结构 |

后续页面必须使用：

```ts
import { Button, Input, Select } from '../components/ui';
```

不得从组件内部文件建立业务页面依赖。

## 组件 API 与状态

| 组件 | 主要 API | 支持状态与行为 |
|---|---|---|
| `Container` | `as`、`variant`、`shadow`、原生属性、`className`、ref | 无边框、常规、禁用、虚线、危险、聚焦、标记、信息、紧急、成功、注意；阴影必须显式选择 |
| `Button` | `variant`、`leftIcon`、`rightIcon`、原生按钮属性、ref | 主要、次要、警示、危险、幽灵；Normal/Hover/Active/Focus/Disabled |
| `IconButton` | 必填 `aria-label`、`icon`、`appearance`、ref | 默认与悬浮表达；图标使用 `currentColor` |
| `TextButton` | `icon`、`iconPosition`、原生按钮属性、ref | 文字按钮与文字图标按钮 |
| `FilterTag` | `selected`/`defaultSelected`、`onSelectedChange`、`icon`、ref | 受控或简单非受控选中；`aria-pressed`；可取消选择 |
| `Input` | 原生输入属性、`clearable`、`showCount`、`error`、`errorMessage`、`onClear`、ref | 空、已输入、溢出、清空、限长、Disabled、ReadOnly、Error/Error Focus |
| `SearchInput` | `Input` API、`onSearch`、ref | Enter 提交，不在组件内增加业务搜索逻辑 |
| `Textarea` | 原生文本域属性、`showCount`、`error`、`errorMessage`、ref | 基础、限长、Disabled、ReadOnly、Error/Error Focus；纵向拖拽 |
| `RadioGroup` | `value`/`defaultValue`、`onValueChange`、`name`、`direction`、`disabled`、ref | 受控优先；同组单选；原生 radio 语义 |
| `Radio` | `value`、原生 radio 属性、`onCheckedChange`、ref | 未选、Hover、已选、未选禁用、已选禁用 |
| `CardRadio` | `title`、`description` 与 `Radio` API | 卡片边框和显式 radio 标记共同表达选中，非仅颜色 |
| `CheckboxGroup` | `value`/`defaultValue`、`onValueChange`、`direction`、`disabled`、ref | 受控优先；多选集合 |
| `Checkbox` | `value`、`indeterminate`、原生 checkbox 属性、ref | 未选、Hover、已选、两种 Disabled、Indeterminate 及 Disabled |
| `Select` | `options`、`value`/`defaultValue`、`onValueChange`、`placeholder`、`disabled`、`name`、ref | 默认、已选择、展开、选中/悬停/未选/禁用选项；`body` Portal |
| `MultiSelect` | Select 通用 API、数组值、`maxVisibleTags`、ref | 多选标签、移除、过量 `+ N ...` 折叠、Disabled；`body` Portal |
| `Tooltip` | `content`、`title`、`action`、延时覆盖、触发元素 | Hover、Focus、Escape；长文、标题正文、正文内操作、独立操作；`body` Portal |

## 键盘与 Focus

- 原生按钮、Radio、Checkbox 通过 Enter/Space 或 Space 使用浏览器语义；disabled 元素不触发事件。
- `RadioGroup` 支持 Left/Up 与 Right/Down 循环移动、聚焦并选择可用项。
- `Select` 和 `MultiSelect` 支持 Enter/Space 打开、Up/Down 移动、Home/End 跳转、Enter 选择、Escape 关闭、Tab 退出。关闭后 Escape 和选择路径把焦点返回触发器；Tab 和外部点击不抢占用户的新焦点。
- Select 触发器使用 `combobox`，浮层使用 `listbox`/`option`，并维护 `aria-expanded`、`aria-controls`、`aria-activedescendant`、`aria-selected` 和 `aria-multiselectable`。
- Tooltip 在 Hover 与键盘 Focus 打开；Escape 关闭并把焦点留在触发器。Tooltip 只提供补充描述，不生成触发器的可访问名称。
- Error Input/Textarea 使用 `aria-invalid` 与 `aria-describedby` 关联可见错误文字和图标，错误不只依赖颜色。

## 工程补充

以下内容为可访问性或基础交互所必需，但 PDF 没有可靠定义，不声明为设计定稿：

| 补充 | 当前实现 | 原因 |
|---|---|---|
| Radio/Checkbox 基础尺寸 | `--size-selection-control-engineering` | p.11 图像可见但没有可靠文字尺寸标注 |
| Select 浮层边界 | 视口 8 px 安全边距、8 px 触发间隔、240 px 最大列表高度 | Portal 必须避免被 AppShell 裁切并保持可滚动 |
| MultiSelect 标签宽度 | 120 px 最大标签宽度 | 避免长标签导致控件横向溢出 |
| Tooltip 延时 | 打开 80 ms、关闭 120 ms，可按实例覆盖 | p.15 未定义时序；交互内容需要可移入窗口 |
| Tooltip 方位 | 优先上方、空间不足时下方，并限制在视口内 | p.15 未定义方位；防止裁切 |
| Textarea Resize | `resize: vertical` | PDF 展示拖拽标记但未定义轴；纵向调整不破坏页面横向布局 |
| Focus 可见性 | 全局工程 Focus 加各组件专用 Focus 状态 | p.10 只明确部分输入 Focus，但所有键盘控件均需要可见焦点 |

这些值集中在 `src/styles/tokens.css` 的 `engineering` 或组件语义 Token 中，组件 CSS 不散落原始颜色和 px 数值。

## Portal 与清理

Select、MultiSelect 和 Tooltip 浮层挂载到 `document.body`。打开期间监听窗口 resize 与捕获阶段 scroll 并重新计算 fixed 位置；Select 另外监听 document pointerdown 关闭外部点击。所有监听器、计时器和 Portal 都在关闭或组件卸载时清理。

## AppShell 私有控件

Task 03 的 Navbar 私有图标按钮和 Sidebar 收起态 Tooltip 本轮保留。强制替换会扩大正式导航回归范围；公共组件已经在独立验证页覆盖，后续可在专门的 AppShell 收敛任务中替换。正式菜单结构和 15 个稳定业务路由未改变。

## 当前限制

- Select 不包含远程搜索、异步 Loading、Empty/Error、虚拟滚动或选项分组。
- Tooltip 不扩展为通用业务 Popover，不增加箭头、复杂动画或大阴影。
- Input 不增加密码、日期、数字步进等 PDF 未定义类型。
- 组件只提供视觉与通用交互，不定义价格、审批、权限、计费、资源或订单状态。
