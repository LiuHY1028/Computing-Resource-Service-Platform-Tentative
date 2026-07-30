# 页面与组件映射

> 用途：把信息架构中的稳定页面 ID 映射到统一布局、公共组件、业务组件和状态，供后续原型及工程任务直接引用。
>
> 业务依据：[需求基线](./01-requirements-baseline.md)与[信息架构](./04-information-architecture.md)。
>
> 视觉依据：[UI 规范提取](./07-ui-spec-extraction.md)。
> 约束：表中“新增规范外组件”只承载已确认业务；交易和单一主状态规则以 DEC-045～047 为准，不新增审批、权限或真实外部支付规则。

## 1. 组件分层

| 层级 | 定义 | 示例 | 复用要求 |
|---|---|---|---|
| 应用框架 | 所有登录后页面共享的壳层 | 顶栏、展开/收起侧栏、主内容容器、页面标题栏 | 全局唯一实现，尺寸遵循 PDF p.4-p.7 |
| 公共基础组件 | 不含业务语义、由 UI 规范直接覆盖的组件 | Button、Input、Textarea、Radio、Checkbox、Select、Modal、Tabs、Tooltip、Table、Pagination、Form | 统一 Design Token 与状态，不允许页面私有复制 |
| 公共扩展组件 | 产品必须具备但 PDF 未完整提供的通用组件 | Drawer、Loading、Skeleton、Empty、Error、Toast/Notification、Result、StatusBadge、CopyButton | 先定义统一规范，再供所有页面使用；不得各页自行画法 |
| 业务组件 | 组合公共组件以表达算力资源领域信息 | 资源规格卡、购买配置摘要、监控面板、连接信息、存储挂载选择器、端口规则编辑器 | 按业务对象复用；组件只展示已确认字段，待确认字段必须显式标记 |

## 2. 共享应用框架

所有页面默认使用 `AppShell`：

- `TopNavbar`：高 56 px；左侧品牌区宽 208 px；品牌内容可配置，不硬编码 OneAiNexus。（PDF p.4）
- `SideNavigation`：展开 208 px、收起 64 px；选中项圆角 8 px；收起态图标配 Tooltip。（PDF p.5）
- `MainContent`：与壳层留 8 px 外间隙、圆角 8 px、自适应剩余空间。（PDF p.6）
- `PageTitleBar`：高 64 px、左右内边距 20 px、右侧操作间距 8 px。（PDF p.7）
- `ContentGrid`：1080p 基准内容宽 1704 px、24 栏、边距/栏距均为 20 px。（PDF p.16）
- `FloatingAction`：若使用，距主内容右、下各 20 px；业务用途尚未确认，只预留组件能力，正式页面默认不显示。（PDF p.7）

## 3. 布局模板

| 模板 ID | 名称 | 结构 | 适用页面 | UI 依据 |
|---|---|---|---|---|
| `TPL-CATALOG` | 目录/卡片模板 | 页面标题栏 → 标题栏 Tab/筛选 → 24 栏卡片区 → 分页/页面状态 | `MKT-01`、`SW-01` | p.7、p.9、p.12、p.14、p.16、p.17 |
| `TPL-FORM` | 商品配置模板 | 页面标题栏 → 轻量购买进度 → 领域配置工作区 → Sticky 实时报价 → 确认订单 | `BUY-01`、`BUY-02`、`STO-03` | p.10-p.13、p.16、p.18；Task 15 结构重做 |
| `TPL-LIST` | 列表管理模板 | PageTitleBar → 可选紧凑概览带 → DataTable V2 单一工作区（Command Bar / Selection Bar / 表格 / 结果分页）；按领域启用筛选、批量操作、列设置和密度 | `RES-01`、`RES-03`、`STO-01`、`IMG-01`、`NET-01`、`ORD-01`、`OPS-01` | p.7、p.9-p.12、p.14、p.17；Task 14 结构性视觉返工 |
| `TPL-DETAIL` | 对象详情模板 | 页面标题栏 → 对象摘要 → 下划线 Tabs/锚点 → 分区容器 | `RES-02`、`RES-04`、`STO-02`、`ORD-02` | p.7、p.8、p.14、p.16、p.18 |
| `TPL-CHECKOUT` | 收银台模板 | 订单摘要与支付方式 → Sticky 应付金额和费用明细 → 支付/取消 → 交易结果 | `CHK-01` | Task 15 正式交易流程；不接入第三方支付 SDK |
| `TPL-TASK-MODAL` | 轻量任务模板 | 普通弹窗/抽屉 → 表单 → 确认/取消 → 结果反馈 | 创建存储、上传镜像、安装软件、开放端口等 | p.10-p.13、p.18；Drawer/结果反馈为规范外扩展 |

## 4. 页面与组件总映射

状态简写：`L` Loading、`E` Empty、`F` Error/Failure、`D` Disabled、`S` Success、`N` No-result、`P` Processing。这里描述的是界面反馈状态，不是后台正式业务状态枚举。

| 页面 ID / 页面 | 布局模板 | 公共组件 | 业务组件 | 核心交互 | 必须覆盖的状态 | 规范外组件与依据 |
|---|---|---|---|---|---|---|
| `MKT-01` 资源商城 | `TPL-CATALOG`；云服务器/物理机标题栏 Tab | TitleBarTabs、SearchInput、Select、MultiSelect、FilterTag、Button、Container、Grid、Pagination、Tooltip | `MarketplaceFilters`、`MarketplaceResults`、`MarketplaceStatePanel`、`ResourceProductCard` | 切换商品类型；搜索/组合筛选/清空；查看规格；进入 `BUY-01/02` | `L/E/N/F/D`；规格不可用时禁用配置并说明；筛选切换有反馈；错误可重试 | **需要**：资源规格卡和页面状态组合。依据：两类商品及带卡信息 `REQ-002/003/016`、列表状态 `INF-001/002`；PDF 无资源卡与页面状态 |
| `BUY-01` 云服务器购买配置 | `TPL-FORM`；分段表单 + 右侧锚点 + 底部确认 | Form、Select、Radio/Card Radio、Checkbox、Input、Textarea、Tooltip、Container、Button、Modal、Grid、Table、FormAnchorNav | `PurchasePageLayout`、`SelectedProductSummary`、`CloudStorageSection`、`CloudImageSection`、`NetworkRulesEditor`、`ConfigurationSummary`、`PurchaseSuccessState` | 读取商城规格；选择镜像；区分内存/系统盘/外挂存储；选择新购存储、已有存储或暂不挂载；配置网络；校验、确认、提交、返回恢复上下文 | `L/F/D/P/S`；商品缺失/类型不匹配；字段 Error；离开确认；保留会话草稿 | **需要**：存储选择、网络规则、Sticky 配置摘要和正式结果。依据：`REQ-013/015/021-027` 与当前存储领域定义 |
| `BUY-02` 物理机购买配置 | `TPL-FORM`；整机规格为主，待确认项不固化 | Form、Checkbox、Input、Textarea、Tooltip、Container、Button、Modal、Grid、Table、FormAnchorNav | `PurchasePageLayout`、`SelectedProductSummary`、`PhysicalPurchaseForm`、`PendingDecisionNotice`、`NetworkRulesEditor`、`ConfigurationSummary`、`PurchaseSuccessState` | 读取商城整机规格；填写用途；记录网络访问意向；校验、确认、演示提交、返回恢复上下文；不提供镜像/系统选择 | `L/F/D/P/S`；商品缺失/类型不匹配；待确认说明；字段 Error；离开确认；保留会话草稿 | **需要**：整机摘要、待确认提示、网络规则、Sticky 配置摘要和演示结果。依据：`REQ-016` 与物理机 OS/镜像冲突 `CON-006`；防止把假设做成规则 |
| `RES-01` 云服务器列表 | `TPL-LIST`；“我的资源”云服务器 Tab | Tabs、Search Input、Select、Button、Table、Pagination、Tooltip、Checkbox（若批量能力确认） | `ResourceStatusBadge`、`ResourceSpecCell`、`QuickActionMenu` | 搜索/筛选；进入 `RES-02`；发起适用的开机/关机；复制基础连接信息（若列表提供） | 首次 `L`、`E`、`N`、`F`；操作 `P/S/F/D`；分页加载；状态不明时不展示推断操作 | **需要**：状态标识、行操作菜单、异步操作反馈、骨架/错误。依据：`REQ-007/009`；PDF 无状态标识与 Loading |
| `RES-02` 云服务器详情 | `TPL-DETAIL`；摘要 + 详情分区/下划线 Tabs | Container、Tabs、Button、Tooltip、Table、Modal、Form | `ResourceSummary`、`ConnectionInfo`、`MonitoringPanel`、`MetricChart`、`StorageMountSummary`、`NetworkRuleSummary`、`SoftwareInstallSummary`、`RelatedOrderLink` | 查看规格/站点/系统盘/存储；复制 IP/SSH 信息；查看监控；发起开关机；跳转存储/网络/软件/订单 | 页面 `L/F`；监控 `L/E/F`；复制 `S`；各异步操作 `P/S/F/D`；关联对象缺失；无监控数据不等于加载失败 | **需要**：资源摘要、连接信息、监控图表、状态标识、复制反馈、异步结果。依据：`REQ-009-014/017/018/021-027`；PDF 无图表、复制与业务状态组件 |
| `RES-03` 物理机列表 | `TPL-LIST`；“我的资源”物理机 Tab | Tabs、Search Input、Select、Button、Table、Pagination、Tooltip | `ResourceStatusBadge`、`PhysicalSpecCell`、`QuickActionMenu` | 搜索/筛选；进入 `RES-04`；发起已确认适用操作；不得假设物理机与云服务器操作完全相同 | `L/E/N/F/P/S/D`；不可用操作说明；交付状态名称保持可替换 | **需要**：状态标识、整机规格单元格、异步反馈。依据：物理机需管理与监控 `REQ-008/010`，具体动作集合待确认 |
| `RES-04` 物理机详情 | `TPL-DETAIL`；摘要 + 分区/下划线 Tabs | Container、Tabs、Button、Tooltip、Table、Modal、Form | `PhysicalResourceSummary`、`ConnectionInfo`、`MonitoringPanel`、`MetricChart`、`NetworkRuleSummary`、`SoftwareInstallSummary`、`PendingDecisionNotice` | 查看整机规格、IP/连接、CPU/内存/加速卡监控；进入网络/软件/订单；只显示已确认适用操作 | 页面 `L/F`；监控 `L/E/F`；复制 `S`；操作 `P/S/F/D`；OS/镜像/存储适用性待确认提示 | **需要**：物理机摘要、监控图表、连接信息、待确认提示。依据：`REQ-008/010/011/016/017`；PDF 无领域详情与图表 |
| `STO-01` 存储列表 | `TPL-LIST`；标准页头 + 五项紧凑概览带 + 单一数据工作区 | Search Input、Select、Button、DataTable V2、DropdownMenu、UsageMeter V2、StatusBadge V2、Toast | `StorageIdentityCell`、`MountSummaryCell`、`StorageCompatibilityHint` | 搜索/筛选/排序/密度/列设置；选择后切换批量操作；按类型直达文件或挂载，其余进入菜单 | `L/E/N/F`；容量 Normal/High/Critical；行 Hover/Selected；1366 表格局部滚动 | **需要**：Task 14 样板结构；页头不重复，概览与表格不再套卡，操作有主次和即时反馈 |
| `STO-03` 存储购买 | `TPL-FORM`；现代商品配置器 + 实时报价 + 独立确认订单阶段 | Button、Input、Switch、Container、PricingSummary | `StorageProductCards`、`StorageTierCards`、`CapacityConfigurator`、`QuantityStepper`、`PeriodCards`、`ConditionalMountSettings`、`StickyQuote` | 比较云硬盘/共享存储；站点、性能、容量、数量、周期和条件挂载；保存配置；确认订单；创建订单并支付 | 校验 Error、报价实时更新、确认阶段、提交 Processing/Failure | **需要**：Task 15 明确推倒重做旧表单 DOM，不使用大数字区块和重复标题 |
| `STO-04` 文件管理 | 剩余视口高度的单一工作区；两层 Command Bar + 可折叠 Navigation + 文件主区 + 按需 Inspector | Button、SearchInput、Select、Checkbox、DropdownMenu、Modal、UsageMeter V2、PageState、Toast | `FileWorkbench`、`QuickAccess`、`DirectoryTree`、`FileList/Grid`、`ContextMenu`、`FileInspector`、`FilePreview`、`FileTaskPopover` | 前进/后退/上级、搜索、排序、列表/网格、选择后原位切换 Selection Bar、复制/剪切/粘贴、拖放、新建、上传下载、重命名、移动、删除、预览、快捷键、撤销 | 空目录、上传覆盖层、拖动数量、允许/禁止目标、单选/多选、任务成功/失败/重试、Inspector 默认关闭及 1366 覆盖式展示 | **需要**：PDF 无文件管理器；Task 14 文件工作台样板与 1366/1440/1920 验收 |
| `STO-02` 存储空间详情 | `TPL-DETAIL`；摘要 + 挂载关系列表 | Container、Tabs/锚点、Button、Table、Pagination、Modal、Tooltip | `StorageSummary`、`MountRelationTable`、`StorageTypeBadge`、`CompatibilityNotice` | 查看类型、站点和挂载关系；从关联资源返回；购后挂载/解绑仅在规则确认后开放 | 页面 `L/F`；挂载关系 `L/E/F`；关联资源缺失；操作若未确认则 D/不展示 | **需要**：存储摘要、挂载关系、兼容提示。依据：存储独立管理 `REQ-012/026/027`；文件浏览器不在当前确认范围 |
| `IMG-01` 镜像管理 | `TPL-LIST`；上传入口使用任务弹窗/抽屉 | Search Input、Select、Button、Table、Pagination、Modal、Form、Tooltip | `ImageCompatibilityBadge`、`UploadImageForm`、`UploadProgress`、`ImageSourceLabel` | 搜索/筛选；打开上传；校验表单；上传并查看结果；作为 `BUY-01` 的关联入口 | `L/E/N/F`；上传校验 Error/D；上传 `P/S/F`；兼容性未知或不兼容提示 | **需要**：Drawer（如采用）、上传进度、兼容性标识、结果反馈。依据：镜像上传与创建选择 `REQ-015`；PDF 仅给上传区域，无进度/兼容性 |
| `SW-01` 软件中心 | `TPL-CATALOG`；软件卡片 + 安装任务弹窗 | Search Input、Select、筛选标签、Button、Container、Pagination、Modal、Form、Tooltip | `SoftwareCard`、`CompatibilityBadge`、`TargetResourceSelector`、`InstallTaskSummary` | 搜索/筛选；查看软件信息；选择目标资源；发起安装；跳转资源/操作记录 | `L/E/N/F`；目标资源加载 `L/E/F`；不兼容 D；安装 `P/S/F`；版本/卸载规则不擅自出现 | **需要**：软件卡、兼容性标识、安装任务反馈。依据：软件安装 `REQ-017`；PDF 无软件目录与安装进度 |
| `NET-01` 网络与访问 | `TPL-LIST`；资源筛选、网络摘要与基础访问规则 | Search Input、Select、Button、DataTable V2、Modal、Form、Input、Tooltip | `NetworkRuleEditor`、`ResourceSelector`、`ConnectionInfo` | 按资源筛选；使用 SSH/RDP/HTTP/HTTPS 模板或自定义单端口；配置来源；启停、编辑和删除 | `L/E/N/F`；字段 Normal/Focus/Error/D；全部来源风险提示；免费操作直接完成 | **需要**：单端口规则编辑、来源类型、全局操作记录链接。依据：`REQ-014` 与基础访问目标 |
| `ORD-01` 订单列表 | `TPL-LIST`；交易订单单一主状态 | Search Input、Select、DataTable V2、StatusBadge、Button | `OrderStatusBadge`、`OrderSnapshotCell`、`ResourceLinkCell` | 搜索/筛选；去支付；取消待支付订单；查看订单/资源 | `L/E/N/F`；每行一个主状态；取消确认；关联资源未生成 | **需要**：Task 15 统一订单类型、状态机、价格快照和账单关系 |
| `ORD-02` 订单详情 | `TPL-DETAIL`；价格快照 + 单一当前状态 + 历史时间线 | Container、StatusBadge、Button、DataTable V2 | `OrderSummary`、`OrderTimeline`、`RelatedBillCard`、`RelatedResourceCard` | 去支付/取消；查看账单和资源；历史节点不与当前状态并列 | 页面 `L/F`；单一当前状态；关联账单/资源缺失 | **需要**：Task 15 订单交易与履约追踪 |
| `BILL-01` 账单列表 | `TPL-LIST`；账务对象单一主状态 | Search Input、Select、DataTable V2、StatusBadge、Button | `BillStatusBadge`、`OrderLinkCell`、`BillingPeriodCell` | 搜索/筛选；查看账单/订单；未支付账单进入收银台 | `L/E/N/F`；每行一个主状态 | **需要**：Task 15 独立账单模型与正式路由 |
| `BILL-02` 账单详情 | `TPL-DETAIL`；金额、费用明细与关联交易 | Container、StatusBadge、Button、DataTable V2 | `BillSummary`、`BillLineItems`、`RelatedOrderCard` | 查看订单/资源；未支付时进入收银台 | 页面 `L/F`；单一当前状态；关联对象缺失 | **需要**：Task 15 账单快照和支付信息 |
| `CHK-01` 收银台 | `TPL-CHECKOUT`；订单核对 + 支付方式 + Sticky 金额 | Container、CardRadio、RadioGroup、Button、PromptModal、PricingSummary、StatusBadge | `CheckoutOrderSummary`、`PaymentMethodSelector`、`CheckoutResult` | 确认支付；取消待支付订单；支付失败重试；完成后查看资源/订单 | 待支付、支付中、支付失败、开通中、完成、取消确认 | **需要**：Task 15 本地交易闭环；不生成第三方交易号 |
| `OPS-01` 操作记录 | `TPL-LIST`；跨资源操作结果列表 | Search Input、Select、Table、Pagination、Tooltip、Modal（查看失败详情） | `OperationResultBadge`、`OperationTargetLink`、`FailureDetailPanel` | 搜索/筛选；查看操作对象和结果；进入关联资源；查看失败原因并按允许方式重试 | `L/E/N/F`；单条操作 `P/S/F`；关联对象缺失；重试按钮 D 时说明原因 | **需要**：操作结果标识、失败详情、统一重试反馈。依据：完整管理与异常闭环的推断需求 `INF-004/008`；不定义后台状态机 |

## 5. 业务组件定义与边界

### 5.1 资源发现与购买

| 组件 | 最小职责 | 可使用字段 | 禁止承载 | 页面 |
|---|---|---|---|---|
| `ResourceProductCard` | 比较可购资源并进入配置 | 商品类型、站点、CPU、内存、加速卡型号/数量、可用性说明 | 开关机、SSH、监控；未经确认的价格/计费周期 | `MKT-01` |
| `MarketplaceFilters` | 组合搜索、站点、计算类型、配置状态和条件式加速卡筛选；回显并移除当前条件 | 目录派生的站点/加速卡选项、搜索文字、界面级配置状态 | “无卡”GPU 型号；正式库存/上下架规则；页面私有复制公共控件 | `MKT-01` |
| `MarketplaceResults` | 展示筛选后数量，编排三列规格卡、分页和页面状态 | 当前资源类型、查询结果、页面级 Loading/Error/Empty/No Result | 订单提交、资源交付或把界面态命名为后台状态 | `MKT-01` |
| `MarketplaceStatePanel` | 在结果上下文内统一呈现 Loading、Error、Empty、No Result 及对应下一步 | 中性标题、说明、重试/清除搜索/重置/切换类型操作 | 后台错误码、库存状态机；用同一文案混淆空目录和筛选无结果 | `MKT-01` |
| `CloudSpecSelector` | 选择云服务器规格 | CPU、内存、加速卡信息、站点可用性 | 把系统盘写成内存；暗含库存/锁定规则 | `BUY-01` |
| `PhysicalSpecSelector` | 选择整机规格 | CPU、内存、加速卡型号/卡数、站点 | 默认镜像、系统盘或自动开机规则 | `BUY-02` |
| `PurchaseStepper` | 统一配置、确认订单、支付三个交易阶段 | 当前路由、草稿阶段、订单主状态 | 页面自行维护另一套步骤 DOM；允许跳转未来步骤 | `BUY-01/02`、`STO-03`、`CHK-01` |
| `Drawer` | 承载需要持续核对摘要和报价的专用流程 | 标题、说明、正文、主次操作、焦点与关闭回退 | 仅换标题的通用业务弹窗；不可恢复的页面跳转 | 资源续费、物理机续租 |
| `SystemDiskField` | 显示系统盘配置 | 标签“系统盘”、暂定默认 `30 GB`、是否可编辑的待确认说明 | K8S Pod 底层术语；将 30 GB 表达为内存 | `BUY-01` |
| `StorageMountSelector` | 选择已有独立存储 | 云硬盘/高性能共享存储、名称、站点兼容性与可挂载状态 | 不显示已单独挂载的云硬盘；物理机本地盘不进入选择器 | `BUY-01`、`STO-02/03` |
| `PurchaseSummary` | 配置阶段实时复述选择与费用 | 已选择配置、价格目录生成的报价 | 支付状态、第三方交易号或真实基础设施结果 | `BUY-01/02` |
| `NetworkRulesEditor` | 复用 SSH/来源与基础访问规则编辑 | TCP/UDP、单一访问端口、IPv4/CIDR/全部来源、说明 | 双端口映射、安全组、复杂路由、真实地址或凭据 | `BUY-01/02` |
| `PurchaseOrderConfirmation` | 在正式确认阶段冻结前复核配置和费用 | 商品摘要、完整配置、价格快照、返回修改 | 使用 Modal 绕过路由阶段；付款前提前履约 | `BUY-01/02`、`STO-03` |

`MKT-01` 状态组合覆盖：

| 状态 | 判定边界 | 反馈与恢复 |
|---|---|---|
| Normal | 当前类型目录和筛选结果均有数据 | 显示数量、规格卡和适用时的分页 |
| Loading (`L`) | 本地演示数据读取中 | 保留筛选上下文，结果区显示克制加载反馈 |
| Error (`F`) | 数据读取失败 | 可见错误说明和真实重试操作 |
| Empty (`E`) | 当前资源类型目录总数为 0 | 说明该类型暂无资源并提供切换类型入口 |
| No Result (`N`) | 目录有数据但组合条件结果为 0 | 清除搜索和/或重置筛选，不与 Empty 共用文案 |
| Disabled (`D`) | 单个规格暂不可配置 | 卡片仍可比较；按钮禁用；可见原因与 Tooltip/ARIA 说明 |

以上均为页面反馈状态，不是正式库存、资源、订单或交付状态枚举。

### 5.2 资源管理与监控

| 组件 | 最小职责 | 必须状态 | 业务边界 | 页面 |
|---|---|---|---|---|
| `ResourceStatusBadge` | 视觉化显示后端返回的资源状态 | Normal、语义色、未知状态兜底 | 状态枚举和流转由产品/后端确认；组件不自行命名 | `RES-01/03`、详情摘要 |
| `ResourceSummary` | 展示资源身份、站点和规格摘要 | Loading、Error、正常、字段缺失 | 不把商品发现/购买比较塞入详情 | `RES-02/04` |
| `ConnectionInfo` | 展示和复制 IP、端口、SSH 等连接信息 | Loading、Unavailable、Copy Success/Failure | 不等同于浏览器内置 SSH 终端；凭证规则待确认 | `RES-02/04`、`NET-01` |
| `MonitoringPanel` | 组织监控指标、时间范围和图表状态 | Loading、Empty、Error、正常 | 指标口径、刷新频率、告警阈值保持待确认 | `RES-02/04` |
| `MetricChart` | 展示 CPU/内存/加速卡等时序数据 | Loading、Empty、Error、Hover/Tooltip | PDF 没有图表规范；不得用静态图片代替 | `RES-02/04` |
| `QuickActionMenu` | 收纳适用于当前资源的管理动作 | Normal、Disabled reason、Processing | 不推断物理机与云服务器具有相同动作矩阵 | `RES-01/03`、详情 |

### 5.3 存储、镜像、软件和网络

| 组件 | 最小职责 | 关键状态 | 边界 | 页面 |
|---|---|---|---|---|
| `StorageTypeBadge` | 区分独立云硬盘与高性能共享存储 | 两类明确视觉；未知类型兜底 | 物理机本地存储仍只属于整机详情 | `STO-01/02/03`、购买/资源详情 |
| `MountRelationTable` | 展示存储与资源关联 | Loading、Empty、Error、Processing、Removing | 云硬盘单资源挂载；共享存储多资源挂载；均校验站点 | `STO-02/03` |
| `FileManagerShell` | 组合工具栏、目录树、列表/网格、详情面板和任务中心 | Empty、Search no result、Selected、Dragging、Task success/failure | 仅使用浏览器 File/Blob，不依赖远程文件服务 | `STO-04` |
| `DirectoryPicker` | 为复制和移动选择正式目标目录 | Current、Selected、Conflict、Cycle blocked | 禁止跨存储移动和移动到自身子目录 | `STO-04` |
| `FilePreview` | 本地预览图片、文本、JSON、Markdown、PDF 和音视频信息 | Previewable、Metadata only、Unavailable | 不调用外部预览服务 | `STO-04` |
| `UploadImageForm` | 收集镜像上传所需已确认信息 | Normal、Error、Disabled、Uploading、Success、Failure | 格式、大小、审核、版本未确认时仅放可替换占位字段 | `IMG-01` |
| `CompatibilityBadge` | 表达站点/资源兼容结果 | Compatible、Incompatible、Unknown | 兼容矩阵必须来自数据，不由前端推断 | `IMG-01`、`SW-01` |
| `SoftwareCard` | 展示可安装软件/环境并进入安装 | Loading、Disabled reason、Selected | 不自动增加版本、升级、卸载、预装规则 | `SW-01` |
| `PortRuleEditor` | 组合端口暴露/转发与来源 IP 字段 | Default、Focus、Validation Error、Submitting、Failure | 协议、范围、审批、安全限制待确认 | `NET-01` |

### 5.4 订单与操作记录

| 组件 | 最小职责 | 关键状态 | 边界 | 页面 |
|---|---|---|---|---|
| `PurchaseSnapshot` | 复述购买时已确认配置和提交时价格快照 | Loading、字段缺失、正常 | 金额只来自统一价格目录；不表达支付结果 | `ORD-01/02` |
| `OrderStatusBadge` | 显示接口返回的订单状态 | Known、Unknown | 不自行建立订单状态机 | `ORD-01/02` |
| `OperationResultBadge` | 显示动作处理/结果 | Processing、Success、Failure、Unknown | 只作界面语义，不定义后端任务流转 | `OPS-01` |
| `FailureDetailPanel` | 展示可理解的失败原因和可用下一步 | Loading、Detail、Unavailable | 不泄露 K8S Pod/内部错误；重试条件由业务确认 | `OPS-01` 及各操作反馈 |

## 6. 必须新增的规范外公共组件

> Task 07 已将 `PageState` 与 `StatusBadge` 落地为无业务枚举的公共组件，并由公共入口统一导出；各领域只负责把自身状态映射为公共视觉语义。

| 组件 | 为什么必须新增 | 最小变体/状态 | 设计依据 |
|---|---|---|---|
| `PageState` | PDF 只给表格空状态，产品所有页面都需要统一反馈 | Loading、Empty、NoResult、Error、Unavailable；含重试或下一步 | 原型验收要求；沿用 p.8 容器、p.9 按钮、p.17 空状态；权限模型未确认，不设专用权限变体 |
| `Skeleton` / `Spinner` | 防止异步加载无反馈及布局跳动 | Page、Table、Card、Detail、Inline | PDF 缺失；尺寸/颜色应基于中性色与原组件骨架 |
| `Toast` / `Notification` | 复制、提交、开关机等动作需要即时结果 | Info、Success、Warning、Error、Loading | 功能色取 p.2；容器取 p.8；行为规范需新增 |
| `ResultFeedback` | 购买、创建、上传、安装等任务需明确成功/失败和去向 | Processing、Success、Failure、Partial/Unknown（仅后端提供时） | p.13 提示弹窗可作为视觉起点，正式状态不由组件定义 |
| `Drawer` | 上传、安装、网络规则等较长轻量任务可能不适合小弹窗 | 默认、Loading、Error、Unsaved-change confirm | PDF 未提供；沿用 p.13 Head/Content/Footer 和 p.18 表单间距 |
| `StatusBadge` | 资源、订单、操作结果需紧凑表达状态 | Neutral、Info、Success、Warning、Error、Unknown | 颜色取 p.2；具体枚举由业务数据提供 |
| `CopyButton` | IP/端口/SSH 信息需要复制反馈 | Normal、Hover、Focus、Copied、Failure、Disabled | 按钮取 p.9、Tooltip 取 p.15；Copied/Failure 为扩展 |
| `MetricChart` | 已确认资源监控无法由表格替代 | Loading、Empty、Error、Normal、Hover Tooltip | 色彩/字体/Tooltip 取 p.2、p.3、p.15；图表轴线/曲线规范待设计 |
| `Progress` | 上传镜像、安装软件、异步交付需要过程反馈 | Indeterminate、Determinate（仅有数据时）、Success、Failure | PDF 缺失；不得虚构百分比 |
| `DropdownMenu` / `DropdownMenuItem` / `DropdownMenuGroup` / `DropdownMenuSeparator` | 资源列表和详情需要在触发器附近承载分组操作，避免使用大型弹窗导航 | Closed、Open、Keyboard focus、Disabled、Danger、Viewport edge | Task 09；使用 Portal 避免表格裁切，具体操作仍由 Modal 承担确认或填写 |
| `DataTable V2` | 数据密集页面以单一 Command Bar、按需 Filter Summary、Selection Bar、组合单元格、行快捷操作、状态页和结果分页形成连续工作区 | Standard/Compact/Comfortable、Sorted、Selected、Loading、Empty、NoResult、Error、Overflow、Embedded | Task 14；基于公共 `Table` 语义组合，不引入表格库；旧页面标题/筛选卡/表格卡结构不再兼容 |
| `UsageMeter V2`（兼容 `CapacityBar` / `MiniProgress` / `MetricProgress`） | 表格、概览和文件导航分别用清晰轨道表达总量、已用、剩余、百分比与容量风险 | Table、Overview、Sidebar；Normal、High、Critical、Unknown | Task 14；统一阈值、数值、状态文字和颜色，不引入随机或服务端指标 |
| `StatusBadge V2` | 为每个业务对象的唯一主状态提供文本、形状标记和背景/边框语义 | Neutral、Info、Success、Warning、Error、Unknown | Task 14/15；同一对象同一区域只出现一个，健康、容量和到期风险不得作为第二个主状态 |
| `FileTaskPopover` | 文件上传、复制、移动、删除和下载的非阻断任务反馈 | Empty、Running、Completed、Failed、Retry、ClearCompleted | Task 14；顶部入口打开浮层，不占工作区整行，不虚构服务端进度 |
| `PricingSummary` | 在购买、续费、续租、扩容、订单、账单和收银台展示整数分费用明细与总额 | Free、Included、Monthly、Hourly、Quantity、Duration | Task 10/15；金额只读统一价格目录或不可变价格快照 |
| `Switch` | 自动续费、购买后挂载等即时布尔配置需要比 Checkbox 更明确的开关语义 | On、Off、Hover、Focus、Disabled | Task 15 存储配置器；原生 checkbox 提供 `role=switch`、键盘操作和可见标签 |
| `PendingDecisionNotice` | 防止将待确认项实现成确定规则 | Inline、Section、Blocking | 使用 p.8 信息/注意容器；文案明确“暂定/待确认” |

## 7. 公共组件状态覆盖要求

| 页面类型 | Loading | Empty | Error | Disabled | Success | 额外要求 |
|---|---|---|---|---|---|---|
| 目录/卡片页 | 页面或卡片骨架 | 首次空、筛选无结果分开 | 页面加载失败可重试 | 不可购/不兼容说明 | 筛选与进入配置有反馈 | 卡片尺寸在不同状态下保持稳定 |
| 列表页 | 表格骨架/局部 Loading | 数据空、筛选无结果分开 | 表格失败保留页面标题与筛选 | 行操作禁用原因 | 行操作成功同步更新 | 分页与筛选上下文不因失败丢失 |
| 详情页 | 摘要与各分区可独立加载 | 监控/关联对象各自空态 | 页面级与分区级错误分开 | 操作按实际条件禁用 | 复制/操作成功明确反馈 | 不把“暂无数据”误判为资源异常 |
| 表单页 | 依赖选项局部加载、提交中 | 选择器无选项 | 字段错误 + 提交失败 | 缺必填、依赖不兼容、提交中 | 成功反馈后再导航 | 失败保留已填内容，取消防误丢失 |
| 弹窗/抽屉 | 内容或提交 Loading | 依赖列表为空 | 字段/任务失败 | 确认按钮禁用原因 | 成功关闭并刷新来源页 | Focus 不逃逸，关闭策略待实现规范补齐 |

## 8. 跨页面组件复用关系

```mermaid
flowchart TD
    Shell["AppShell"] --> Catalog["TPL-CATALOG"]
    Shell --> Form["TPL-FORM"]
    Shell --> List["TPL-LIST"]
    Shell --> Detail["TPL-DETAIL"]

    Catalog --> MKT["MKT-01"]
    Catalog --> SW["SW-01"]
    Form --> BUY1["BUY-01"]
    Form --> BUY2["BUY-02"]
    List --> RESL["RES-01 / RES-03"]
    List --> AUXL["STO-01 / IMG-01 / NET-01 / ORD-01 / OPS-01"]
    Detail --> RESD["RES-02 / RES-04"]
    Detail --> AUXD["STO-02 / ORD-02"]

    State["PageState / Skeleton / ResultFeedback"] --> Catalog
    State --> Form
    State --> List
    State --> Detail
    Task["TPL-TASK-MODAL / Drawer"] --> BUY1
    Task --> AUXL
    Monitoring["MonitoringPanel / MetricChart"] --> RESD
    Connection["ConnectionInfo / CopyButton"] --> RESD
    Connection --> NET["NET-01"]
```

## 9. 实施顺序与组件闸门

1. 先实现 Design Token、`AppShell` 和 PDF 已定义的基础组件，再创建业务页面。
2. 在第一个异步页面前完成 `PageState`、`Skeleton`、`Toast/Notification`、`ResultFeedback`；不得用临时页面私有样式代替。
3. 在商城前完成 `ResourceProductCard` 和规格摘要；在购买页前完成规格选择、存储挂载选择和购买摘要。
4. 在资源详情前完成 `StatusBadge`、`ConnectionInfo`、`CopyButton`、`MonitoringPanel/MetricChart`。
5. 在镜像/软件/网络任务前统一 Modal/Drawer 的表单、提交和结果反馈模式。
6. 任何新增业务状态、字段或操作必须先回到决策日志/待确认问题更新；组件映射不能成为创造业务规则的入口。

## 10. 页面级验收要点

- 17 个稳定页面 ID 都有且仅有一个主布局模板，没有孤岛页面。
- `MKT-01 → BUY-01/02 → RES-02/04` 的主路径复用同一套提交和结果反馈。
- 云服务器和物理机共享布局与基础组件，但不强迫共享未经确认的镜像、系统盘、存储和操作字段。
- `30 GB` 只出现在 `SystemDiskField`/相关快照的系统盘语义中，绝不作为内存值。
- 独立云硬盘与高性能共享存储在购买、存储列表、详情和资源详情中使用同一类型标识和文案；物理机本地存储不进入独立存储管理。
- 所有列表页都覆盖 Loading、Empty、NoResult、Error；所有提交都覆盖 Processing、Success、Failure、Disabled。
- 规范外组件有统一 Token、状态和复用范围；不以截图、绝对定位或无反馈按钮补齐页面。
- OneAiNexus Logo/名称只作为 UI 来源说明，不进入任何业务组件默认内容。

## 11. 三区域布局补充

本节覆盖 `MKT-01`、`BUY-01/02`、`SW-01` 原先归入统一 `AppShell` / `TPL-CATALOG` 的布局关系；控制台页面继续沿用原规范。

| 组件 / 模板 | 结构与适用范围 | 需求依据 | 状态覆盖与边界 |
|---|---|---|---|
| `MarketplaceLayout` | 56px 白色产品顶栏 → 蓝色商城 Hero / 能力条 / 价格矩阵 / 完整商品目录 / 规格对比 / 算力价值图文 → 共用深色页脚；仅用于 `/marketplace/*` | Task 11 的区域拆分、Task 16 指定参考页、`REQ-002/003/016`、`DEC-048` | 顶栏当前区、跨区入口、消息反馈、响应式导航；不引入控制台侧栏 |
| `SoftwareCenterLayout` | 共用产品顶栏 → 较短软件 Hero / 能力条 / 版本矩阵 / 软件目录 / 部署价值图文 → 共用深色页脚；仅用于 `/software/*` | Task 16 指定参考页、软件发现与安装目标、`REQ-017`、`DEC-048` | 搜索无结果、兼容禁用、安装处理/失败/提交反馈；同品牌但不复刻硬件价格模板 |
| `ConsoleLayout` | 控制台顶栏 → 左侧后台菜单 → `MainContent`；仅用于 `/console/*` | Task 11 的控制台边界、`REQ-007-018` | 侧栏展开/收起、高亮、顶栏跨区入口；商城和软件中心不进入侧栏 |
| `ProductAreaNavigation` | 商城和软件中心共享品牌、区域切换、控制台、消息和用户入口；白底、细下划线激活态 | Task 11 的三区域互达要求、Task 16 参考页顶栏 | 当前区、Hover、Focus、消息展开和窄屏；品牌名称继续读取集中配置 |
| `ProductAreaFooter` | 产品与服务、资源管理、交易记录及平台说明四组真实入口；共用说明桥接区和深色页尾 | Task 16 参考页页尾与生产化约束 | Focus、窄屏重排；不出现二维码、联系方式、备案或外部社交入口 |
| `MarketplaceHero` | 资源定位、浏览资源、进入控制台和原创算力节点图形 | 商城购买转化、Task 16 参考页、`REQ-002/003/016` | 1920/1440/1366 比例、Focus 和减少动效；不承载库存、促销或交付时效承诺 |
| `MarketplacePriceMatrix` | 从商品目录和统一价目派生三列云服务器/物理机规格与价格，复用原配置入口 | Task 16 价格矩阵、`REQ-002/003/016` | 可配置、暂不可配置、价格缺失防御、计费模式切换和响应式列数 |
| `MarketplaceSpecificationComparison` | 按可购 GPU SKU 展示卡数归一化配置规模、关联规格和价格 | Task 16 规格对比；当前目录无可信跑分数据 | 行操作筛选、Focus、零数据；进度不表示理论性能或实测跑分 |
| `MarketplaceValueStory` | 原创算力资源编排插画 + “规格查找、价格核对、购后管理”三段价值说明和目录/控制台入口 | Task 16 产品价值表达、`DEC-048` | 图片替代文本、两项入口 Focus、900px 以下单列；不展示客户数量、性能倍数或交付承诺 |
| `SoftwareVersionMatrix` | 按分类展示软件、发布方、版本、系统、算力兼容、费用和详情/安装操作 | Task 16 版本矩阵、软件发现与 `REQ-017` | 分类切换、费用策略、详情和安装入口；不虚构授权金额 |
| `SoftwareValueStory` | 原创软件包与部署管理插画 + “兼容判断、费用边界、安装后管理”三段价值说明和目录/资源入口 | Task 16 产品价值表达、`REQ-017`、`DEC-048` | 图片替代文本、两项入口 Focus、900px 以下单列；不恢复安装覆盖率或虚构使用热度 |
