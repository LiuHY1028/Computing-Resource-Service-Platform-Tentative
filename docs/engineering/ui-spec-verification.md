# UI 规范实现核验记录

## 原始规范与检查方式

- 原始文件：`docs/source/03-ui-design-spec.pdf.pdf`
- 总页数：18 页
- PDF 页面尺寸：`pdfinfo` 报告基础页尺寸为 1920 × 1286 pt；部分页面画布比例不同。
- 图像检查：使用 Poppler 将全部页面渲染为 PNG，逐页查看页面图像，不以文本抽取替代视觉检查。
- 第一次检查：实现前逐页检查 p.1-p.18，提取颜色、排版、布局、控件基础值、状态和冲突。
- 第二次检查：完成验证页及浏览器核验后，再次逐页检查 p.1-p.18，并与 Token、主题和验证页对照。
- 临时渲染图只用于核验，不作为页面实现、背景或仓库资产。
- 本文早期任务中的评审截图条目是永久 `Visual review workflow` 建立前的历史记录；自 Task 05A 权益中心参考重构起，Codex 只做临时浏览器检查，不再生成、保存或展示页面评审截图，已有 `artifacts/` 继续保持 Git 忽略。

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
| p.13 | 弹窗头/底、内边距、圆角、`Modal`/`PromptModal`、Portal、Focus Trap 与滚动锁 | 正式宽度、遮罩透明度和动效 | 图示类型和必要工程交互已实现，未引入第三方弹窗样式 |
| p.14 | Title Bar/Underline 两类 Tabs、项目高度、间距、Disabled 与手动键盘激活 | 正式溢出形式和路由同步 | Roving Tabindex、ARIA 关系和受控切换已实现 |
| p.15 | Tooltip 220 px 最大宽度、五类内容、Hover/Focus/Escape 和 Portal | 箭头及正式方位/时序 | 最小方位与延时作为工程补充集中维护 |
| p.16 | 24 栏、常用 Span、自动换行、主次与居中组合 | 正式响应式断点 | `Grid`/`GridItem` 已实现且不依赖绝对定位 |
| p.17 | Regular/Multi-select/Multi-line/Compact/Blank Table、Loading/Error、简易/复杂 Pagination | 排序、固定列、业务列宽等 | 选择复用公共 Checkbox；页码和每页数量复用公共 Button/IconButton/Select |
| p.18 | Form/Section/Field/Actions/AnchorNav、Grid 组合和通用上传 Slot 布局 | 真正上传组件、窄屏规则和固定底部结论 | 字段只承载公共控件并建立 Label/帮助/Error ARIA 关系 |

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

## Task 04B 高级组件核验

| 项目 | 结果 |
|---|---|
| 验证路由 | `/__dev/components/advanced` 使用现有 AppShell；正式导航内没有开发路由链接；UI 规范页提供文字入口 |
| 组件范围 | Modal/PromptModal、Tabs 三种导出、Grid/GridItem、泛型 Table/EmptyTable、Pagination、Form/Section/Field/Actions/AnchorNav 均从公共入口导入 |
| Modal | 普通、info、warning、danger、success、close 和 busy 均实际打开；warning/danger 为 `alertdialog`，其他为 `dialog`；全部 `aria-modal=true` |
| Modal Focus/滚动 | 打开后焦点位于关闭按钮，`body` overflow 为 hidden；末按钮 Tab 循环回关闭按钮；Escape 关闭后焦点返回“普通 Modal”触发器，overflow 恢复 |
| Modal Portal | dialog 的 Overlay 祖先位于 `BODY`；1366 视口边界 left 403/right 963/top 289.5/bottom 478.5，z-index 40，完全位于视口内 |
| 提交中 | `aria-busy=true`，关闭和确认按钮均 disabled；验证定时结束后 Portal 与滚动锁清理 |
| Tabs | 鼠标切换 TitleBarTabs；UnderlineTabs 方向键把焦点移到“详细内容”，Enter 激活；Disabled 不可用，ARIA selected 同步 |
| Grid | 1920 下 6 栏项目等宽 384.5，16/8 实测约 1058.7/519.3；Computed position 为 static，无绝对定位 |
| Table | 初始全选为 mixed；选择 A 后全选为 true，取消 B 后恢复 mixed；禁用行不可选；Empty、Loading、Error 与 Retry 可见并可操作 |
| Pagination | 第 7 页点击后 `aria-current=page`；每页数量选择 20 后触发器更新；Select listbox 挂在 `BODY`；简易分页第一页前一页禁用、下一页后当前页变 2 |
| Form | Input 填入“交互验证”、Select 选择 Gamma、Radio 选项二、Checkbox 取消、Textarea 输入、Error `aria-invalid=true`、Disabled 不响应、提交中按钮 disabled |
| Form Anchor/Slot | 锚点点击更新 `aria-current=location` 并滚动；通用布局 Slot 不包含 file input 或上传行为 |
| 基础组件回归 | `/__dev/components/foundation` 正常；Select 键盘选中 Beta；Tooltip Focus 打开、Escape 关闭且 Portal 位于 BODY；没有改 AppShell 私有控件 |
| 正式与开发路由 | `/` 重定向 `/marketplace`；`/__dev/ui-spec`、基础组件页、高级组件页和 404 均正常；正式菜单无开发链接 |
| 1920 × 1080 | document 1920/1920、Main Content 1696/1696，无横向溢出；MiSans VF 为首选字体 |
| 1366 × 768 | document 1366/1366、Main Content 1142/1142，无横向溢出；Table 留在自身容器内；Modal 未越界 |
| 控制台 | 全部上述路由、组件操作和视口切换后 warning/error 列表为空 |
| 自动化 | 19 个测试文件、101 项测试通过，覆盖交互、ARIA、Portal、算法、泛型渲染和工程约束 |
| 评审截图 | `artifacts/components-advanced/` 生成 5 张真实浏览器 PNG；1920 × 1080 四张、1366 × 768 一张；目录由 `.gitignore` 排除 |

## Task 05A 资源商城初版核验（视觉优化前基线）

| 项目 | 结果 |
|---|---|
| 正式路由 | `/marketplace` 已替换占位页；`/` 仍重定向到资源商城；页面标题和正式菜单选中状态一致，未增加或调整正式菜单项 |
| 页面结构 | 现有 AppShell 与 PageTitleBar 下依次呈现页面说明、资源类型 Tabs、筛选区、条件回显、结果数量、商品卡和状态反馈；未加入 Hero、Banner、统计图或装饰性背景 |
| 资源类型 | 云服务器默认展示 6 项演示规格，物理机展示 4 项演示规格；Tabs 鼠标和键盘切换均通过，结果数量同步更新 |
| URL 状态 | `type=cloud|physical` 可恢复资源类型；`demoState=loading|error|empty` 仅用于开发验收且未进入正式导航；切换类型时会清理不再适用的 GPU 条件 |
| 搜索与筛选 | 名称、CPU/内存/整机摘要等规格关键字搜索，站点、CPU/GPU、GPU 型号、GPU 数量和可配置状态筛选均通过；多条件组合、条件标签移除与重置结果正确 |
| GPU 规则 | GPU 型号与数量从当前 Mock 数据派生，仅在 GPU 计算条件下出现；CPU 商品不展示虚假 GPU 字段，GPU 型号选项没有“无卡” |
| 商品卡 | 云服务器卡正确区分 CPU/内存/加速卡，并把默认系统盘表达为 `30 GB` 存储；物理机卡展示整机 CPU、内存、加速卡和演示整机摘要；不可配置原因使用可见文案且按钮禁用 |
| 购买入口 | 可配置云服务器进入 `/marketplace/cloud-server/purchase`，可配置物理机进入 `/marketplace/physical-machine/purchase`；占位页标题、Task 05B 边界、选中演示规格和返回商城入口均正常，不创建订单 |
| 返回商城 | 从两类购买占位页返回后保留资源类型；筛选、分页和滚动位置将在 Task 05B 结合正式购买流程统一接管 |
| Loading | 筛选区域保留且结果区显示克制加载反馈，结果区预留高度避免明显结构跳动；开发状态不会暴露到正式菜单 |
| Error 与 Retry | 错误状态有明确文案和重试按钮；重试会执行真实状态转换并恢复当前类型商品列表，不使用浏览器 Alert |
| Empty 与 No Result | 类型空资源与筛选无结果使用不同标题、说明和操作；空资源操作清除 `demoState`，无结果提供清除搜索与重置筛选 |
| Select Portal | 站点 MultiSelect 与各 Select 的 listbox 挂载到 `BODY`，z-index 为 30，1920 × 1080 下位于视口内且未被 AppShell 裁切 |
| 键盘与焦点 | Tabs 方向键、Select 方向键/Enter/Escape、筛选控件 Tab 顺序和 `:focus-visible` 正常；条件标签移除与全部重置后焦点回到搜索框 |
| 1920 × 1080 | document 与 Main Content 均无横向溢出；三列商品卡宽度约 524.7 px，筛选区、长字段和不可配置说明正常 |
| 1366 × 768 | document 1366/1366、Main Content 1142/1142；三列商品卡宽度约 340 px，筛选区合理折行，长整机摘要未溢出 |
| MiSans VF | Font Loading API 返回已加载；浏览器调试协议确认页面标题实际命中 `MiSans VF`，`isCustomFont=true` |
| 控制台 | 默认商城、两类资源、筛选、状态页、购买入口、404、UI 规范页、基础组件页和高级组件页均无应用 warning/error |
| 约束扫描 | 商城生产源码未出现 OneAiNexus、价格、按需购买、支付、审批或 AI 开发平台商品；业务组件只从 `src/components/ui` 公共入口导入 UI 组件 |
| 自动化 | 22 个测试文件、135 项测试通过，包含 Repository、页面、路由、卡片、状态、键盘/ARIA 与业务约束扫描 |
| 评审截图 | `artifacts/marketplace/` 生成 6 张浏览器原生 PNG：1920 × 1080 五张、1366 × 768 一张；文件尺寸已核验，目录由 `.gitignore` 排除 |

## Task 05A 资源商城权益中心参考重构核验

| 项目 | 结果 |
|---|---|
| 参考可用性 | 公开权益中心页面可正常访问；本地 `docs/reference-local/aliyun-benefit-reference.png` 可正常读取且由 `.gitignore` 排除；两者仅为视觉基准 |
| 研究应用 | 采用浅蓝页面气氛、分区标题、居中分类导航、四列密集卡片、核心值重心和浅色操作带；未复制品牌、文案、价格、优惠、Logo、插图、截图或代码 |
| 页面结构 | PageTitleBar 下依次为 142/126 px 紧凑导视区、资源类型 Tabs、浅色筛选面板、类型化商品标题和网格；AppShell 与正式菜单未修改 |
| 卡片结构 | 彩色浅底头部、白色 2 × 2 核心指标主体、补充信息和极浅类别色操作带；物理机 GPU 数量进入核心区，长 CPU/GPU/摘要保留可聚焦 Tooltip |
| 页面装饰色 | 蓝、青、紫及三种浅表面只集中在 `.marketplace-page`；成功色只表达可配置，不可配置使用中性状态、可见原因和禁用按钮；三组装饰文字对比度为 5.56/4.66/5.27 |
| 栅格 | 1920 × 1080 为 6/24 栏四列，单卡约 398.5 px；1366 × 768 为 8/24 栏三列，单卡约 353.3 px；公共 Grid API 未修改 |
| 卡片高度 | 直接基线云服务器 259/268 px、物理机 279/288 px；重构后云服务器 223–228 px、物理机 223 px，均无固定高度、额外 `min-height` 或填空弹性区域 |
| 筛选区 | 1920 默认云服务器/物理机为 120/130 px；1366 为 112/122 px；搜索、站点、计算类型和状态默认保持一行，GPU 条件自然进入第二行 |
| 首屏密度 | 1920 云服务器 6 张、物理机 4 张完整可见；1366 两类均完整显示 3 张，并分别露出第二排约 17/12 px |
| 页面长度 | 1920 主滚动内容与 944 px 可视区等高；1366 云服务器从 914 降至 867 px、物理机从 964 降至 872 px |
| 留白 | 卡片头部、主体和操作带实测合计约占根高度 99.1%，约 0.9% 为边框计算差异；原单一白表面由类别表面分组，CTA 不靠空白下推 |
| Hover 与 Focus | 可配置卡 Hover 使用类别边框、现有轻阴影和 2 px 上移且保持普通指针；不可配置卡无变化；`:focus-within`、长字段 `:focus-visible` 和 Tooltip 均实测可识别，Reduced Motion 关闭过渡 |
| 功能回归 | 两类切换、URL 恢复、搜索、全部筛选、多条件组合、重置、Loading、Error/Retry、Empty、No Result、不可配置和两类购买入口均保持原逻辑 |
| 分页 | 既有演示目录每类不超过每页 6 项，默认不显示分页；组件测试通过既有商品 fixture 与 `pageSize=1` 覆盖翻页分支，没有修改 Mock 数量 |
| Select/Tooltip Portal | 计算类型 Select listbox 实测挂在 Main Content 外的 `body` 层级；长 GPU 字段 Focus 后 Tooltip 正常出现并回显完整值 |
| 视口与溢出 | 1920 和 1366 的 document、Main Content 与商品区横向溢出均为 0；长 CPU、GPU 型号、整机摘要和不可配置原因受控 |
| MiSans VF | Computed Style 以 `MiSans VF` 为首选；Font Loading API 返回 loaded/true |
| 控制台 | 默认商城、类型切换、筛选、状态、购买入口与返回路径检查后应用 warning/error 为空 |
| 约束扫描 | 生产源码未出现阿里云或其他竞品品牌、外部图片、价格、促销、支付、审批或 AI 平台商品；公共组件仍从统一入口导入 |
| 视觉工作流 | `AGENTS.md` 已写入永久规则；当前任务没有创建、覆盖或保留新的页面截图，最终视觉验收由用户在本地浏览器完成 |
| 自动化 | `npm run test:run` 通过 23 个测试文件、141 项测试；覆盖三段卡结构、类型标题、四种视觉映射、装饰 Token、分页分支、依赖、外部素材和视觉工作流约束 |

详细模式取舍、计算方法、全部前后尺寸和 Task 05B 边界见 `docs/engineering/marketplace-visual-redesign.md`。

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
- p.13-p.14、p.16-p.18 的 Modal、Tabs、Grid、Table、Pagination 和 Form 组合已经由 Task 04B 实现；使用边界见 `components-advanced.md`。
- p.4 的 40 px、p.5 的 48 px、p.8 的成功容器标注仍需设计确认；p.5 的 Demibold 已按字体命名实例映射到 450，但是否就是设计预期仍需确认。
