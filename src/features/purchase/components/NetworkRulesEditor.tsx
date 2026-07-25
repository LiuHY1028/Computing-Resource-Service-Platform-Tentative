import { useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  DataTable,
  EmptyTable,
  FormField,
  Input,
  Modal,
  PromptModal,
  Select,
  TextButton,
  Textarea,
  type TableColumn,
} from '../../../components/ui';
import { isDuplicatePortRule, isValidIpOrCidr, isValidPort } from '../validation/purchaseValidation';
import type { NetworkConfiguration, NetworkProtocol, PortRule } from '../types';

type Template = 'ssh' | 'rdp' | 'http' | 'https' | 'custom';
type RuleDraft = {
  template: Template;
  ruleName: string;
  protocol: NetworkProtocol;
  port: string;
  sourceType: 'ip' | 'cidr' | 'all';
  sourceValue: string;
  description: string;
};

const EMPTY_DRAFT: RuleDraft = {
  template: 'http',
  ruleName: 'HTTP 服务',
  protocol: 'TCP',
  port: '80',
  sourceType: 'cidr',
  sourceValue: '10.0.0.0/8',
  description: '',
};
const TEMPLATES = [
  { id: 'ssh' as const, label: 'SSH', port: 22 },
  { id: 'rdp' as const, label: 'RDP', port: 3389 },
  { id: 'http' as const, label: 'HTTP', port: 80 },
  { id: 'https' as const, label: 'HTTPS', port: 443 },
  { id: 'custom' as const, label: '自定义' },
];

export function NetworkRulesEditor({
  idPrefix,
  value,
  onChange,
  sourceError,
  intentOnly = false,
}: Readonly<{
  idPrefix: 'cloud' | 'physical';
  value: NetworkConfiguration;
  onChange: (value: NetworkConfiguration) => void;
  sourceError?: string;
  intentOnly?: boolean;
}>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<PortRule>();
  const columns = useMemo<readonly TableColumn<PortRule>[]>(() => [
    { key: 'name', title: '规则名称', render: (rule) => rule.ruleName },
    { key: 'protocol', title: '协议', render: (rule) => rule.protocol },
    { key: 'port', title: '访问端口', render: (rule) => rule.port },
    { key: 'source', title: '允许来源', render: (rule) => rule.sourceType === 'all' ? '全部来源' : rule.sourceValue },
    { key: 'description', title: '说明', multiline: true, render: (rule) => rule.description || '—' },
  ], []);

  function setTemplate(template: Template) {
    const item = TEMPLATES.find((candidate) => candidate.id === template)!;
    setDraft((current) => ({
      ...current,
      template,
      ruleName: template === 'custom' ? current.ruleName : `${item.label} ${template === 'http' || template === 'https' ? '服务' : '远程访问'}`,
      protocol: 'TCP',
      port: item.port ? String(item.port) : '',
    }));
  }
  function openCreate() {
    setEditingId(undefined);
    setDraft(EMPTY_DRAFT);
    setDraftError('');
    setModalOpen(true);
  }
  function openEdit(rule: PortRule) {
    setEditingId(rule.id);
    setDraft({
      template: TEMPLATES.find((item) => item.port === rule.port)?.id ?? 'custom',
      ruleName: rule.ruleName,
      protocol: rule.protocol,
      port: String(rule.port),
      sourceType: rule.sourceType,
      sourceValue: rule.sourceValue,
      description: rule.description,
    });
    setDraftError('');
    setModalOpen(true);
  }
  function commitRule() {
    const port = Number(draft.port);
    const sourceValue = draft.sourceType === 'all' ? '0.0.0.0/0' : draft.sourceValue.trim();
    if (!draft.ruleName.trim()) return setDraftError('请输入规则名称。');
    if (!isValidPort(port)) return setDraftError('访问端口必须是 1 至 65535 的整数。');
    if (!isValidIpOrCidr(sourceValue)) return setDraftError('请输入有效的 IPv4 地址或 CIDR。');
    if (isDuplicatePortRule({ protocol: draft.protocol, port, sourceValue }, value.portRules, editingId)) {
      return setDraftError('已存在相同协议、端口和来源的规则。');
    }
    const nextRule: PortRule = {
      id: editingId ?? `port-rule-${Date.now()}`,
      ruleName: draft.ruleName.trim(),
      protocol: draft.protocol,
      port,
      sourceType: draft.sourceType,
      sourceValue,
      description: draft.description.trim(),
    };
    onChange({
      ...value,
      portRules: editingId
        ? value.portRules.map((rule) => rule.id === editingId ? nextRule : rule)
        : [...value.portRules, nextRule],
    });
    setModalOpen(false);
  }

  return (
    <div className="purchase-network-editor">
      <div className="purchase-network-editor__intent">
        <Checkbox
          id={`${idPrefix}-ssh-enabled`}
          checked={value.sshEnabled}
          onCheckedChange={(sshEnabled) => onChange({ ...value, sshEnabled, sourceCidr: sshEnabled ? value.sourceCidr : '' })}
        >
          {intentOnly ? '记录 SSH 访问意向' : '启用 SSH 访问'}
        </Checkbox>
        <p>{intentOnly ? '实际连接信息在资源交付后提供。' : '连接信息将在资源就绪后提供。'}</p>
      </div>
      {value.sshEnabled && (
        <FormField id={`${idPrefix}-source-cidr`} label="SSH 允许来源" required help="支持 IPv4 地址或 CIDR。" error={sourceError}>
          <Input value={value.sourceCidr} placeholder="192.0.2.0/24" onChange={(event) => onChange({ ...value, sourceCidr: event.target.value })} />
        </FormField>
      )}
      <div className="purchase-network-editor__rules-heading">
        <div><strong>其他访问规则</strong><span>使用常用模板或配置一个自定义端口。</span></div>
        <Button variant="secondary" onClick={openCreate}>新增访问规则</Button>
      </div>
      <DataTable title="访问规则" embedded density="compact" enableDensity={false} enableColumnSettings={false} aria-label="访问规则" columns={columns} rows={value.portRules} getRowKey={(rule) => rule.id} empty={<EmptyTable title="暂无其他访问规则" />} renderRowActions={(rule) => <div className="purchase-table-actions"><TextButton onClick={() => openEdit(rule)}>编辑</TextButton><TextButton onClick={() => setDeleteCandidate(rule)}>删除</TextButton></div>} />
      <Modal open={modalOpen} title={editingId ? '编辑访问规则' : '新增访问规则'} onClose={() => setModalOpen(false)} primaryAction={{ label: editingId ? '保存修改' : '添加规则', onClick: commitRule }} secondaryAction={{ label: '取消', onClick: () => setModalOpen(false) }}>
        <div className="purchase-rule-form">
          <div className="network-template-grid" role="group" aria-label="常用模板">
            {TEMPLATES.map((template) => <button type="button" key={template.id} aria-pressed={draft.template === template.id} data-selected={draft.template === template.id} onClick={() => setTemplate(template.id)}><strong>{template.label}</strong><span>{template.port ? `TCP ${template.port}` : '自定义'}</span></button>)}
          </div>
          <FormField label="规则名称" required><Input value={draft.ruleName} onChange={(event) => setDraft({ ...draft, ruleName: event.target.value })} /></FormField>
          {draft.template === 'custom' && <div className="purchase-rule-form__ports"><FormField label="协议" required><Select value={draft.protocol} options={[{ value: 'TCP', label: 'TCP' }, { value: 'UDP', label: 'UDP' }]} onValueChange={(protocol) => setDraft({ ...draft, protocol: protocol as NetworkProtocol })} /></FormField><FormField label="访问端口" required><Input inputMode="numeric" value={draft.port} onChange={(event) => setDraft({ ...draft, port: event.target.value })} /></FormField></div>}
          <FormField label="允许来源" required><Select value={draft.sourceType} onValueChange={(sourceType) => setDraft({ ...draft, sourceType: sourceType as RuleDraft['sourceType'], sourceValue: sourceType === 'all' ? '0.0.0.0/0' : '' })} options={[{ value: 'ip', label: '指定 IP' }, { value: 'cidr', label: '指定 CIDR' }, { value: 'all', label: '全部来源' }]} /></FormField>
          {draft.sourceType !== 'all' && <FormField label={draft.sourceType === 'ip' ? 'IP 地址' : 'CIDR'}><Input value={draft.sourceValue} onChange={(event) => setDraft({ ...draft, sourceValue: event.target.value })} /></FormField>}
          {draft.sourceType === 'all' && <p className="network-risk-warning">全部来源会扩大资源暴露范围，请确认服务已配置访问认证。</p>}
          <FormField label="说明"><Textarea maxLength={80} showCount value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></FormField>
          {draftError && <p className="purchase-rule-form__feedback" role="alert">{draftError}</p>}
        </div>
      </Modal>
      <PromptModal open={Boolean(deleteCandidate)} title="删除访问规则" description={deleteCandidate ? `将移除 ${deleteCandidate.protocol} ${deleteCandidate.port}。` : ''} variant="warning" confirmLabel="确认删除" cancelLabel="保留规则" onClose={() => setDeleteCandidate(undefined)} onConfirm={() => { if (deleteCandidate) onChange({ ...value, portRules: value.portRules.filter((rule) => rule.id !== deleteCandidate.id) }); setDeleteCandidate(undefined); }} />
    </div>
  );
}
