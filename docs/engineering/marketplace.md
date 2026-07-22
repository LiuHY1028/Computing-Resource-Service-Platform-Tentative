# 资源商城

## 范围与当前结果

Task 05A 将 `MKT-01` 的 `/marketplace` 从统一模块占位页替换为正式资源商城。页面用于发现、比较和筛选云服务器、物理机，并进入对应购买配置路由；页面说明购买后获得独占机器资源，但商城不承载订单提交、资源开通或购后管理。

本阶段同时把 `BUY-01`、`BUY-02` 接成购买入口占位页。占位页只回显从商城选择的演示规格、说明 Task 05B 的接管范围并提供返回商城操作，不构成购买表单或虚假交易流程。

## 需求与视觉依据

业务依据：

- `REQ-002/003/005/007/013/016/020`：商品只有云服务器和物理机；云服务器可为 CPU 或 GPU 计算；商城与购后管理分离；体现站点和物理机卡型/卡数；不混入 AI 开发平台流程；不出现“按需”选项。
- `REQ-022/023`：`30 GB` 是暂定的系统盘存储容量，不是内存；当前只在云服务器卡片以“默认系统盘”展示。
- `DEC-003/004/005/006/007/011/019/024/031/032/039/042`：保持两类资源、GPU 规格、站点、系统盘、产品边界与待确认规则的统一口径。
- `INF-001/002`：目录具备 Loading、Empty、No Result、Error/Retry 和 Disabled 反馈；不可配置商品给出可见原因。
- `MKT-01` 页面清单、`FLOW-CLOUD-BUY`/`FLOW-PHYSICAL-BUY` 的商城入口，以及实施计划第 5 阶段“资源商城”。
- 原始会议转写中关于两类机器商品、卡型/卡数、商城与资源管理分离的结论；会后补充中关于系统盘和数据盘的修正。

视觉依据为 `docs/source/03-ui-design-spec.pdf.pdf`：

| 页码 | 本页使用方式 |
|---:|---|
| p.2 | 通过现有语义 Design Token 使用主色、中性色、成功、警告与错误色 |
| p.3 | 继承全局 `MiSans VF` 字体、字号、行高和字重 |
| p.6 | 复用 AppShell 主内容关系，不重建应用框架 |
| p.7 | 复用 PageTitleBar 及正文内容间距 |
| p.8 | 复用 Container 表达说明区、筛选区、卡片和状态区 |
| p.9 | 复用 Button 与 FilterTag |
| p.10 | 复用 SearchInput |
| p.12 | 复用 Select 与 MultiSelect；浮层继续使用公共 Portal 行为 |
| p.14 | 使用 TitleBarTabs 切换云服务器和物理机 |
| p.15 | 不可配置按钮复用 Tooltip 解释原因 |
| p.16 | 筛选区和商品区使用公共 24 栏 Grid；1920 视口商品卡为 6 栏四列，1366 视口为 8 栏三列 |

资源卡和页面状态是 PDF 未直接提供、但由已确认业务与验收状态要求产生的业务组合；它们已登记在 `docs/analysis/08-page-component-mapping.md`，没有扩展为新的全局组件体系。

本页视觉重构另参考公开权益中心页面和用户提供的 `docs/reference-local/aliyun-benefit-reference.png`，只抽象浅色页面气氛、分区节奏、四列密度、参数层级和彩色操作带。该参考不改变产品需求优先级，也没有带入品牌、Logo、图片、商品文案、价格、优惠或公共云业务规则。详细取舍见 `docs/engineering/marketplace-visual-redesign.md`。

## 页面结构

`MarketplacePage` 在现有 AppShell 和 PageTitleBar 正文内依次组合：

1. 低饱和蓝白导视区、核心定位与醒目的“演示数据”声明；
2. 居中呈现的云服务器/物理机 `TitleBarTabs`；
3. `MarketplaceFilters` 浅色紧凑搜索和筛选面板；
4. 当前筛选条件标签与无障碍即时反馈；
5. 类型化商品区标题、结果数量、商品网格和分页；
6. Loading、Error、Empty 或 No Result 状态反馈。

页面最大宽度、间距、圆角、控件和功能状态色继续消费现有 Token。新增蓝、青、紫及其浅色表面只集中声明为 `.marketplace-page` 页面级装饰 Token，不修改全局语义色。页面没有大型 Hero、营销 Banner、来源品牌、宣传插画、趋势图或购后管理操作。

## 业务组件与文件职责

| 文件/组件 | 职责 |
|---|---|
| `src/pages/MarketplacePage.tsx` | 解析查询参数，维护筛选、页码、重试和反馈状态，调用数据访问层并协调路由 |
| `src/features/marketplace/components/MarketplaceFilters.tsx` | 组合搜索、站点、计算类型、配置状态及条件式 GPU 筛选；回显/移除条件并重置 |
| `src/features/marketplace/components/MarketplaceResults.tsx` | 展示结果数量、四列/三列响应式商品 Grid、分页，并编排 Loading/Error/Empty/No Result 状态 |
| `MarketplaceStatePanel` | `MarketplaceResults` 内部的商城状态组合；提供正确的 `status`/`alert` 语义和上下文操作，不定义后台状态机 |
| `src/features/marketplace/components/ResourceProductCard.tsx` | 展示两类资源的可比较规格、可配置性和购买配置入口 |
| `src/features/marketplace/types.ts` | 商城商品联合类型、筛选查询、结果和数据访问选项 |
| `src/features/marketplace/data/marketplaceProducts.ts` | 集中维护确定性的本地演示目录和暂定 30 GB 云服务器系统盘常量 |
| `src/features/marketplace/services/marketplaceRepository.ts` | 提供列表查询、单商品读取、筛选选项派生、模拟延迟/错误/空目录和请求取消边界 |
| `src/features/marketplace/index.ts` | 商城 Feature 的统一公共入口 |
| `src/pages/PurchasePlaceholderPage.tsx` | 校验路由与所选商品类型，回显演示规格并返回对应商城标签；等待 Task 05B 替换 |

业务组件只位于 `src/features/marketplace/`，没有放入 `src/components/ui/`。页面和业务组件对公共 UI 的引用均从 `src/components/ui/index.ts` 进入。

## 数据模型与演示数据

`MarketplaceProduct` 是以 `resourceType` 区分的联合类型：

- 公共字段：`id`、`name`、`site`、`computeType`、`cpu`、`memoryGb`、可选 `accelerator`、`configurable`、可选 `unavailableReason` 和固定的 `isDemo: true`；
- 云服务器：必须具有 `defaultSystemDiskGb`；
- 物理机：必须具有 `machineSummary`，且不能继承云服务器系统盘字段；
- 加速卡：用 `model` 与 `count` 表达，仅在商品确有加速卡时展示。

当前目录包含 6 个云服务器和 4 个物理机规格，使用“示例站点 A/B”“示例加速卡 A/B”等中性命名。云服务器覆盖 CPU 计算、GPU 计算和 1/2 张加速卡示例；物理机覆盖 CPU 整机与 4/8 张加速卡整机示例。所有数据均明确为原型演示数据，不代表真实库存、可用容量或正式商品清单。

目录不包含价格、计费周期、支付、审批、订单状态、资源生命周期、正式库存数量或库存扣减规则。`configurable` 只驱动本页的演示可操作性，不是已确认的库存/上架状态模型。

### 数据访问边界

- `queryMarketplaceProducts(query, options)`：读取本地目录，按资源类型和组合条件过滤，分别返回筛选后数量与该类型目录总数；支持可取消的演示延迟。
- `getMarketplaceFilterOptions(resourceType)`：从当前类型的目录数据派生站点、计算类型、加速卡型号与数量；GPU 选项不在页面散落硬编码。
- `getMarketplaceProductById(id)`：为购买入口按 ID 读取同一份演示规格，避免商城与入口回显不一致。
- `simulateError`、`simulateEmpty` 和 `delayMs` 仅服务本地开发验收，没有建立 HTTP 接口或复杂 Repository 框架。

## 类型切换、筛选与查询参数

### 类型切换

- 默认类型为云服务器。
- `?type=cloud` 与 `?type=physical` 保留当前资源类型；直接刷新可恢复标签，缺失或非法值安全回退到云服务器。
- 切换使用 React Router 更新查询参数，不刷新整个应用，结果数量和筛选选项同步变化。
- 搜索、计算类型和配置状态等仍适用的条件会保留；站点、加速卡型号/数量会按目标目录重新校验并移除无效值。
- 当计算类型不再是 GPU 时，型号和数量条件立即清空，控件也不再渲染。
- Tabs 使用公共手动激活键盘模型：方向键移动焦点，Enter/Space 激活。

### 支持条件

| 条件 | 行为 |
|---|---|
| 搜索 | 匹配规格名称、站点、CPU、内存、计算类型、加速卡型号/数量和云服务器系统盘文本 |
| 站点 | MultiSelect；选项从当前资源目录派生 |
| 计算类型 | 全部、CPU 计算、GPU 计算 |
| GPU/加速卡型号 | 仅在 GPU 计算时显示；来自当前目录；没有“无卡”选项 |
| GPU/加速卡数量 | 仅在 GPU 计算时显示；来自当前目录并按数值排序 |
| 配置状态 | 全部、可继续配置、暂不可配置；只是原型界面筛选 |

不同维度按 AND 组合，同一 MultiSelect 维度按所选集合匹配。输入、选择或移除 `FilterTag` 后从第一页重新计算结果；成功数据每页最多展示 6 项。当前条件在筛选区下方回显，可单独移除。

视觉布局仍使用公共 24 栏 Grid：默认行中搜索占 8 栏、站点 6 栏、计算类型 5 栏、配置状态 5 栏；GPU 型号占 8 栏、数量占 6 栏并只在适用时进入下一行。这里只调整展示跨度，没有改变筛选数据或公共 Grid API。

“重置全部”只在存在活动条件时显示。重置后回到云服务器、空搜索、全部站点、全部计算类型、全部配置状态，并提供 `aria-live` 反馈；操作不刷新页面。开发状态参数会保留，避免验收状态被重置动作意外关闭。

筛选值目前保存在页面会话状态，只有资源类型和开发验收状态进入 URL；Task 05A 不承诺完整筛选深链或跨会话持久化。

## 商品卡

云服务器卡片展示名称、站点、CPU/GPU 计算类型、CPU 规格、内存、适用时的加速卡型号/数量、默认系统盘和配置状态。`30 GB` 始终以“默认系统盘”存储容量表达，不作为内存。

物理机卡片展示名称、站点、CPU/GPU 计算类型、整机 CPU 信息、内存、适用时的加速卡型号/数量、整机摘要和配置状态；不擅自增加镜像、操作系统、系统盘、重装系统或电源规则。

CPU 计算商品没有虚假的 GPU 字段。不可配置商品仍参与比较，同时显示“暂不可配置”、可见原因、禁用的“立即配置”按钮和补充 Tooltip；状态不只依赖颜色，禁用原因通过 `aria-describedby` 与文字关联。

视觉重构后的业务卡采用“资源类型与状态 → 规格名称 → 核心指标 → 补充信息 → 浅色操作带”的五层顺序，视觉上由彩色浅底头部、白色主体和极浅类别色操作带三个表面组成。云服务器 CPU/GPU 均保持四个核心槽位；物理机 GPU 将卡数提升到核心 2 × 2 指标区，物理机 CPU 让长 CPU 信息占满一行。站点和整机摘要保持补充信息，长 CPU、GPU 型号和整机摘要可键盘聚焦并通过 Tooltip 读取完整内容。卡片没有固定高度或额外 `min-height`，同一行对齐由一致内容槽位与 Grid 自然拉伸完成，不用弹性空白把按钮推到底部。

1920 宽度下每卡占公共 24 栏中的 6 栏，共四列；在页面局部的 `1599px` 最大宽度媒体条件下切换为 8 栏三列，以覆盖 1366 视口。该条件只改变商城结果项的栅格跨度，没有新增全局断点体系或公共 Grid API。

## 页面状态与开发验收参数

| 状态 | 触发与表现 | 可用操作 |
|---|---|---|
| Normal | 默认本地查询成功，展示结果数量、卡片和适用时的分页 | 搜索、筛选、切换类型、进入配置 |
| Loading | 首次查询的短暂加载态；正常筛选使用零延迟本地读取以减少布局跳动；`?demoState=loading` 可固定展示 | 筛选区和当前上下文保持可见 |
| Error | `?demoState=error` 的首次读取失败，显示明确错误 | “重新加载”产生真实重试；同一页面重试后成功 |
| Empty | `?demoState=empty` 返回当前类型目录总数为 0 | “查看另一类资源”同时退出开发空目录参数，展示另一类正常演示数据 |
| No Result | 目录本身有数据，但搜索/筛选后的结果数为 0 | 有搜索词时清除搜索；始终可重置筛选 |
| Disabled | 商品 `configurable` 为 false | 卡片仍显示；按钮禁用；附近文案和 Tooltip 解释原因 |

`demoState=loading|error|empty` 只用于开发验收，不出现在正式菜单、筛选控件或业务数据模型。缺失、`normal` 或非法值均按正常商城处理。默认 `/marketplace` 始终展示正常目录。

这些状态是页面反馈，不是正式后端错误码、库存状态、资源状态或订单状态机。

## 购买入口

可配置云服务器的“立即配置”进入：

```text
/marketplace/cloud-server/purchase?product=<演示商品 ID>
```

可配置物理机的“立即配置”进入：

```text
/marketplace/physical-machine/purchase?product=<演示商品 ID>
```

入口通过同一数据访问边界按 ID 回显所选规格，并校验商品类型与目标路由一致。购买占位页标题明确说明配置将在 Task 05B 实现，可返回 `/marketplace?type=cloud` 或 `/marketplace?type=physical`。不可配置商品不会触发路由。

Task 05A 不创建订单、不提交购买请求、不改变演示数据，也不执行资源开通。

## 公共组件复用

| 公共能力 | 商城用途 |
|---|---|
| AppShell、PageTitleBar | 保持正式框架、菜单选中和页面标题 |
| Container | 页面说明、Tabs 外壳、筛选、商品卡和页面状态 |
| TitleBarTabs | 云服务器/物理机切换及键盘语义 |
| SearchInput | 名称与规格搜索、清空和 Enter 反馈 |
| Select、MultiSelect | 计算类型、配置状态、站点、加速卡型号/数量 |
| FilterTag | 当前条件回显与单项移除 |
| Button | 重置、重试、空状态操作和配置入口 |
| Tooltip | 不可配置原因、长 CPU/GPU 型号和整机摘要的完整说明 |
| Grid、GridItem | 24 栏筛选布局；1920 使用 6 栏商品卡，1366 使用 8 栏商品卡 |
| Pagination | 超过 6 项时的结果控制 |

商城没有复制这些组件，也没有引入第三方 UI/图标库。业务 CSS 继续使用现有 Design Token，并只在 `.marketplace-page` 集中维护六个商城装饰色 Token；卡片 Hover 的 2 px 上移、轻量阴影和过渡在 `prefers-reduced-motion` 下关闭，键盘 `:focus-within` 和长字段 `:focus-visible` 使用公共焦点语义并保持同等可识别性。

## 暂定假设与可替换点

| 项目 | 当前临时方案 | 对应问题 |
|---|---|---|
| 产品身份 | 继续使用配置化工作名称和中性标识 | `OQ-050` |
| 两类资源关系 | 单一商城内使用云服务器/物理机 Tabs，并以 `type` 参数保留类型 | `OQ-058` |
| 云服务器系统盘 | 卡片只读展示暂定 `30 GB`；物理机不套用该字段 | `OQ-020` |
| 规格组织 | 采用完整规格卡，不提供 CPU/内存/GPU 任意组合器 | `OQ-021` |
| 筛选集合 | 使用搜索、站点、计算类型、GPU 型号/数量和配置状态的最小演示集合 | `OQ-022` |
| 站点 | 单层“示例站点 A/B”，不宣称真实站点或地域层级 | `OQ-023` |
| 价格 | 完全隐藏价格、周期、支付及结算 | `OQ-010`、`OQ-055` |
| 物理机卡数 | 4/8 张只是演示规格，不构成完整枚举 | `OQ-056` |
| 可配置性 | 仅为原型可操作性和 Disabled 状态样例 | 正式库存、上下架与资源状态待确认 |
| 页面容量 | 本地延迟与每页 6 项是验收用工程参数 | 不构成 API、库存或正式分页协议 |

## 未实现内容

- 完整云服务器或物理机购买表单、配置摘要、确认、提交和结果流程；
- 订单创建、支付、审批、配额、正式价格/计费周期、库存锁定或扣减；
- 资源真实交付、开通、生命周期和购后管理；
- 商品独立详情路由；
- 数据盘、HostPath、NFS、镜像、网络、软件或挂载配置；
- 远程请求、后端 API、MSW 或生产数据源；
- 正式商品上下架、库存、错误码和状态枚举。

商城商品卡只负责比较和进入配置，因此不包含开机、关机、监控、连接、存储挂载或软件安装操作。

## Task 05B 接管项

Task 05B 需要用正式购买配置页面替换两个占位页，并继续复用商城的商品 ID、联合类型与数据访问边界，保证规格和站点跨页一致。后续至少需要处理：

- 云服务器的站点、完整规格、镜像、只读暂定 30 GB 系统盘和适用的数据存储选择；
- 物理机整机规格，并保持 OS/镜像、自动开机、数据存储和交付方式待确认；
- 配置摘要、返回商城上下文、确认、提交中、成功、失败与重试；
- 不把价格、计费、支付、审批、订单/资源正式状态或库存规则补成默认业务规则；
- 根据后续已确认接口替换本地数据边界，而不是让表单直接依赖原始演示数组。

## 验收辅助

页面状态地址：

```text
/marketplace
/marketplace?type=physical
/marketplace?demoState=loading
/marketplace?demoState=error
/marketplace?demoState=empty
```

自动化覆盖位于商城 Repository、页面/路由、分页分支和工程策略测试。浏览器视口、控制台、键盘、Portal、Tooltip、字体和溢出的实际核验结果统一记录在 `docs/engineering/ui-spec-verification.md`。

根据根目录 `AGENTS.md` 的永久 `Visual review workflow`，当前及后续前端任务只做临时浏览器视觉检查，不生成、保存、提交或在最终回复展示页面评审截图；最终视觉验收由用户在本地浏览器中完成。视觉模式取舍、量化结果和 Task 05B 延续方式见 `docs/engineering/marketplace-visual-redesign.md`。
