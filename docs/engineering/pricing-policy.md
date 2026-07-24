# 价格与计费策略

## 事实来源与金额模型

`src/features/pricing/data/priceCatalog.json` 是 SKU 价格唯一事实来源。金额以人民币“分”的非负整数保存，`calculatePrice.ts` 负责计算，`formatMoney.ts` 统一展示，业务页面不得写死或解析金额。

计算、系统盘、数据存储、镜像、软件和网络使用统一费用明细；30 GB 系统盘以“已包含”明示且金额为零。订单、已有资源和存储空间保存生成时的独立价格快照，价目调整只影响新购买、新续费、新延期和新扩容。

## 计算 SKU 价格矩阵

| SKU | 规格 | 包月/月租 | 按量 |
| --- | --- | ---: | ---: |
| `catalog-cloud-cpu-c8-east` | 通用计算 C8 | ¥680/月 | ¥1.10/小时 |
| `catalog-cloud-cpu-c16-west` | 通用计算 C16 | ¥1,180/月 | ¥1.90/小时 |
| `catalog-cloud-gpu-g1-east` | 加速计算 G1 | ¥6,800/月 | ¥11.20/小时 |
| `catalog-cloud-gpu-g2-west` | 加速计算 G2 | ¥12,800/月 | ¥21.00/小时 |
| `catalog-cloud-gpu-g3-east` | 加速计算 G3 | ¥9,200/月 | ¥15.20/小时 |
| `catalog-cloud-gpu-g4-west` | 加速计算 G4 | ¥17,600/月 | ¥28.90/小时 |
| `catalog-physical-cpu-p1-east` | 整机通用计算 P1 | ¥12,800/月 | 不适用 |
| `catalog-physical-gpu-p4-east` | 整机加速计算 P4 | ¥42,800/月 | 不适用 |
| `catalog-physical-gpu-p4-west` | 整机加速计算 P4-B | ¥45,600/月 | 不适用 |
| `catalog-physical-gpu-p8-west` | 整机加速计算 P8 | ¥86,800/月 | 不适用 |

云服务器包月支持 1、3、6、12 个月和自动续费偏好；按量只展示小时单价，不提供续费或自动续费。物理机只按月租用并通过延期延长使用期限。

## 存储、镜像与软件

| SKU/对象 | 价格策略 |
| --- | --- |
| `storage-shared-standard-gb-month` | ¥0.80/GB/月 |
| `storage-shared-performance-gb-month` | ¥1.20/GB/月 |
| `storage-cloud-standard-gb-month` | ¥0.35/GB/月 |
| `storage-cloud-performance-gb-month` | ¥0.75/GB/月 |
| 基础 Linux 运行镜像 | 免费 |
| GPU 计算运行镜像、平台基础环境镜像 | 包含在资源费用中 |
| 开发工具链镜像 | ¥180/月 |
| 团队和新建自定义镜像 | 免费 |
| 当前软件目录 | 包含在资源费用中 |

网络领域没有已确认计费维度，不生成收费项。商业软件在正式授权价确定前只允许“需授权”，不生成许可证金额。

## 报价与快照

云硬盘和高性能共享存储均按“性能等级 × GB × 月数”计价。物理机本地存储属于整机自身配置，不在独立存储价格目录中。`PriceQuote` 包含计费模式、数量、周期、费用明细、小计和总额；总额等于非包含项明细之和。`PriceSnapshot` 额外保存 SKU、单价与生成时间。购买、续费、延期和扩容在提交时生成快照，历史订单只读快照。

验证命令：

```bash
npm run verify:pricing
npm run verify:relations
npm run verify:storage
```

## 尚待正式确认

税费、折扣、按量最小结算单位、月中按比例计费、取消与退款、支付和发票、网络计费、商业软件授权价格及价格调整生效机制仍未确认。
