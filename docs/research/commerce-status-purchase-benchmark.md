# 商业交易、状态与购买体验基准

| 场景 | 行业常见做法 | 当前错误 | 本项目采用方案 |
| --- | --- | --- | --- |
| 商品配置页 | 按地域、规格、镜像、存储、网络和购买周期分组；配置主区与实时摘要并行，确认后进入订单 | 将购买做成纵向后台表单，配置、交付与交易混在同一层级 | 使用领域化配置器、轻量步骤导航和 Sticky 实时报价；配置与确认订单分阶段 |
| 存储购买 | 产品类型先比较，容量、性能、数量、周期联动报价；挂载作为条件配置 | 普通输入控件机械堆叠，产品差异与价格构成不清晰 | 产品卡、性能规格卡、容量滑块与快捷值、Stepper、周期段控件、按需展开挂载 |
| 预付费与按量 | 预付费先生成待支付订单并付款，按量先开通并按账期出账 | 所有模式均写成“提交申请”，没有支付或账期差异 | 预付费：订单与待支付账单→收银台→开通；按量：订单→开通→周期账单 |
| 订单与收银台 | 确认页冻结商品和价格快照；收银台只处理待支付订单，可取消未支付订单 | 配置提交后直接生成“申请记录”，无法区分交易和履约 | 订单保存配置与价格快照；账单保存应收事实；收银台驱动支付、取消和后续履约 |
| 续费、续租、扩容、变配 | 选择目标周期或规格，确认费用，创建交易订单，支付后更新资源 | 记录内部审批型“申请”，未形成订单与账单 | 收费操作统一创建对应订单和账单，支付完成后执行资源状态迁移 |
| 免费运维操作 | 挂载、卸载、启停和规则修改通常直接确认并异步执行 | 所有操作都被包装成申请或订单 | 免费操作仅写操作记录，使用等待执行、执行中、已完成等任务状态 |
| 订单与账单 | 订单描述购买及履约，账单描述应收、支付、退款与账期；两者关联但不混用 | 一个对象同时承载业务、支付和处理状态 | `CommerceOrder` 与 `Bill` 分离，金额均来自不可变价格快照 |
| 交易状态 | 当前阶段使用一个主状态；支付和开通阶段进入同一有序状态机 | 订单同时平铺订单状态、支付状态和处理状态 | 订单仅显示待支付、支付中、已支付、开通中、已完成等一个主状态；历史放入时间线 |
| 资源状态 | 生命周期状态是主状态，健康与告警独立呈现 | “运行中”和“正常”两个徽标并列 | 资源只显示一个生命周期主状态；健康、到期和容量风险改为字段、提示或指标 |
| 支付成功后的履约 | 支付完成与资源创建分阶段，用户可查看订单和资源开通进度 | “申请已受理”后缺少交易结果与资源一致性 | 账单先变为已支付，订单经已支付→开通中→已完成，再创建或更新资源并写操作记录 |

## 官方资料

- 阿里云：[ECS 自定义购买](https://help.aliyun.com/zh/ecs/user-guide/create-an-instance-by-using-the-wizard)、[手动续费](https://help.aliyun.com/zh/ecs/manually-renew-an-instance-1)、[实例生命周期](https://help.aliyun.com/zh/ecs/user-guide/overview-52)、[健康状态](https://help.aliyun.com/zh/ecs/user-guide/view-the-health-status-of-an-instance)
- 腾讯云：[CVM 购买](https://cloud.tencent.com/document/product/213/506)、[CVM 续费](https://cloud.tencent.com/document/product/213/6143)、[CVM 计费](https://cloud.tencent.com/document/product/213/2180)、[CBS 指南](https://cloud.tencent.com/document/product/362/2356)
- 百度智能云：[BCC 续费](https://cloud.baidu.com/doc/BCC/s/tjwvynkui)、[BCC 计费](https://cloud.baidu.com/doc/BCC/s/lkb7dburb)、[CDS 产品功能](https://cloud.baidu.com/doc/CDS/s/vketf9y3k)
- 华为云：[ECS 自定义购买](https://support.huaweicloud.com/intl/zh-cn/usermanual-ecs/ecs_03_7002.html)、[EVS 购买](https://support.huaweicloud.com/usermanual-evs/zh-cn_topic_0021738346.html)、[支付订单](https://support.huaweicloud.com/usermanual-billing/zh-cn_topic_0031512547.html)、[订单详情](https://support.huaweicloud.com/usermanual-billing/order_topic_9000001.html)
- 成熟 SaaS：[Stripe Invoice 生命周期](https://docs.stripe.com/invoicing/overview)、[Checkout Session](https://docs.stripe.com/api/checkout/sessions/object)、[Vercel 账单说明](https://vercel.com/docs/pricing/understanding-my-invoice)

以上资料仅用于提炼通用交互与领域边界；本项目不复制竞品品牌、价格、界面文案或实现代码。
