# 高级公共组件

## 范围与依据

Task 04B 在稳定的 Task 04A 基础组件之上实现第二批公共组件。正式代码位于 `src/components/ui/`，统一从 `src/components/ui/index.ts` 导出。视觉直接依据原始 `docs/source/03-ui-design-spec.pdf.pdf` 的 p.13、p.14、p.16、p.17、p.18，并辅助核对 p.2、p.3、p.7-p.12、p.15。

本阶段没有业务页面、业务数据、远程请求、表单状态管理、上传逻辑或业务状态机。验证入口 `/__dev/components/advanced` 使用现有 AppShell，但没有加入正式菜单。

## 目录与公共入口

| 目录 | 公共组件 | PDF 依据 |
|---|---|---:|
| `Modal/` | `Modal`、`PromptModal` | p.13 |
| `Tabs/` | `Tabs`、`TitleBarTabs`、`UnderlineTabs` | p.14 |
| `Grid/` | `Grid`、`GridItem` | p.16 |
| `Table/` | `Table`、`EmptyTable` | p.17 |
| `Pagination/` | `Pagination`、`getPaginationItems` | p.17 |
| `Form/` | `Form`、`FormSection`、`FormField`、`FormActions`、`FormAnchorNav` | p.18 |

后续页面只应使用统一入口，例如：

```ts
import { FormField, Input, Modal, Table } from '../components/ui';
```

高级组件自身对 Task 04A 依赖同样只通过 `../index` 导入。Modal 和 FormActions 使用公共 Button；Table 选择列使用公共 Checkbox；Pagination 使用公共 Button、IconButton 和 Select；FormField 只克隆并关联传入控件，不复制 Input、Textarea、Select、Radio 或 Checkbox 的视觉。

## 公共 API

### Modal 与 PromptModal

- `Modal`：`open`、`title`、`onClose`、`primaryAction`、`secondaryAction`、`footer`、`closeOnOverlayClick`、`closeOnEscape`、`busy`、`initialFocusRef`、`returnFocusRef`、`role`、`width`。
- `PromptModal`：在 Modal 结构上增加 `description`、`variant`、`confirmLabel`、`cancelLabel`、`onConfirm`；支持 info、warning、danger、success、close。
- 默认 Portal 到 `body`。打开后保存来源焦点、锁定 `body` 滚动并聚焦首个可操作元素；Tab/Shift+Tab 留在弹窗内；Escape、关闭按钮和可配置遮罩关闭使用同一 `onClose`；卸载时恢复滚动和焦点。
- `busy` 禁用关闭和操作按钮，阻止重复确认。警告和危险提示使用 `alertdialog`，其他使用 `dialog`；标题和内容建立 ARIA 关联。

### Tabs

- `Tabs`：`items`、`value`/`defaultValue`、`onValueChange`、`variant`。
- `TitleBarTabs` 与 `UnderlineTabs` 固定对应 PDF 两种视觉类型。
- 使用 `tablist`、`tab`、`tabpanel`，维护 `aria-selected`、`aria-controls`、`aria-labelledby` 和 Roving Tabindex。
- Left/Right、Home、End 只移动焦点；Enter/Space 激活，采用手动激活模式，避免仅浏览标签时意外切换内容。Disabled 项会被跳过。
- 长标签容器可横向滚动；这是 PDF 未定义溢出规则下的最小工程补充。

### Grid 与 GridItem

- `Grid` 使用 CSS Grid 和 24 栏 Token，支持 `align="left" | "center"`。
- `GridItem` 使用 `span` 与可选 `start`。两者只接受 1–24 的整数，且 start + span 必须落在 24 栏内；非法值抛出 `RangeError`，避免产生不可评审布局。
- 支持 6/6/6/6、8/8/8、16/8、6/12/6 与自然自动换行。没有创建 xs/sm/md/lg/xl 断点体系。

### Table 与 EmptyTable

- `Table<T>`：泛型 `columns`、`rows`、`getRowKey`、`getRowLabel`、`compact`、选择模型、行操作 Slot、Empty、Loading、Error 和 Retry。
- `TableColumn<T>` 只定义 key、title、render、align、multiline；不包含排序、筛选、固定列、拖拽、编辑、树形或虚拟滚动。
- 选择支持受控和简单非受控模式。全选仅处理可选择行；部分选择由公共 Checkbox 的 `indeterminate` 表达；禁用选择不会被全选改变。
- 使用原生 table、thead、tbody、th、td、caption 语义。横向宽度保护位于外层滚动容器，不扩大页面宽度。
- `EmptyTable` 提供中性标题、说明和通用 action Slot。Loading/Error 是验收要求下的克制工程补充，不声明来自 PDF。

### Pagination

- `Pagination`：受控 `page`、`totalPages`、`onPageChange`，支持 simple/complex、总条数、pageSize、pageSizeOptions 和 `onPageSizeChange`。
- 页码算法始终保留首尾页，根据当前页生成中间页与左右省略号；总页数较少时展示全部页。
- 上一页、下一页使用公共 IconButton；页码使用公共 Button；每页数量使用公共 Select。第一页和最后一页正确禁用，当前页设置 `aria-current="page"`。
- 不实现跳页输入、远程请求或服务端分页协议。

### Form 布局体系

- `Form`：语义化 form，`preventDefaultSubmit` 默认开启但可配置，不管理字段值。
- `FormSection`：标题、说明、字段区与可选锚点 id。
- `FormField`：label、required、help、error、disabled、width；为单个公共控件注入 id、ARIA 说明与错误关联，不复制控件结构或 CSS。
- `FormActions`：主次操作与 submitting，按钮由公共 Button 渲染。
- `FormAnchorNav`：长表单分区按钮，点击或键盘激活后调用 `scrollIntoView` 并更新 `aria-current`。
- 表单多列使用本任务 Grid。`width="upload"` 只提供 PDF 800 px 上限的通用内容 Slot 布局，不包含文件选择、进度、校验或请求。

## 工程补充

下列规则是无障碍或完整交互所需的最小补充，PDF 没有可靠定义：

| 补充 | 当前实现 | 后续确认 |
|---|---|---|
| Modal 遮罩、宽度、最大高度与层级 | 由 `engineering-modal-*`、`engineering-z-index-modal` 和 `engineering-z-index-floating` Token 集中维护；弹窗内 Portal 控件保持在遮罩上方 | 设计确认正式宽度、遮罩透明度和嵌套浮层层级 |
| Modal 焦点与滚动 | Focus Trap、焦点进入/返回、Escape、滚动锁和卸载清理 | 作为可访问性基线保留 |
| Tabs 激活方式和溢出 | 手动激活；标签列表横向滚动 | 设计确认路由同步和正式溢出形式 |
| Table 行高与最小宽度 | `engineering-table-*` Token；容器内横向滚动 | 设计确认各业务表格列宽 |
| Table Loading/Error | 保留表头和上下文，使用文字状态与公共 Button 重试 | 后续统一 PageState 后可替换 |
| Form 控件最大宽度和锚点顶部 | `engineering-form-*` Token | 正式窄屏和长表单规范确认后替换 |

## 基础组件回归修复

FormField 测试发现公共 Input/Textarea 会用自身 `error` 默认值覆盖外部传入的 `aria-invalid`。本轮先增加回归测试，再做最小修复：保留显式 `aria-invalid`，同时仍让组件自身 error 状态优先。没有改变既有 API、视觉、值管理或错误文案行为。

## AppShell 与当前限制

- AppShell 私有 IconButton 和 Tooltip 未修改；正式菜单、15 个业务占位路由及产品配置未改动。
- 不包含 Drawer、Toast、Notification、Skeleton、日期/时间、上传、Tree、Steps、Breadcrumb、图表或表单状态管理。
- Modal 不扩展为窗口管理系统；Table 不扩展为复杂数据平台；Form 不定义校验规则或业务提交过程。
