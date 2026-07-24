import { useCallback, useMemo, useRef, useState } from 'react';
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

type RuleDraft = {
  protocol: NetworkProtocol;
  servicePort: string;
  mappedPort: string;
  source: string;
  description: string;
};

const EMPTY_DRAFT: RuleDraft = {
  protocol: 'TCP',
  servicePort: '',
  mappedPort: '',
  source: '',
  description: '',
};

type NetworkRulesEditorProps = Readonly<{
  idPrefix: 'cloud' | 'physical';
  value: NetworkConfiguration;
  onChange: (value: NetworkConfiguration) => void;
  sourceError?: string;
  intentOnly?: boolean;
}>;

export function NetworkRulesEditor({
  idPrefix,
  value,
  onChange,
  sourceError,
  intentOnly = false,
}: NetworkRulesEditorProps) {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<RuleDraft>(EMPTY_DRAFT);
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [deleteCandidate, setDeleteCandidate] = useState<PortRule>();
  const closeRuleModal = useCallback(() => setModalOpen(false), []);

  const columns = useMemo<readonly TableColumn<PortRule>[]>(() => [
    { key: 'protocol', title: '协议', render: (rule) => rule.protocol },
    { key: 'service', title: '服务端口', render: (rule) => rule.servicePort },
    { key: 'mapped', title: '映射端口', render: (rule) => rule.mappedPort },
    { key: 'source', title: '允许来源', render: (rule) => rule.source },
    { key: 'description', title: '说明', multiline: true, render: (rule) => rule.description || '—' },
  ], []);

  function openCreate() {
    setEditingId(undefined);
    setDraft(EMPTY_DRAFT);
    setDraftErrors({});
    setModalOpen(true);
  }

  function openEdit(rule: PortRule) {
    setEditingId(rule.id);
    setDraft({
      protocol: rule.protocol,
      servicePort: String(rule.servicePort),
      mappedPort: String(rule.mappedPort),
      source: rule.source,
      description: rule.description,
    });
    setDraftErrors({});
    setModalOpen(true);
  }

  function commitRule() {
    const servicePort = Number(draft.servicePort);
    const mappedPort = Number(draft.mappedPort);
    const errors: Record<string, string> = {};
    if (!isValidPort(servicePort)) errors['rule-service-port'] = '服务端口必须是 1 至 65535 的整数。';
    if (!isValidPort(mappedPort)) errors['rule-mapped-port'] = '映射端口必须是 1 至 65535 的整数。';
    if (!isValidIpOrCidr(draft.source)) errors['rule-source'] = '请输入有效的 IPv4 地址或 CIDR。';
    if (
      Object.keys(errors).length === 0 &&
      isDuplicatePortRule(
        { protocol: draft.protocol, servicePort, mappedPort },
        value.portRules,
        editingId,
      )
    ) {
      errors['rule-service-port'] = '同一协议下不能重复使用明显相同的服务端口或映射端口。';
    }
    if (Object.keys(errors).length) {
      setDraftErrors(errors);
      window.requestAnimationFrame(() => document.getElementById(Object.keys(errors)[0] ?? '')?.focus());
      return;
    }

    const nextRule: PortRule = {
      id: editingId ?? `port-rule-${Date.now()}`,
      protocol: draft.protocol,
      servicePort,
      mappedPort,
      source: draft.source.trim(),
      description: draft.description.trim(),
    };
    const portRules = editingId
      ? value.portRules.map((rule) => (rule.id === editingId ? nextRule : rule))
      : [...value.portRules, nextRule];
    onChange({ ...value, portRules });
    setModalOpen(false);
  }

  return (
    <div className="purchase-network-editor">
      <div className="purchase-network-editor__intent">
        <Checkbox
          id={`${idPrefix}-ssh-enabled`}
          checked={value.sshEnabled}
          onCheckedChange={(sshEnabled) =>
            onChange({
              ...value,
              sshEnabled,
              sourceCidr: sshEnabled ? value.sourceCidr : '',
            })
          }
        >
          {intentOnly ? '记录 SSH 访问意向' : '启用 SSH 访问'}
        </Checkbox>
        <p>
          {intentOnly
            ? '当前仅记录访问意向；实际地址和连接凭据将在交付后按最终规则生成。'
            : '连接信息将在资源就绪后生成。'}
        </p>
      </div>
      {value.sshEnabled && (
        <FormField
          id={`${idPrefix}-source-cidr`}
          label="SSH 允许来源"
          required
          help="支持 IPv4 地址或 CIDR。"
          error={sourceError}
        >
          <Input
            value={value.sourceCidr}
            placeholder="192.0.2.0/24"
            onChange={(event) => onChange({ ...value, sourceCidr: event.target.value })}
          />
        </FormField>
      )}

      <div className="purchase-network-editor__rules-heading">
        <div><strong>端口暴露与转发规则</strong><span>配置资源就绪后需要开放或转发的端口。</span></div>
        <Button ref={addButtonRef} variant="secondary" onClick={openCreate}>新增端口规则</Button>
      </div>
      <DataTable
        title="端口规则"
        embedded
        density="compact"
        enableDensity={false}
        enableColumnSettings={false}
        aria-label="端口规则"
        columns={columns}
        rows={value.portRules}
        getRowKey={(rule) => rule.id}
        empty={<EmptyTable title="暂无端口规则" description="如需开放或转发端口，可新增一条规则。" />}
        renderRowActions={(rule) => (
          <div className="purchase-table-actions">
            <TextButton onClick={() => openEdit(rule)}>编辑</TextButton>
            <TextButton onClick={() => setDeleteCandidate(rule)}>删除</TextButton>
          </div>
        )}
      />

      <Modal
        open={modalOpen}
        title={editingId ? '编辑端口规则' : '新增端口规则'}
        onClose={closeRuleModal}
        returnFocusRef={addButtonRef}
        primaryAction={{ label: editingId ? '保存修改' : '添加规则', onClick: commitRule }}
        secondaryAction={{ label: '取消', onClick: closeRuleModal }}
      >
        <div className="purchase-rule-form">
          <FormField id="rule-protocol" label="协议" required>
            <Select
              value={draft.protocol}
              options={[{ value: 'TCP', label: 'TCP' }, { value: 'UDP', label: 'UDP' }]}
              onValueChange={(protocol) => setDraft((current) => ({ ...current, protocol: protocol as NetworkProtocol }))}
            />
          </FormField>
          <div className="purchase-rule-form__ports">
            <FormField id="rule-service-port" label="服务端口" required error={draftErrors['rule-service-port']}>
              <Input inputMode="numeric" value={draft.servicePort} onChange={(event) => setDraft((current) => ({ ...current, servicePort: event.target.value }))} />
            </FormField>
            <FormField id="rule-mapped-port" label="映射端口" required error={draftErrors['rule-mapped-port']}>
              <Input inputMode="numeric" value={draft.mappedPort} onChange={(event) => setDraft((current) => ({ ...current, mappedPort: event.target.value }))} />
            </FormField>
          </div>
          <FormField id="rule-source" label="允许来源" required help="支持 IPv4 地址或 CIDR。" error={draftErrors['rule-source']}>
            <Input value={draft.source} placeholder="192.0.2.0/24" onChange={(event) => setDraft((current) => ({ ...current, source: event.target.value }))} />
          </FormField>
          <FormField id="rule-description" label="说明">
            <Textarea maxLength={80} showCount value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} />
          </FormField>
          <p className="purchase-rule-form__feedback" aria-live="polite">
            {Object.values(draftErrors)[0] ?? ''}
          </p>
        </div>
      </Modal>

      <PromptModal
        open={Boolean(deleteCandidate)}
        title="删除端口规则"
        description={deleteCandidate ? `将移除 ${deleteCandidate.protocol} ${deleteCandidate.servicePort} → ${deleteCandidate.mappedPort}。` : ''}
        variant="warning"
        confirmLabel="确认删除"
        cancelLabel="保留规则"
        onClose={() => setDeleteCandidate(undefined)}
        onConfirm={() => {
          if (deleteCandidate) {
            onChange({ ...value, portRules: value.portRules.filter((rule) => rule.id !== deleteCandidate.id) });
          }
          setDeleteCandidate(undefined);
        }}
      />
    </div>
  );
}
