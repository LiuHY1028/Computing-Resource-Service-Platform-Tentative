import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Button,
  Container,
  Form,
  FormField,
  Input,
  Modal,
  PageState,
  Pagination,
  Progress,
  SearchInput,
  Select,
  StatusBadge,
  Table,
  TextButton,
  type TableColumn,
} from '../components/ui';
import {
  createStorageSpace,
  deleteStorageSpace,
  getStorageSpace,
  queryStorageSpaces,
  renameStorageSpace,
  requestStorageExpansion,
  requestStorageMount,
  requestStorageUnmount,
  storageAvailableGb,
  storageCapacityState,
  storageUsagePercent,
  type StorageMount,
  type StorageSpace,
  type StorageStatus,
  type StorageType,
} from '../features/storage';
import {
  getOperationsForTarget,
  type PlatformOperationRecord,
} from '../features/operations';
import { queryResources, type Resource } from '../features/resources';
import '../styles/management.css';

const PAGE_SIZE = 8;

function formatCapacity(value: number) {
  return value >= 1024
    ? `${Number((value / 1024).toFixed(1))} TB`
    : `${value} GB`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function typeLabel(type: StorageType) {
  return type === 'local' ? '本地数据存储' : '高性能共享存储';
}

function statusView(status: StorageStatus) {
  if (status === 'available') return { label: '可用', tone: 'success' as const };
  if (status === 'processing') return { label: '处理中', tone: 'info' as const };
  return { label: '异常', tone: 'error' as const };
}

function mountStatus(mount: StorageMount) {
  if (mount.status === 'effective') return { label: '已挂载', tone: 'success' as const };
  if (mount.status === 'removing') return { label: '卸载处理中', tone: 'warning' as const };
  return { label: '挂载处理中', tone: 'info' as const };
}

function capacityView(space: StorageSpace) {
  const state = storageCapacityState(space);
  return state === 'critical'
    ? { label: '容量不足', tone: 'critical' as const, badge: 'error' as const }
    : state === 'high'
      ? { label: '使用率偏高', tone: 'warning' as const, badge: 'warning' as const }
      : { label: '正常', tone: 'normal' as const, badge: 'success' as const };
}

const STORAGE_COLUMNS: readonly TableColumn<StorageSpace>[] = [
  {
    key: 'name',
    title: '存储名称',
    render: (space) => (
      <div className="management-primary-cell">
        <Link to={`/storage/${space.id}`}>{space.name}</Link>
        <span>{space.id}</span>
      </div>
    ),
  },
  { key: 'type', title: '存储类型', render: (space) => typeLabel(space.type) },
  { key: 'capacity', title: '总容量', render: (space) => formatCapacity(space.capacityGb) },
  { key: 'used', title: '已使用', render: (space) => formatCapacity(space.usedGb) },
  { key: 'available', title: '可用容量', render: (space) => formatCapacity(storageAvailableGb(space)) },
  {
    key: 'usage',
    title: '使用率与容量状态',
    multiline: true,
    render: (space) => {
      const view = capacityView(space);
      return <div className="management-storage-usage"><Progress value={space.usedGb} max={space.capacityGb} label={view.label} tone={view.tone} /><StatusBadge tone={view.badge}>{view.label}</StatusBadge></div>;
    },
  },
  { key: 'mounts', title: '挂载资源', render: (space) => `${space.mounts.length} 个` },
  {
    key: 'status',
    title: '状态',
    render: (space) => {
      const view = statusView(space.status);
      return <StatusBadge tone={view.tone}>{view.label}</StatusBadge>;
    },
  },
  { key: 'created', title: '创建时间', render: (space) => formatDate(space.createdAt) },
];

type CreateDraft = Readonly<{
  name: string;
  type: StorageType;
  site: string;
  capacity: string;
}>;

const INITIAL_CREATE: CreateDraft = {
  name: '',
  type: 'shared',
  site: '东部算力中心',
  capacity: '500',
};

export function StorageListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<CreateDraft>(INITIAL_CREATE);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const query = useMemo(
    () => ({
      search: searchParams.get('q') ?? '',
      type: (searchParams.get('type') ?? 'all') as 'all' | StorageType,
      status: (searchParams.get('status') ?? 'all') as 'all' | StorageStatus,
      usage: (searchParams.get('usage') ?? 'all') as
        | 'all'
        | 'low'
        | 'medium'
        | 'high',
      mounted: (searchParams.get('mounted') ?? 'all') as 'all' | 'yes' | 'no',
    }),
    [searchParams],
  );
  const spaces = useMemo(
    () => {
      void revision;
      return queryStorageSpaces(query);
    },
    [query, revision],
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(spaces.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = spaces.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const hasFilters = [...searchParams.keys()].some((key) => key !== 'page');

  async function submitCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const created = await createStorageSpace({
        name: draft.name,
        type: draft.type,
        site: draft.site,
        capacityGb: Number(draft.capacity),
      });
      setCreateOpen(false);
      setDraft(INITIAL_CREATE);
      setFeedback(`${created.name} 的创建请求已提交。`);
      setRevision((value) => value + 1);
    } catch (nextError) {
      setFormError(nextError instanceof Error ? nextError.message : '提交失败。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="management-page">
      <Container className="management-toolbar">
        <div className="management-filter-grid">
          <SearchInput
            aria-label="搜索存储"
            placeholder="搜索名称或存储 ID"
            value={query.search}
            onChange={(event) => setParam('q', event.target.value)}
            clearable
            onClear={() => setParam('q', '')}
          />
          <Select
            aria-label="存储类型"
            value={query.type}
            onValueChange={(value) => setParam('type', value)}
            options={[
              { value: 'all', label: '全部类型' },
              { value: 'local', label: '本地数据存储' },
              { value: 'shared', label: '高性能共享存储' },
            ]}
          />
          <Select
            aria-label="存储状态"
            value={query.status}
            onValueChange={(value) => setParam('status', value)}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'available', label: '可用' },
              { value: 'processing', label: '处理中' },
              { value: 'error', label: '异常' },
            ]}
          />
          <Select
            aria-label="容量使用情况"
            value={query.usage}
            onValueChange={(value) => setParam('usage', value)}
            options={[
              { value: 'all', label: '全部使用率' },
              { value: 'low', label: '低于 50%' },
              { value: 'medium', label: '50% 至 79%' },
              { value: 'high', label: '80% 及以上' },
            ]}
          />
          <Select
            aria-label="挂载资源"
            value={query.mounted}
            onValueChange={(value) => setParam('mounted', value)}
            options={[
              { value: 'all', label: '全部挂载情况' },
              { value: 'yes', label: '已关联资源' },
              { value: 'no', label: '未关联资源' },
            ]}
          />
        </div>
        <div className="management-toolbar__actions">
          {hasFilters && (
            <TextButton onClick={() => setSearchParams({})}>重置条件</TextButton>
          )}
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            创建存储空间
          </Button>
        </div>
      </Container>

      {feedback && <Container className="management-feedback" role="status">{feedback}</Container>}
      <Container className="management-results">
        <div className="management-results__header">
          <div><span>存储空间</span><h2>存储列表</h2></div>
          <p>共 {spaces.length} 个结果</p>
        </div>
        <Table
          className="management-table"
          aria-label="存储空间列表"
          columns={STORAGE_COLUMNS}
          rows={rows}
          getRowKey={(space) => space.id}
          empty={
            <PageState
              title={hasFilters ? '没有匹配的存储空间' : '暂无存储空间'}
              description={hasFilters ? '请调整筛选条件后重试。' : '可创建存储空间并等待资源准备。'}
              actionLabel={hasFilters ? '重置条件' : '创建存储空间'}
              onAction={hasFilters ? () => setSearchParams({}) : () => setCreateOpen(true)}
            />
          }
          renderRowActions={(space) => (
            <Link to={`/storage/${space.id}`}>查看详情</Link>
          )}
        />
        {spaces.length > 0 && (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            totalItems={spaces.length}
            onPageChange={(nextPage) => setParam('page', String(nextPage))}
          />
        )}
      </Container>

      <Modal
        open={createOpen}
        title="创建存储空间"
        onClose={() => !submitting && setCreateOpen(false)}
        busy={submitting}
        footer={null}
      >
        <Form onSubmit={submitCreate}>
          <FormField label="存储名称" required error={formError || undefined}>
            <Input value={draft.name} maxLength={48} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </FormField>
          <FormField label="存储类型" required>
            <Select
              value={draft.type}
              onValueChange={(value) => setDraft({ ...draft, type: value as StorageType })}
              options={[
                { value: 'local', label: '本地数据存储' },
                { value: 'shared', label: '高性能共享存储' },
              ]}
            />
          </FormField>
          <FormField label="站点" required>
            <Select
              value={draft.site}
              onValueChange={(value) => setDraft({ ...draft, site: value })}
              options={[
                { value: '东部算力中心', label: '东部算力中心' },
                { value: '西部算力中心', label: '西部算力中心' },
              ]}
            />
          </FormField>
          <FormField label="容量（GB）" required help="提交后存储空间将进入准备流程。">
            <Input type="number" min={1} value={draft.capacity} onChange={(event) => setDraft({ ...draft, capacity: event.target.value })} />
          </FormField>
          <div className="management-form-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button type="submit" variant="primary" disabled={submitting}>{submitting ? '处理中' : '提交创建请求'}</Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

type DetailAction = 'rename' | 'expand' | 'mount' | 'delete' | undefined;

export function StorageDetailPage() {
  const { storageId = '' } = useParams();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const [action, setAction] = useState<DetailAction>();
  const [value, setValue] = useState('');
  const [mountPath, setMountPath] = useState('/data/shared');
  const [readOnly, setReadOnly] = useState('false');
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const operations = getOperationsForTarget(storageId);
  const space = useMemo(
    () => {
      void revision;
      return getStorageSpace(storageId);
    },
    [revision, storageId],
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

  if (!space) {
    return (
      <div className="management-page">
        <PageState
          title="未找到存储空间"
          description="该存储空间不存在或记录已移除。"
          actionLabel="返回存储列表"
          onAction={() => navigate('/storage')}
        />
      </div>
    );
  }
  const currentSpace = space;
  const currentCapacity = capacityView(currentSpace);

  async function submitAction() {
    setError('');
    try {
      if (action === 'rename') {
        await renameStorageSpace(currentSpace.id, value);
        setFeedback('存储名称已更新。');
      } else if (action === 'expand') {
        await requestStorageExpansion(currentSpace.id, Number(value));
        setFeedback('扩容申请已提交，当前容量保持不变。');
      } else if (action === 'mount') {
        const resource = resources.find((item) => item.id === selectedResourceId);
        if (!resource) throw new Error('请选择目标资源。');
        await requestStorageMount(currentSpace.id, {
          resourceId: resource.id,
          resourceName: resource.name,
          resourceType: resource.resourceType,
          mountPath,
          readOnly: readOnly === 'true',
        });
        setFeedback('挂载请求已提交。');
      } else if (action === 'delete') {
        await deleteStorageSpace(currentSpace.id);
        navigate('/storage', { replace: true });
        return;
      }
      setAction(undefined);
      setRevision((revisionValue) => revisionValue + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '操作提交失败。');
    }
  }

  const mountColumns: readonly TableColumn<StorageMount>[] = [
    {
      key: 'resource',
      title: '挂载资源',
      render: (mount) => (
        <Link to={`/resources/${mount.resourceType === 'cloud-server' ? 'cloud-servers' : 'physical-machines'}/${mount.resourceId}?tab=storage`}>
          {mount.resourceName}
        </Link>
      ),
    },
    { key: 'path', title: '挂载路径', render: (mount) => mount.mountPath },
    { key: 'readonly', title: '只读', render: (mount) => mount.readOnly ? '是' : '否' },
    {
      key: 'status',
      title: '状态',
      render: (mount) => {
        const view = mountStatus(mount);
        return <StatusBadge tone={view.tone}>{view.label}</StatusBadge>;
      },
    },
  ];
  const operationColumns: readonly TableColumn<PlatformOperationRecord>[] = [
    { key: 'action', title: '操作', render: (record) => record.action },
    { key: 'time', title: '时间', render: (record) => formatDate(record.createdAt) },
    { key: 'status', title: '状态', render: (record) => <StatusBadge tone={record.status === 'completed' ? 'success' : 'info'}>{record.status === 'completed' ? '已完成' : '处理中'}</StatusBadge> },
    { key: 'message', title: '结果说明', render: (record) => record.message, multiline: true },
  ];

  return (
    <div className="management-page">
      <Container className="management-detail-header">
        <TextButton onClick={() => navigate('/storage')}>返回存储列表</TextButton>
        <div className="management-detail-header__main">
          <div>
            <span>{space.id}</span>
            <h2>{space.name}</h2>
            <p>{typeLabel(space.type)} · {space.site}</p>
          </div>
          <StatusBadge tone={statusView(space.status).tone}>{statusView(space.status).label}</StatusBadge>
        </div>
        <div className="management-detail-actions">
          <Button onClick={() => { setValue(space.name); setAction('rename'); }}>修改名称</Button>
          <Button onClick={() => { setValue(String(space.capacityGb + 100)); setAction('expand'); }}>提交扩容申请</Button>
          <Button onClick={() => setAction('mount')}>挂载资源</Button>
          <Button variant="danger" disabled={space.mounts.length > 0} title={space.mounts.length ? '存在挂载关系时不能删除' : undefined} onClick={() => setAction('delete')}>删除</Button>
        </div>
      </Container>
      {feedback && <Container className="management-feedback" role="status">{feedback}</Container>}
      <div className="management-detail-grid">
        <Container as="section" className="management-detail-section management-detail-section--wide">
          <h3>概览与容量使用</h3>
          <div className="management-capacity-summary">
            <div><span>总容量</span><strong>{formatCapacity(space.capacityGb)}</strong></div>
            <div><span>已使用</span><strong>{formatCapacity(space.usedGb)}</strong></div>
            <div><span>可用容量</span><strong>{formatCapacity(storageAvailableGb(space))}</strong></div>
            <div><span>使用率</span><strong>{storageUsagePercent(space)}%</strong></div>
          </div>
          <Progress value={space.usedGb} max={space.capacityGb} label={currentCapacity.label} tone={currentCapacity.tone} />
          <dl className="management-definition-grid">
            <div><dt>存储类型</dt><dd>{typeLabel(space.type)}</dd></div>
            <div><dt>技术信息</dt><dd>{space.technology}</dd></div>
            <div><dt>容量状态</dt><dd><StatusBadge tone={currentCapacity.badge}>{currentCapacity.label}</StatusBadge></dd></div>
            <div><dt>协议</dt><dd>{space.protocol}</dd></div>
            <div><dt>挂载路径</dt><dd>{space.mountPath}</dd></div>
            <div><dt>读写状态</dt><dd>{space.readWriteStatus === 'read-write' ? '可读写' : '只读'}</dd></div>
            <div><dt>挂载资源</dt><dd>{space.mounts.length} 个</dd></div>
            <div><dt>创建时间</dt><dd>{formatDate(space.createdAt)}</dd></div>
            <div><dt>到期时间</dt><dd>{formatDate(space.expiresAt)}</dd></div>
            <div><dt>最近更新时间</dt><dd>{formatDate(space.updatedAt)}</dd></div>
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>稳定性能指标</h3>
          <dl className="management-definition-grid">
            <div><dt>读吞吐</dt><dd>{space.performance.readThroughputMbs} MB/s</dd></div>
            <div><dt>写吞吐</dt><dd>{space.performance.writeThroughputMbs} MB/s</dd></div>
            <div><dt>读 IOPS</dt><dd>{space.performance.readIops}</dd></div>
            <div><dt>写 IOPS</dt><dd>{space.performance.writeIops}</dd></div>
            <div><dt>平均延迟</dt><dd>{space.performance.averageLatencyMs} ms</dd></div>
          </dl>
        </Container>
        <Container as="section" className="management-detail-section">
          <h3>挂载关系</h3>
          <Table
            aria-label="存储挂载关系"
            columns={mountColumns}
            rows={space.mounts}
            getRowKey={(mount) => mount.id}
            renderRowActions={(mount) => (
              <Button
                variant="secondary"
                disabled={mount.status !== 'effective'}
                onClick={async () => {
                  await requestStorageUnmount(space.id, mount.id);
                  setFeedback('卸载请求已提交。');
                  setRevision((revisionValue) => revisionValue + 1);
                }}
              >
                卸载资源
              </Button>
            )}
          />
        </Container>
        <Container as="section" className="management-detail-section management-detail-section--wide">
          <h3>操作记录</h3>
          <Table aria-label="存储操作记录" columns={operationColumns} rows={operations} getRowKey={(record) => record.id} />
        </Container>
      </div>

      <Modal
        open={Boolean(action)}
        title={action === 'rename' ? '修改存储名称' : action === 'expand' ? '提交扩容申请' : action === 'mount' ? '挂载资源' : '确认删除'}
        onClose={() => setAction(undefined)}
        role={action === 'delete' ? 'alertdialog' : 'dialog'}
        primaryAction={{
          label: action === 'delete' ? '提交删除请求' : '确认提交',
          variant: action === 'delete' ? 'danger' : 'primary',
          onClick: () => void submitAction(),
        }}
        secondaryAction={{ label: '取消', onClick: () => setAction(undefined) }}
      >
        {action === 'rename' && <FormField label="存储名称" required error={error || undefined}><Input value={value} onChange={(event) => setValue(event.target.value)} /></FormField>}
        {action === 'expand' && <FormField label="目标容量（GB）" required error={error || undefined} help={`当前容量 ${space.capacityGb} GB，提交后等待基础设施处理。`}><Input type="number" min={space.capacityGb + 1} value={value} onChange={(event) => setValue(event.target.value)} /></FormField>}
        {action === 'mount' && (
          <Form>
            <FormField label="目标资源" required error={error || undefined}>
              <Select value={selectedResourceId} placeholder="请选择资源" onValueChange={setSelectedResourceId} options={resources.filter((resource) => resource.site === space.site).map((resource) => ({ value: resource.id, label: `${resource.name} · ${resource.id}` }))} />
            </FormField>
            <FormField label="挂载路径" required><Input value={mountPath} onChange={(event) => setMountPath(event.target.value)} /></FormField>
            <FormField label="访问方式"><Select value={readOnly} onValueChange={setReadOnly} options={[{ value: 'false', label: '读写' }, { value: 'true', label: '只读' }]} /></FormField>
          </Form>
        )}
        {action === 'delete' && <p>{space.mounts.length ? '存在挂载关系，当前不能删除。' : '删除请求提交后，该记录将从当前列表移除。'}</p>}
      </Modal>
    </div>
  );
}
