import {
  Form,
  FormActions,
  FormField,
  FormSection,
  Input,
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
        description="可选择不挂载、本地数据存储或高性能共享存储。"
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
