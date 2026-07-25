import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  DataTable,
  DropdownMenu,
  DropdownMenuItem,
  Form,
  FormField,
  Input,
  Modal,
  PageState,
  SearchInput,
  Select,
  StatusBadge,
  Switch,
  TextButton,
  Textarea,
  Toast,
  type TableColumn,
} from '../components/ui';
import { APP_PATHS, resourceDetailPath } from '../app/routes';
import { useConsolePageHeader } from '../app/shell/PageHeaderContext';
import {
  createNetworkRule,
  deleteNetworkRule,
  queryNetworkRules,
  setNetworkRuleEnabled,
  updateNetworkRule,
  type NetworkAccessRule,
  type NetworkRuleInput,
  type NetworkSourceType,
} from '../features/network';
import { listResources, type Resource } from '../features/resources';
import '../styles/management.css';

type TemplateId = 'ssh' | 'rdp' | 'http' | 'https' | 'custom';
const TEMPLATES: readonly Readonly<{
  id: TemplateId;
  label: string;
  protocol: 'TCP' | 'UDP';
  port?: number;
}>[] = [
  { id: 'ssh', label: 'SSH', protocol: 'TCP', port: 22 },
  { id: 'rdp', label: 'RDP', protocol: 'TCP', port: 3389 },
  { id: 'http', label: 'HTTP', protocol: 'TCP', port: 80 },
  { id: 'https', label: 'HTTPS', protocol: 'TCP', port: 443 },
  { id: 'custom', label: '自定义', protocol: 'TCP' },
];

type Draft = {
  resourceId: string;
  template: TemplateId;
  ruleName: string;
  protocol: 'TCP' | 'UDP';
  port: string;
  sourceType: NetworkSourceType;
  sourceValue: string;
  description: string;
};

function initialDraft(resourceId = ''): Draft {
  return {
    resourceId,
    template: 'ssh',
    ruleName: 'SSH 远程访问',
    protocol: 'TCP',
    port: '22',
    sourceType: 'cidr',
    sourceValue: '10.0.0.0/8',
    description: '',
  };
}

function sourceLabel(rule: NetworkAccessRule) {
  if (rule.sourceType === 'all') return '全部来源';
  if (rule.sourceType === 'current-ip') return '当前 IP';
  return rule.sourceValue;
}

export function NetworkAccessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<'create' | NetworkAccessRule>();
  const [deleteTarget, setDeleteTarget] = useState<NetworkAccessRule>();
  const [draft, setDraft] = useState<Draft>(
    initialDraft(searchParams.get('resourceId') ?? ''),
  );
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const resources = listResources().filter((resource) => resource.status !== 'released');
  const resourceId = searchParams.get('resourceId') ?? 'all';
  const resourceType = searchParams.get('resourceType') ?? 'all';
  const site = searchParams.get('site') ?? 'all';
  const status = searchParams.get('status') ?? 'all';
  const search = searchParams.get('q') ?? '';
  const selectedResource =
    resourceId === 'all'
      ? undefined
      : resources.find((resource) => resource.id === resourceId);
  const rules = useMemo(() => {
    void revision;
    return queryNetworkRules({
      search,
      resourceType: resourceType as 'all' | 'cloud-server' | 'physical-machine',
      site,
      status: status as 'all' | 'enabled' | 'disabled',
    }).filter((rule) => resourceId === 'all' || rule.resourceId === resourceId);
  }, [resourceId, resourceType, revision, search, site, status]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  }

  function selectTemplate(templateId: TemplateId) {
    const template = TEMPLATES.find((item) => item.id === templateId)!;
    setDraft((current) => ({
      ...current,
      template: templateId,
      ruleName:
        templateId === 'custom'
          ? current.ruleName
          : `${template.label} ${templateId === 'http' || templateId === 'https' ? '服务' : '远程访问'}`,
      protocol: template.protocol,
      port: template.port ? String(template.port) : '',
    }));
  }

  function openCreate() {
    const targetId =
      selectedResource?.id ??
      (resources.length === 1 ? resources[0].id : '');
    setDraft(initialDraft(targetId));
    setError('');
    setEditing('create');
  }

  function openEdit(rule: NetworkAccessRule) {
    const template =
      TEMPLATES.find(
        (item) =>
          item.id !== 'custom' &&
          item.port === rule.port &&
          item.protocol === rule.protocol,
      )?.id ?? 'custom';
    setDraft({
      resourceId: rule.resourceId,
      template,
      ruleName: rule.ruleName,
      protocol: rule.protocol,
      port: String(rule.port),
      sourceType: rule.sourceType,
      sourceValue: rule.sourceValue,
      description: rule.description,
    });
    setError('');
    setEditing(rule);
  }

  function toInput(): NetworkRuleInput {
    return {
      resourceId: draft.resourceId,
      ruleName: draft.ruleName,
      protocol: draft.protocol,
      port: Number(draft.port),
      sourceType: draft.sourceType,
      sourceValue:
        draft.sourceType === 'all' ? '0.0.0.0/0' : draft.sourceValue,
      description: draft.description,
    };
  }

  async function submitRule() {
    setError('');
    try {
      if (editing === 'create') {
        await createNetworkRule(toInput());
        setFeedback('网络访问规则已创建并启用。');
      } else if (editing) {
        await updateNetworkRule(editing.id, toInput());
        setFeedback('网络访问规则已更新。');
      }
      setEditing(undefined);
      setRevision((value) => value + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '操作未完成。');
    }
  }

  const pageHeader = useMemo(() => ({
    description: '按资源管理常见访问端口和允许来源，所有变更统一写入全局操作记录。',
    actions: (
      <>
        <Button onClick={() => setParam('resourceId', 'all')}>查看全部资源</Button>
        <Button variant="primary" onClick={openCreate}>新增访问规则</Button>
      </>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [selectedResource?.id]);
  useConsolePageHeader(pageHeader);

  const columns: readonly TableColumn<NetworkAccessRule>[] = [
    {
      key: 'name',
      title: '规则名称',
      render: (rule) => (
        <div className="management-primary-cell">
          <strong>{rule.ruleName}</strong>
          <span>{rule.id}</span>
        </div>
      ),
    },
    {
      key: 'resource',
      title: '关联资源',
      render: (rule) => {
        const resource = resources.find((item) => item.id === rule.resourceId);
        return resource ? (
          <Link to={resourceDetailPath(resource.resourceType, resource.id)}>
            {resource.name}
          </Link>
        ) : rule.resourceId;
      },
    },
    { key: 'protocol', title: '协议', render: (rule) => rule.protocol },
    { key: 'port', title: '访问端口', render: (rule) => rule.port },
    { key: 'source', title: '允许来源', render: sourceLabel },
    { key: 'description', title: '说明', render: (rule) => rule.description || '—', multiline: true },
    {
      key: 'status',
      title: '状态',
      render: (rule) => (
        <StatusBadge tone={rule.status === 'enabled' ? 'success' : 'neutral'}>
          {rule.status === 'enabled' ? '已启用' : '已停用'}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="management-page network-access-page">
      {feedback && <Toast title={feedback} onClose={() => setFeedback('')} />}
      <section className="management-filter-panel" aria-label="资源筛选">
        <SearchInput aria-label="搜索网络规则" value={search} placeholder="搜索规则、资源或来源" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
        <Select aria-label="资源筛选" value={resourceId} onValueChange={(value) => setParam('resourceId', value)} options={[{ value: 'all', label: '全部资源' }, ...resources.map((resource) => ({ value: resource.id, label: resource.name }))]} />
        <Select aria-label="资源类型筛选" value={resourceType} onValueChange={(value) => setParam('resourceType', value)} options={[{ value: 'all', label: '全部资源类型' }, { value: 'cloud-server', label: '云服务器' }, { value: 'physical-machine', label: '物理机' }]} />
        <Select aria-label="站点筛选" value={site} onValueChange={(value) => setParam('site', value)} options={[{ value: 'all', label: '全部站点' }, ...[...new Set(resources.map((resource) => resource.site))].map((value) => ({ value, label: value }))]} />
        <Select aria-label="状态筛选" value={status} onValueChange={(value) => setParam('status', value)} options={[{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已停用' }]} />
      </section>

      {selectedResource && (
        <ResourceNetworkSummary
          resource={selectedResource}
          ruleCount={rules.length}
        />
      )}

      <DataTable
        className="management-table"
        aria-label="访问规则列表"
        eyebrow="基础访问"
        title="访问规则"
        description="常用模板使用标准端口，自定义规则可选择 TCP 或 UDP。"
        resultLabel={`共 ${rules.length} 个结果`}
        columns={columns}
        rows={rules}
        getRowKey={(rule) => rule.id}
        empty={<PageState title={search ? '没有匹配的网络规则' : '暂无网络访问规则'} description={search ? '请调整搜索或筛选条件。' : '选择资源后创建第一条访问规则。'} actionLabel="新增访问规则" onAction={openCreate} />}
        renderRowActions={(rule) => (
          <div className="management-row-actions">
            <TextButton onClick={() => openEdit(rule)}>编辑</TextButton>
            <Switch
              checked={rule.status === 'enabled'}
              onCheckedChange={(checked) => {
                void setNetworkRuleEnabled(rule.id, checked).then(() => {
                  setFeedback(`规则已${checked ? '启用' : '停用'}。`);
                  setRevision((value) => value + 1);
                });
              }}
            >
              {rule.status === 'enabled' ? '停用' : '启用'}
            </Switch>
            <DropdownMenu trigger="更多">
              <DropdownMenuItem danger onSelect={() => setDeleteTarget(rule)}>删除</DropdownMenuItem>
            </DropdownMenu>
          </div>
        )}
      />

      <div className="management-related-links">
        <Link to={`${APP_PATHS.operationRecords}?module=network${selectedResource ? `&resourceId=${encodeURIComponent(selectedResource.id)}` : ''}`}>
          查看网络操作记录
        </Link>
      </div>

      <Modal
        open={Boolean(editing)}
        title={editing === 'create' ? '新增访问规则' : '编辑访问规则'}
        onClose={() => setEditing(undefined)}
        primaryAction={{ label: editing === 'create' ? '创建并启用' : '保存修改', onClick: () => void submitRule() }}
        secondaryAction={{ label: '取消', onClick: () => setEditing(undefined) }}
      >
        <Form>
          <div className="network-template-grid" role="group" aria-label="常用模板">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                type="button"
                aria-pressed={draft.template === template.id}
                data-selected={draft.template === template.id}
                onClick={() => selectTemplate(template.id)}
              >
                <strong>{template.label}</strong>
                <span>{template.port ? `${template.protocol} ${template.port}` : '自定义协议和端口'}</span>
              </button>
            ))}
          </div>
          <FormField label="关联资源" required error={error || undefined}>
            <Select value={draft.resourceId} disabled={editing !== 'create'} placeholder="请选择资源" onValueChange={(value) => setDraft({ ...draft, resourceId: value })} options={resources.map((resource) => ({ value: resource.id, label: `${resource.name} · ${resource.site}` }))} />
          </FormField>
          <FormField label="规则名称" required><Input value={draft.ruleName} maxLength={48} onChange={(event) => setDraft({ ...draft, ruleName: event.target.value })} /></FormField>
          {draft.template === 'custom' && (
            <div className="management-field-pair">
              <FormField label="协议" required><Select value={draft.protocol} onValueChange={(value) => setDraft({ ...draft, protocol: value as 'TCP' | 'UDP' })} options={[{ value: 'TCP', label: 'TCP' }, { value: 'UDP', label: 'UDP' }]} /></FormField>
              <FormField label="访问端口" required><Input type="number" min={1} max={65535} value={draft.port} onChange={(event) => setDraft({ ...draft, port: event.target.value })} /></FormField>
            </div>
          )}
          <FormField label="允许来源" required>
            <Select
              value={draft.sourceType}
              onValueChange={(value) => setDraft({ ...draft, sourceType: value as NetworkSourceType, sourceValue: value === 'all' ? '0.0.0.0/0' : '' })}
              options={[
                { value: 'current-ip', label: '当前 IP（当前环境不可用）', disabled: true },
                { value: 'ip', label: '指定 IP' },
                { value: 'cidr', label: '指定 CIDR' },
                { value: 'all', label: '全部来源' },
              ]}
            />
          </FormField>
          {draft.sourceType !== 'all' && draft.sourceType !== 'current-ip' && (
            <FormField label={draft.sourceType === 'ip' ? 'IP 地址' : 'CIDR'}>
              <Input value={draft.sourceValue} placeholder={draft.sourceType === 'ip' ? '192.0.2.10' : '192.0.2.0/24'} onChange={(event) => setDraft({ ...draft, sourceValue: event.target.value })} />
            </FormField>
          )}
          {draft.sourceType === 'all' && (
            <p className="network-risk-warning" role="alert">
              全部来源会扩大资源暴露范围，请确认服务已配置访问认证和必要防护。
            </p>
          )}
          <FormField label="说明"><Textarea value={draft.description} maxLength={120} showCount onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></FormField>
        </Form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="删除访问规则"
        role="alertdialog"
        onClose={() => setDeleteTarget(undefined)}
        primaryAction={{
          label: '确认删除',
          variant: 'danger',
          onClick: async () => {
            if (!deleteTarget) return;
            try {
              await deleteNetworkRule(deleteTarget.id);
              setFeedback('访问规则已删除。');
              setDeleteTarget(undefined);
              setRevision((value) => value + 1);
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : '删除未完成。');
            }
          },
        }}
        secondaryAction={{ label: '取消', onClick: () => setDeleteTarget(undefined) }}
      >
        <p>{error || '删除后该端口将不再通过此规则开放。'}</p>
      </Modal>
    </div>
  );
}

function ResourceNetworkSummary({
  resource,
  ruleCount,
}: Readonly<{ resource: Resource; ruleCount: number }>) {
  const sshRule = queryNetworkRules().some(
    (rule) =>
      rule.resourceId === resource.id &&
      rule.protocol === 'TCP' &&
      rule.port === (resource.resourceType === 'physical-machine' ? 22 : 22) &&
      rule.status === 'enabled',
  );
  return (
    <section className="network-resource-summary" aria-label="网络摘要">
      <div><span>资源</span><strong>{resource.name}</strong></div>
      <div><span>内网 IP</span><strong>{resource.ip.privateIp}</strong></div>
      <div><span>公网 IP</span><strong>{resource.ip.publicIp ?? '未分配'}</strong></div>
      <div><span>SSH</span><strong>{sshRule ? '已开放' : '未开放'}</strong></div>
      <div><span>规则数量</span><strong>{ruleCount}</strong></div>
    </section>
  );
}
