import { useCallback, useMemo, useState } from 'react';
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
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
  TextButton,
  Textarea,
  Toast,
  type TableColumn,
} from '../components/ui';
import { useConsolePageHeader } from '../app/shell/PageHeaderContext';
import { APP_PATHS, resourceDetailPath } from '../app/routes';
import {
  createNetworkRule,
  deleteNetworkRule,
  queryNetworkRules,
  updateNetworkRule,
  type NetworkAccessRule,
  type NetworkRuleInput,
} from '../features/network';
import {
  listOperationRecords,
  OPERATION_STATUS_VIEWS,
} from '../features/operations';
import {
  queryResources,
  type Resource,
} from '../features/resources';
import '../styles/management.css';

const PAGE_SIZE = 8;

function statusView(rule: NetworkAccessRule) {
  if (rule.status === 'effective') return { label: '已生效', tone: 'success' as const };
  return { label: '失败', tone: 'error' as const };
}

function resourcePath(rule: NetworkAccessRule) {
  return `${resourceDetailPath(rule.resourceType, rule.resourceId)}?tab=network`;
}

type RuleDraft = Readonly<{
  resourceId: string;
  protocol: 'TCP' | 'UDP';
  servicePort: string;
  mappedPort: string;
  source: string;
  description: string;
}>;

const INITIAL_DRAFT: RuleDraft = {
  resourceId: '',
  protocol: 'TCP',
  servicePort: '8080',
  mappedPort: '18080',
  source: '10.0.0.0/8',
  description: '',
};

export function NetworkAccessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<NetworkAccessRule | 'create'>();
  const [deleteTarget, setDeleteTarget] = useState<NetworkAccessRule>();
  const [draft, setDraft] = useState<RuleDraft>(INITIAL_DRAFT);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const query = useMemo(
    () => ({
      search: searchParams.get('q') ?? '',
      resourceType: (searchParams.get('resourceType') ?? 'all') as
        | 'all'
        | 'cloud-server'
        | 'physical-machine',
      site: searchParams.get('site') ?? 'all',
      protocol: (searchParams.get('protocol') ?? 'all') as 'all' | 'TCP' | 'UDP',
      status: (searchParams.get('status') ?? 'all') as
        | 'all'
        | NetworkAccessRule['status'],
    }),
    [searchParams],
  );
  const rules = useMemo(
    () => {
      void revision;
      return queryNetworkRules(query);
    },
    [query, revision],
  );
  const resources = useMemo<readonly Resource[]>(() => {
    const base = {
      search: '',
      site: 'all',
      status: 'all' as const,
      computeType: 'all' as const,
      acceleratorModel: 'all',
      expiryState: 'all' as const,
      scope: 'all',
      image: 'all',
      operatingSystem: 'all',
    };
    const cloud = queryResources({ ...base, resourceType: 'cloud-server' });
    const physical = queryResources({
      ...base,
      resourceType: 'physical-machine',
    });
    return [...cloud.items, ...physical.items];
  }, []);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  }

  const openCreate = useCallback(() => {
    setDraft(INITIAL_DRAFT);
    setError('');
    setEditing('create');
  }, []);

  const pageHeader = useMemo(() => ({
    description: '核查资源地址、端口映射、允许来源和变更状态。',
    actions: <Button variant="primary" onClick={openCreate}>新增规则</Button>,
  }), [openCreate]);
  useConsolePageHeader(pageHeader);

  function openEdit(rule: NetworkAccessRule) {
    setDraft({
      resourceId: rule.resourceId,
      protocol: rule.protocol,
      servicePort: String(rule.servicePort),
      mappedPort: String(rule.mappedPort),
      source: rule.source,
      description: rule.description,
    });
    setError('');
    setEditing(rule);
  }

  function buildInput(): NetworkRuleInput {
    const resource = resources.find((item) => item.id === draft.resourceId);
    if (!resource) throw new Error('请选择关联资源。');
    return {
      resourceId: resource.id,
      resourceName: resource.name,
      resourceType: resource.resourceType,
      site: resource.site,
      privateIp: resource.connection.privateIp ?? resource.ip.privateIp,
      publicIp: resource.connection.publicIp ?? resource.ip.publicIp,
      sshAvailable: resource.connection.available,
      protocol: draft.protocol,
      servicePort: Number(draft.servicePort),
      mappedPort: Number(draft.mappedPort),
      source: draft.source,
      description: draft.description.trim(),
    };
  }

  async function submitRule() {
    try {
      const input = buildInput();
      if (editing === 'create') await createNetworkRule(input);
      else if (editing) await updateNetworkRule(editing.id, input);
      setFeedback(editing === 'create' ? '网络访问规则已创建。' : '网络访问规则已更新。');
      setEditing(undefined);
      setRevision((value) => value + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '提交失败。');
    }
  }

  const totalPages = Math.max(1, Math.ceil(rules.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = rules.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const columns: readonly TableColumn<NetworkAccessRule>[] = [
    {
      key: 'resource',
      title: '关联资源',
      sortable: true,
      sortValue: (rule) => rule.resourceName,
      hideable: false,
      render: (rule) => (
        <div className="management-primary-cell">
          <Link to={resourcePath(rule)}>{rule.resourceName}</Link>
          <span>{rule.resourceId} · {rule.site}</span>
        </div>
      ),
    },
    {
      key: 'address',
      title: '地址',
      render: (rule) => <div className="management-primary-cell"><strong>{rule.privateIp}</strong><span>{rule.publicIp ? `公网 ${rule.publicIp}` : '公网 IP 未分配'}</span></div>,
    },
    {
      key: 'policy',
      title: '访问策略',
      sortable: true,
      sortValue: (rule) => `${rule.protocol}-${rule.servicePort}`,
      render: (rule) => <div className="management-primary-cell"><strong>{rule.protocol} · {rule.servicePort} → {rule.mappedPort}</strong><span>来源 {rule.source}</span></div>,
    },
    { key: 'description', title: '说明', render: (rule) => rule.description || '未填写' },
    {
      key: 'status',
      title: '状态',
      sortable: true,
      sortValue: (rule) => statusView(rule).label,
      render: (rule) => {
        const view = statusView(rule);
        return <StatusBadge tone={view.tone}>{view.label}</StatusBadge>;
      },
    },
  ];

  const recentOperations = listOperationRecords()
    .filter((record) => record.module === 'network')
    .slice(0, 5);

  return (
    <div className="management-page">
      {feedback && <Toast title={feedback} onClose={() => setFeedback('')} />}
      <DataTable
        className="management-table"
        aria-label="网络访问规则列表"
        eyebrow="端口与访问控制"
        title="网络访问规则"
        description="按资源、地址和访问策略核查对外暴露范围。"
        toolbar={(
          <div className="management-filter-grid">
            <SearchInput aria-label="按资源搜索网络规则" value={query.search} placeholder="搜索资源、IP 或说明" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
            <Select aria-label="资源类型" value={query.resourceType} onValueChange={(value) => setParam('resourceType', value)} options={[{ value: 'all', label: '全部资源类型' }, { value: 'cloud-server', label: '云服务器' }, { value: 'physical-machine', label: '物理机' }]} />
            <Select aria-label="站点" value={query.site} onValueChange={(value) => setParam('site', value)} options={[{ value: 'all', label: '全部站点' }, { value: '东部算力中心', label: '东部算力中心' }, { value: '西部算力中心', label: '西部算力中心' }, { value: '南部算力中心', label: '南部算力中心' }]} />
            <Select aria-label="协议" value={query.protocol} onValueChange={(value) => setParam('protocol', value)} options={[{ value: 'all', label: '全部协议' }, { value: 'TCP', label: 'TCP' }, { value: 'UDP', label: 'UDP' }]} />
            <Select aria-label="规则状态" value={query.status} onValueChange={(value) => setParam('status', value)} options={[{ value: 'all', label: '全部状态' }, { value: 'effective', label: '已生效' }, { value: 'failed', label: '失败' }]} />
          </div>
        )}
        resultLabel={`共 ${rules.length} 个结果`}
        columns={columns}
        rows={rows}
        getRowKey={(rule) => rule.id}
        empty={<PageState title={query.search ? '没有匹配的网络规则' : '暂无网络访问规则'} description={query.search ? '请调整搜索或筛选条件。' : '可选择资源并创建新的访问规则。'} />}
        renderRowActions={(rule) => (
          <div className="management-row-actions">
            <TextButton onClick={() => openEdit(rule)}>编辑</TextButton>
            <DropdownMenu trigger="更多">
              <DropdownMenuItem danger onSelect={() => setDeleteTarget(rule)}>删除规则</DropdownMenuItem>
            </DropdownMenu>
          </div>
        )}
        pagination={rules.length > 0 ? <Pagination page={safePage} totalPages={totalPages} totalItems={rules.length} onPageChange={(next) => setParam('page', String(next))} /> : undefined}
      />
      <section className="management-activity-strip">
        <div className="management-results__header"><div><span>最近变更</span><h2>操作记录</h2></div><Link to={`${APP_PATHS.operationRecords}?module=network`}>查看全部</Link></div>
        {recentOperations.length ? <ul className="management-record-list">{recentOperations.map((record) => <li key={record.id}><span>{record.action} · {record.targetName}</span><StatusBadge tone={OPERATION_STATUS_VIEWS[record.status].tone}>{OPERATION_STATUS_VIEWS[record.status].label}</StatusBadge><p>{record.message}</p></li>)}</ul> : <PageState title="暂无网络操作记录" />}
      </section>

      <Modal open={Boolean(editing)} title={editing === 'create' ? '新增网络访问规则' : '编辑网络访问规则'} onClose={() => setEditing(undefined)} primaryAction={{ label: editing === 'create' ? '确认创建' : '保存修改', onClick: () => void submitRule() }} secondaryAction={{ label: '取消', onClick: () => setEditing(undefined) }}>
        <Form>
          <FormField label="关联资源" required error={error || undefined}><Select value={draft.resourceId} disabled={editing !== 'create'} placeholder="请选择资源" onValueChange={(value) => setDraft({ ...draft, resourceId: value })} options={resources.map((resource) => ({ value: resource.id, label: `${resource.name} · ${resource.site}` }))} /></FormField>
          <FormField label="协议" required><Select value={draft.protocol} onValueChange={(value) => setDraft({ ...draft, protocol: value as 'TCP' | 'UDP' })} options={[{ value: 'TCP', label: 'TCP' }, { value: 'UDP', label: 'UDP' }]} /></FormField>
          <div className="management-field-pair">
            <FormField label="服务端口" required><Input type="number" min={1} max={65535} value={draft.servicePort} onChange={(event) => setDraft({ ...draft, servicePort: event.target.value })} /></FormField>
            <FormField label="映射端口" required><Input type="number" min={1} max={65535} value={draft.mappedPort} onChange={(event) => setDraft({ ...draft, mappedPort: event.target.value })} /></FormField>
          </div>
          <FormField label="允许来源" required help="支持 IPv4 地址或 CIDR。"><Input value={draft.source} onChange={(event) => setDraft({ ...draft, source: event.target.value })} /></FormField>
          <FormField label="说明"><Textarea value={draft.description} maxLength={120} showCount onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></FormField>
        </Form>
      </Modal>

      <Modal open={Boolean(deleteTarget)} title="删除网络访问规则" role="alertdialog" onClose={() => setDeleteTarget(undefined)} primaryAction={{ label: '确认删除', variant: 'danger', onClick: async () => { if (!deleteTarget) return; try { await deleteNetworkRule(deleteTarget.id); setFeedback('网络访问规则已删除。'); setDeleteTarget(undefined); setRevision((value) => value + 1); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : '删除失败。'); } } }} secondaryAction={{ label: '取消', onClick: () => setDeleteTarget(undefined) }}>
        <p>{error || '删除后该规则将不再生效，此操作会写入操作记录。'}</p>
      </Modal>

    </div>
  );
}
