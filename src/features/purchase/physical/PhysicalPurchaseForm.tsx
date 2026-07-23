import {
  Form,
  FormActions,
  FormField,
  FormSection,
  Input,
  Textarea,
} from '../../../components/ui';
import { NetworkRulesEditor } from '../components/NetworkRulesEditor';
import type { PhysicalPurchaseConfiguration, PurchaseFieldErrors } from '../types';

type PhysicalPurchaseFormProps = Readonly<{
  value: PhysicalPurchaseConfiguration;
  errors: PurchaseFieldErrors;
  onChange: (value: PhysicalPurchaseConfiguration) => void;
  onConfirm: () => void;
  onReturn: () => void;
}>;

export function PhysicalPurchaseForm({ value, errors, onChange, onConfirm, onReturn }: PhysicalPurchaseFormProps) {
  return (
    <Form className="purchase-form purchase-form--physical" onSubmit={onConfirm} noValidate>
      <FormSection
        id="purchase-basic-information"
        title="整机使用信息"
        description="填写整机资源名称、数量与用途说明。"
      >
        <div className="purchase-field-pair">
          <FormField id="physical-resource-name" label="资源名称" required error={errors['physical-resource-name']} help="请输入 1–48 个字符。">
            <Input maxLength={48} showCount clearable value={value.resourceName} onChange={(event) => onChange({ ...value, resourceName: event.target.value })} onClear={() => onChange({ ...value, resourceName: '' })} />
          </FormField>
          <FormField id="physical-resource-quantity" label="使用数量" required error={errors['physical-resource-quantity']} help="请输入正整数。">
            <Input inputMode="numeric" value={value.quantity} onChange={(event) => onChange({ ...value, quantity: event.target.value })} />
          </FormField>
        </div>
        <FormField id="physical-purpose" label="用途说明" help="请勿填写密码、密钥等敏感信息。">
          <Textarea maxLength={240} showCount value={value.purpose} placeholder="简要说明整机使用场景（选填）" onChange={(event) => onChange({ ...value, purpose: event.target.value })} />
        </FormField>
      </FormSection>

      <FormSection
        id="purchase-delivery"
        className="purchase-delivery-section"
        title="交付方式"
        description="说明物理机从配置确认到资源可用后的标准交付流程。"
      >
        <div className="purchase-delivery-notice">
          <span className="purchase-delivery-notice__mark" aria-hidden="true">i</span>
          <div>
            <strong>申请受理后进入资源准备和基础初始化</strong>
            <p>资源交付完成后，可在“我的资源”中查看服务器连接信息并开始使用。</p>
            <ul>
              <li>实际部署时间以资源和网络准备情况为准。</li>
              <li>操作系统及基础环境按照最终确认的交付配置执行。</li>
              <li>连接凭据将在资源交付完成后生成。</li>
            </ul>
          </div>
        </div>
        <section className="purchase-delivery-information" aria-labelledby="physical-delivery-information-title">
          <div>
            <h3 id="physical-delivery-information-title">交付信息</h3>
            <p>资源可用后，“我的资源 &gt; 物理机详情”将提供：</p>
          </div>
          <ul className="purchase-delivery-information__groups">
            <li><strong>资源与规格</strong><span>资源名称、资源 ID、资源状态、所属站点、物理机规格、操作系统、主机名</span></li>
            <li><strong>网络与连接</strong><span>内网 IP、公网 IP（按网络策略分配，无公网时明确显示）、SSH 登录用户、SSH 端口、认证方式、SSH 连接命令、子网和网关</span></li>
            <li><strong>使用周期</strong><span>开通时间、到期时间</span></li>
          </ul>
          <dl className="purchase-delivery-information__authentication">
            <div><dt>认证方式</dt><dd>SSH 密钥</dd></div>
            <div><dt>连接信息</dt><dd>资源交付完成后生成</dd></div>
          </dl>
          <p className="purchase-delivery-information__security">
            提交时从已登记的 SSH 公钥中选择，交付后写入服务器；不长期明文展示登录密码。BMC/IPMI 管理地址仅向具备权限的用户展示，不在购买页显示。
          </p>
        </section>
      </FormSection>

      <FormSection
        id="purchase-network"
        title="连接与网络意向"
        description="当前只记录交付后的访问意向；实际地址、端口和凭据在资源交付完成后生成。"
      >
        <NetworkRulesEditor
          idPrefix="physical"
          intentOnly
          value={value.network}
          sourceError={errors['physical-source-cidr']}
          onChange={(network) => onChange({ ...value, network })}
        />
      </FormSection>

      <FormActions
        className="purchase-form__actions"
        primaryAction={{ label: '确认整机配置', type: 'submit' }}
        secondaryAction={{ label: '返回资源商城', onClick: onReturn }}
      />
    </Form>
  );
}
