import {
  CardRadio,
  Checkbox,
  Form,
  FormActions,
  FormField,
  FormSection,
  Input,
  RadioGroup,
  Select,
  Textarea,
} from '../../../components/ui';
import type { MarketplaceCloudServerProduct } from '../../marketplace';
import { NetworkRulesEditor } from '../components/NetworkRulesEditor';
import type { CloudPurchaseConfiguration, PurchaseFieldErrors } from '../types';
import { CloudImageSection } from './CloudImageSection';
import { CloudStorageSection } from './CloudStorageSection';

type CloudPurchaseFormProps = Readonly<{
  product: MarketplaceCloudServerProduct;
  value: CloudPurchaseConfiguration;
  errors: PurchaseFieldErrors;
  onChange: (value: CloudPurchaseConfiguration) => void;
  onConfirm: () => void;
  onReturn: () => void;
}>;

export function CloudPurchaseForm({ product, value, errors, onChange, onConfirm, onReturn }: CloudPurchaseFormProps) {
  return (
    <Form className="purchase-form" onSubmit={onConfirm} noValidate>
      <FormSection
        id="purchase-billing"
        title="计费配置"
        description="包月按所选周期报价；按量展示当前小时单价。"
      >
        <RadioGroup
          className="purchase-choice-grid purchase-choice-grid--two"
          value={value.billingMode}
          onValueChange={(billingMode) =>
            onChange({
              ...value,
              billingMode: billingMode as CloudPurchaseConfiguration['billingMode'],
              autoRenewalEnabled:
                billingMode === 'subscription' && value.autoRenewalEnabled,
            })
          }
        >
          <CardRadio value="subscription" title="包月" description="支持 1、3、6、12 个月" />
          <CardRadio value="pay-as-you-go" title="按量" description="按小时展示预计费用，无需续费" />
        </RadioGroup>
        {value.billingMode === 'subscription' && (
          <div className="purchase-billing-fields">
            <FormField label="购买时长" required>
              <Select
                value={value.periodMonths}
                onValueChange={(periodMonths) =>
                  onChange({
                    ...value,
                    periodMonths: periodMonths as CloudPurchaseConfiguration['periodMonths'],
                  })
                }
                options={[
                  { value: '1', label: '1 个月' },
                  { value: '3', label: '3 个月' },
                  { value: '6', label: '6 个月' },
                  { value: '12', label: '12 个月' },
                ]}
              />
            </FormField>
            <Checkbox
              checked={value.autoRenewalEnabled}
              onCheckedChange={(autoRenewalEnabled) =>
                onChange({ ...value, autoRenewalEnabled })
              }
            >
              到期后按当前周期自动续费
            </Checkbox>
          </div>
        )}
        {value.billingMode === 'pay-as-you-go' && (
          <p className="purchase-inline-notice">
            按量资源不设置购买月数和自动续费，提交后按当前小时单价记录价格快照。
          </p>
        )}
      </FormSection>

      <FormSection
        id="purchase-basic-information"
        title="基础信息"
        description="填写实例的识别信息、数量与使用说明。"
      >
        <div className="purchase-field-pair">
          <FormField id="cloud-instance-name" label="实例名称" required error={errors['cloud-instance-name']} help="请输入 1–48 个字符。">
            <Input maxLength={48} showCount clearable value={value.instanceName} onChange={(event) => onChange({ ...value, instanceName: event.target.value })} onClear={() => onChange({ ...value, instanceName: '' })} />
          </FormField>
          <FormField id="cloud-instance-quantity" label="实例数量" required error={errors['cloud-instance-quantity']} help="请输入正整数。">
            <Input inputMode="numeric" value={value.quantity} onChange={(event) => onChange({ ...value, quantity: event.target.value })} />
          </FormField>
        </div>
        <FormField id="cloud-purpose" label="使用说明" help="请勿填写密码、密钥等敏感信息。">
          <Textarea maxLength={240} showCount value={value.purpose} placeholder="简要说明计划使用场景（选填）" onChange={(event) => onChange({ ...value, purpose: event.target.value })} />
        </FormField>
      </FormSection>

      <FormSection
        id="purchase-system-disk"
        title="系统盘"
        description="用于系统和运行环境，与数据盘分开配置。"
      >
        <div className="purchase-system-disk-card">
          <dl>
            <div><dt>系统盘容量</dt><dd><strong>{value.systemDiskGb} GB</strong></dd></div>
            <div><dt>配置状态</dt><dd>当前系统盘容量不可修改</dd></div>
          </dl>
          <p>该值表示存储容量，不是内存；底层可对应运行环境可用的系统存储配额。</p>
        </div>
      </FormSection>

      <FormSection
        id="purchase-data-storage"
        title="数据盘"
        description="可暂不挂载、购买新存储，或选择当前站点已有的独立存储。"
      >
        <CloudStorageSection site={product.site} value={value} errors={errors} onChange={onChange} />
      </FormSection>

      <FormSection
        id="purchase-image"
        title="镜像"
        description="镜像为可选项；如需指定，可选择与当前计算类型兼容的镜像。"
      >
        <CloudImageSection computeType={product.computeType} value={value.imageId} onChange={(imageId) => onChange({ ...value, imageId })} />
      </FormSection>

      <FormSection
        id="purchase-network"
        title="网络与访问"
        description="配置 SSH、允许来源与端口规则。"
      >
        <NetworkRulesEditor
          idPrefix="cloud"
          value={value.network}
          sourceError={errors['cloud-source-cidr']}
          onChange={(network) => onChange({ ...value, network })}
        />
      </FormSection>

      <FormActions
        className="purchase-form__actions"
        primaryAction={{ label: '确认配置', type: 'submit' }}
        secondaryAction={{ label: '返回资源商城', onClick: onReturn }}
      />
    </Form>
  );
}
