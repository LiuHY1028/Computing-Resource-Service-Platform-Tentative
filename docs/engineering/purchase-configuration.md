# 购买配置原型

## 范围与业务边界

Task 05B 将 `BUY-01` 云服务器购买配置和 `BUY-02` 物理机购买配置从入口占位页升级为完整演示流程。两个页面能够读取商城所选商品、填写与该商品类型相符的配置、实时复述、校验、确认并完成短暂的前端演示提交。

本实现没有后端调用，不创建真实订单、计算资源、SSH 凭据、网络规则、库存变化或资源生命周期，也不向“我的资源”写入数据。确认弹窗与成功结果均明确显示：

> 本次仅完成原型配置演示，未生成真实订单或计算资源。

## 页面结构

两个页面使用 AppShell 现有标准 `PageTitleBar`，标题分别为“配置云服务器”和“配置物理机”。正文共用 `PurchasePageLayout`：顶部只保留轻量原型边界提示，随后使用公共 24 栏 `Grid`，左侧 16 栏为已选商品和分区表单，右侧 8 栏为 `FormAnchorNav` 与实时配置摘要。桌面高度充足时右栏 Sticky；低高度视口禁用 Sticky 并随页面自然滚动，摘要卡和右栏均不产生内部纵向滚动。

页面延续资源商城的低饱和蓝白表面、细边框和紧凑密度。云服务器使用蓝/青局部强调；物理机使用低饱和紫色并把“整机交付边界”提升为主要区块。装饰色只存在于 `.purchase-page`，没有提升为新的全局 Token。

## 文件与职责

| 位置 | 职责 |
|---|---|
| `src/pages/PurchasePage.tsx` | 解析 `product`/`viewState`，协调商品读取、表单、草稿、校验、确认、提交和成功状态 |
| `src/features/purchase/components/` | 共用页面骨架、商品摘要、配置摘要、网络规则编辑器、确认弹窗、成功和页面状态 |
| `src/features/purchase/cloud/` | 云服务器基础信息、系统盘、数据盘和镜像配置 |
| `src/features/purchase/physical/` | 物理机整机使用信息、标准交付说明和网络意向 |
| `src/features/purchase/data/` | 类型安全的演示镜像、演示共享存储空间和初始配置 |
| `src/features/purchase/services/` | 商品读取包装、会话草稿和短暂演示提交 |
| `src/features/purchase/validation/` | 名称、数量、路径、IPv4/CIDR、端口和重复规则校验 |
| `src/features/marketplace/services/marketplaceNavigationContext.ts` | 保存与恢复商城筛选、页码和主滚动区位置 |

公共 UI 组件只从 `src/components/ui/index.ts` 导入。页面复用了 `Container`、`Button`、`TextButton`、`Input`、`Textarea`、`CardRadio`、`Checkbox`、`Select`、`Modal`、`PromptModal`、`Grid`、`GridItem`、`Table`、`Form`、`FormSection`、`FormField`、`FormActions` 和 `FormAnchorNav`，没有复制控件实现或改变公共 API。

## 商品数据复用

购买页只接受 URL 中的 `?product=<商品 ID>`，通过 `loadPurchaseProduct` 调用商城公开的 `getMarketplaceProductById`，最终读取 `MARKETPLACE_CATALOG_PRODUCTS` 同一份数据。CPU、内存、GPU、站点、商品名称、整机摘要和可配置性不会在购买 Feature 中重新定义。

页面按联合类型校验路由：云服务器页拒绝物理机商品，物理机页拒绝云服务器商品。缺失商品、类型不匹配、不可配置、持续 Loading、读取 Error/Retry 都有独立状态。刷新页面时商品 ID 仍在 URL 中，因此正常状态可重新建立。

## 表单数据模型

`CloudPurchaseConfiguration` 包含实例名称、正整数数量、用途说明、固定系统盘容量、数据盘选择及其条件字段、可空镜像 ID 和共用网络配置。镜像默认及“不选择镜像”状态统一序列化为 `null`。`PhysicalPurchaseConfiguration` 包含整机资源名称、正整数数量、用途说明和共用网络意向，不含云服务器磁盘或镜像字段。

数量只校验为正整数，不声明正式最大数量。名称采用 48 字符原型保护值，用途说明采用 240 字符原型保护值；两者都不构成正式数据定义。页面不会采集正式使用人、审批人、预算、合同或敏感凭据。

## 云服务器配置

### 系统盘

系统盘值来自商城云服务器商品的 `defaultSystemDiskGb`，当前集中演示数据为 `30 GB`。页面以静态规格块展示“系统盘容量：30 GB”和“当前系统盘容量不可修改”，不渲染 Input。它是系统和运行环境的存储容量、不是内存；页面不提供容量选项或扩容规则。

### 数据盘

数据盘支持三种界面选择：

- 不挂载数据盘：隐藏并清空全部条件字段；
- 本地数据存储：辅助说明 HostPath，填写主机绝对路径、容器挂载绝对路径和只读标记；
- 高性能共享存储：辅助说明 NFS，从集中演示空间中选择名称和演示容量，再填写挂载绝对路径和只读标记。

切换类型会清空不再适用的字段，已出现的旧类型错误会随实时重新校验消失。HostPath 说明主机绑定特性但不创建目录或承诺持久性；NFS 只使用演示空间，不建立连接、容量扣减或并发能力口径。

### 镜像

`presetImages.ts` 集中维护基础系统、GPU 运行环境、开发工具链和平台基础环境四类预置镜像。镜像为可选项，卡片组首项为“不选择镜像”，用户选择后可再次切回空值。页面按商品 `computeType` 过滤：GPU 专用镜像不会出现在 CPU 商品下。镜像为空不阻塞确认或提交，摘要、确认和成功状态统一显示“未选择（可选）”。当前流程不包含 Notebook、训练、推理、商业授权或用户上传能力。

## 物理机配置

物理机页围绕整机规格、名称、数量、用途和交付后的网络访问意向组织。已选整机直接复述商城 CPU、内存、GPU 和 `machineSummary`。

标准交付流程为：支付成功后，平台进行物理机部署和基础初始化；资源可用后，用户在“我的资源 > 物理机详情”查看连接与交付信息。购买页列出资源名称/ID/状态、站点、整机规格、操作系统、主机名、内外网信息、SSH 用户/端口/认证方式/连接命令、子网/网关及开通/到期时间等交付字段。公网 IP 按网络策略分配，无公网时明确显示；BMC/IPMI 管理地址只向具备权限的用户展示，不进入购买页。

认证方式采用已登记 SSH 公钥：正式购买或提交前选择公钥，交付后写入服务器；详情提供登录用户、IP、端口和可复制命令，不长期明文展示密码。当前原型只显示“认证方式：SSH 密钥”和“连接信息：资源交付完成后生成”，不会生成密钥、密码、真实 IP 或 BMC 账号。

`OQ-015` 仍只约束操作系统具体选择、镜像关系和重装能力。页面没有镜像、系统版本、系统重装、云服务器式系统盘、HostPath、NFS、扩容或 RAID 配置，也不执行真实支付、部署或资源状态变更。

## 网络与端口规则

两类表单复用同一个 `NetworkRulesEditor`。云服务器表达 SSH 配置；物理机明确表达交付后的访问意向。启用 SSH 后需要 IPv4 或 CIDR，示例提示只使用文档保留网段。物理机实际连接信息在交付完成后生成；页面不会生成地址、密码或密钥。

端口规则使用公共 `Table`、`Button`、`Modal` 和 `PromptModal` 完成新增、编辑、删除确认。协议仅提供本原型支持的 TCP/UDP；服务端口与映射端口为 1–65535 整数；允许来源需要 IPv4/CIDR；同一协议内避免明显重复端口。错误留在 Modal 内，新增弹窗关闭后焦点返回新增按钮。所有规则只存在于表单和会话草稿，不调用网络接口。

## 配置摘要、确认和演示提交

右侧摘要通过纯函数从商城商品和当前表单状态实时派生，并按“商品摘要/配置摘要”分组。商品名称、站点、CPU、内存、GPU 和数量使用两列紧凑布局；配置区展示名称、系统盘、数据盘、可选镜像、单行网络摘要、用途及物理机交付边界。未完成状态只统计真正阻塞提交的必填项。摘要不显示价格、折扣、支付或审批状态，也不使用固定高度、最大高度或内部滚动。

“确认配置”会执行全表校验、更新 ARIA 错误关联并定位第一个错误字段。校验通过后公共 `Modal` 展示完整摘要；“提交配置”进入短暂 Loading 并禁用重复操作。`submitConfiguration` 只等待前端定时器并返回 `APP-CLOUD-001` 或 `APP-PHYSICAL-001`，没有 HTTP 调用。成功页以“配置已提交”“等待资源准备/交付”表达前端状态，并提供返回商城、返回修改和展开摘要。

## 草稿与离开提醒

字段修改后配置标记为未确认，并以版本化 `sessionStorage` 草稿同步保存。草稿 key 按商品 ID 隔离，只包含本页非敏感配置；刷新相同商品 URL 时可恢复。版本、商品 ID 或类型不兼容时安全丢弃。页面提供“清除当前演示草稿”。

有修改时点击返回商城或更换规格会打开离开确认；取消后表单保持不变，确认后返回。浏览器刷新/关闭也注册标准 `beforeunload` 提醒。草稿不进入商城商品、订单或资源数据。

## 商城上下文恢复

进入购买页前，商城在版本化 `sessionStorage` 中保存：资源类型、搜索、站点、计算类型、GPU 型号、GPU 数量、可配置筛选、当前页和 AppShell 主滚动区 `scrollTop`。购买页返回时只把资源类型放回 URL，并通过一次性 Router state 请求恢复其余上下文；结果加载成功后恢复滚动并清理 Router state，避免重复滚动。商城运行时以 URL 的 `type` 为资源类型唯一事实来源，Tab 只在值变化时更新 URL；商品查询使用 AbortController 与请求序号共同忽略过期响应，保证快速切换时最后一次选择获胜。

直接刷新购买页仍能由 URL 商品 ID 恢复商品；直接刷新商城只能由 `?type=cloud|physical` 恢复资源类型，其他上下文安全回退默认值。当前演示目录每类不超过一页，但页码仍随导航上下文保存，Repository 单元测试覆盖非第一页值。

## 演示状态入口

```text
/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east
/marketplace/cloud-server/purchase?product=catalog-cloud-gpu-g1-east
/marketplace/physical-machine/purchase?product=catalog-physical-cpu-p1-east
/marketplace/cloud-server/purchase?product=missing-demo-product
/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c16-west
/marketplace/physical-machine/purchase?product=catalog-cloud-cpu-c8-east
/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east&viewState=loading
/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east&viewState=error
```

这些地址只用于开发验收，不进入正式菜单。

## 暂定假设与未实现规则

| 项目 | 当前原型处理 | 边界 |
|---|---|---|
| 系统盘 | 云服务器只读 30 GB | 调整范围待 `OQ-020` 关闭 |
| 数据存储 | HostPath/NFS 演示配置 | 不建立真实存储、持久性或容量规则 |
| 镜像 | 可选的集中演示列表和计算类型兼容过滤；空值为 `null` | 不拉取、不上传、不声明默认操作系统或授权 |
| 物理机交付 | 支付成功后部署和基础初始化，可用后在“我的资源”提供连接与交付信息 | 当前原型不执行支付、部署、IP 分配、密钥写入或 BMC 登录；`OQ-015` 仅保留 OS/镜像/重装规则 |
| 网络 | SSH、来源、端口规则的原型意向 | 不建立安全策略或网络资源 |
| 数量 | 正整数 | 不定义正式上限、库存或配额 |
| 提交 | 短暂前端异步与 DEMO 编号 | 不创建订单、资源、审批或支付流程 |

## 下一阶段接入方式

后续业务模块不能把当前 `APP-*` 申请编号或 `sessionStorage` 草稿当作订单/资源主键。若已确认接口到位，应在 `purchaseRepository` 边界替换数据读取和提交，并为正式请求/响应建立独立类型；确认后的配置可作为建立购买快照模型的输入参考，但仍需确认支付实现、审批、库存、操作系统选择/重装和资源生命周期。当前成功状态不得写入“我的资源”。
