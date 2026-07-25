import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  TextButton,
  Textarea,
  TitleBarTabs,
  Toast,
  type TableColumn,
} from '../components/ui';
import { APP_PATHS, resourceDetailPath } from '../app/routes';
import { useConsolePageHeader } from '../app/shell/PageHeaderContext';
import {
  completeImageTask,
  createImageFromResource,
  deleteCustomImage,
  getImageResourceIds,
  importCustomImage,
  queryImages,
  updateCustomImage,
  type ImageComputeType,
  type ImageStatus,
  type ImageType,
  type PlatformImage,
} from '../features/images';
import { listResources } from '../features/resources';
import { getImagePrice, money, pricePolicyLabel } from '../features/pricing';
import '../styles/management.css';

function typeLabel(type: ImageType) {
  return type === 'public' ? '公共镜像' : '自定义镜像';
}

function statusView(status: ImageStatus) {
  if (status === 'available') return { label: '可用', tone: 'success' as const };
  if (status === 'failed') return { label: '失败', tone: 'error' as const };
  if (status === 'creating') return { label: '制作中', tone: 'info' as const };
  return { label: '导入中', tone: 'info' as const };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function imagePriceLabel(imageId: string) {
  const price = getImagePrice(imageId);
  return price
    ? pricePolicyLabel(price.policy, money(price.monthlyPriceFen))
    : '不单独收费';
}

type FormMode = 'resource' | 'import' | 'edit';
type Draft = {
  name: string;
  description: string;
  resourceId: string;
  includeSystemConfiguration: boolean;
  operatingSystem: string;
  version: string;
  architecture: 'x86_64' | 'arm64';
  computeType: 'cpu' | 'gpu' | 'both';
  bootMode: 'BIOS' | 'UEFI';
  file?: File;
};

const INITIAL_DRAFT: Draft = {
  name: '',
  description: '',
  resourceId: '',
  includeSystemConfiguration: true,
  operatingSystem: 'Linux LTS',
  version: '',
  architecture: 'x86_64',
  computeType: 'both',
  bootMode: 'UEFI',
};

export function ImagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const type: ImageType =
    searchParams.get('type') === 'custom' ? 'custom' : 'public';
  const cloudResources = listResources('cloud-server').filter(
    (resource) =>
      resource.resourceType === 'cloud-server' && resource.status !== 'released',
  );
  const requestedResource = cloudResources.find(
    (item) => item.id === searchParams.get('resourceId'),
  );
  const shouldCreateFromResource =
    type === 'custom' && searchParams.get('create') === 'resource';
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<PlatformImage>();
  const [formMode, setFormMode] = useState<FormMode | undefined>(
    shouldCreateFromResource ? 'resource' : undefined,
  );
  const [editTarget, setEditTarget] = useState<PlatformImage>();
  const [deleteTarget, setDeleteTarget] = useState<PlatformImage>();
  const [draft, setDraft] = useState<Draft>(() => ({
    ...INITIAL_DRAFT,
    resourceId: requestedResource?.id ?? '',
    name: requestedResource ? `${requestedResource.name}系统镜像` : '',
    operatingSystem: requestedResource?.operatingSystem ?? 'Linux LTS',
    computeType: requestedResource?.computeType ?? 'both',
  }));
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const query = useMemo(() => ({
    type,
    search: searchParams.get('q') ?? '',
    operatingSystem: searchParams.get('os') ?? 'all',
    architecture: (searchParams.get('arch') ?? 'all') as 'all' | 'x86_64' | 'arm64',
    computeType: (searchParams.get('compute') ?? 'all') as 'all' | ImageComputeType,
    status: (searchParams.get('status') ?? 'all') as 'all' | ImageStatus,
  }), [searchParams, type]);
  const images = useMemo(() => {
    void revision;
    return queryImages(query);
  }, [query, revision]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  }

  function openForm(mode: FormMode, target?: PlatformImage) {
    setError('');
    setEditTarget(target);
    if (mode === 'edit' && target) {
      setDraft({ ...INITIAL_DRAFT, name: target.name, description: target.description });
    } else {
      const requested = searchParams.get('resourceId') ?? '';
      const resource = cloudResources.find((item) => item.id === requested);
      setDraft({
        ...INITIAL_DRAFT,
        resourceId: resource?.id ?? '',
        name: resource ? `${resource.name}系统镜像` : '',
        operatingSystem: resource?.operatingSystem ?? 'Linux LTS',
        computeType: resource?.computeType ?? 'both',
      });
    }
    setFormMode(mode);
  }

  const pageHeader = useMemo(() => ({
    description: '公共镜像可直接创建资源；自定义镜像来自现有云服务器或本地镜像文件。',
    actions: type === 'custom' ? (
      <>
        <Button onClick={() => openForm('resource')}>从云服务器制作</Button>
        <Button variant="primary" onClick={() => openForm('import')}>导入镜像文件</Button>
      </>
    ) : (
      <Button variant="primary" onClick={() => navigate(APP_PATHS.cloudPurchase)}>
        使用镜像创建云服务器
      </Button>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [navigate, type]);
  useConsolePageHeader(pageHeader);

  async function submitForm(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      if (formMode === 'edit' && editTarget) {
        await updateCustomImage(editTarget.id, {
          name: draft.name,
          description: draft.description,
        });
        setFeedback('镜像信息已更新。');
      } else if (formMode === 'resource') {
        const task = await createImageFromResource({
          resourceId: draft.resourceId,
          name: draft.name,
          description: draft.description,
          includeSystemConfiguration: draft.includeSystemConfiguration,
        });
        completeImageTask(task.id);
        setFeedback('自定义镜像已制作完成，可用于创建云服务器。');
      } else {
        if (!draft.file) throw new Error('请选择镜像文件。');
        const compatibleComputeTypes: readonly ImageComputeType[] =
          draft.computeType === 'both' ? ['cpu', 'gpu'] : [draft.computeType];
        const task = await importCustomImage({
          name: draft.name,
          description: draft.description,
          operatingSystem: draft.operatingSystem,
          version: draft.version,
          architecture: draft.architecture,
          compatibleComputeTypes,
          bootMode: draft.bootMode,
          file: { name: draft.file.name, size: draft.file.size },
        });
        completeImageTask(task.id);
        setFeedback('镜像文件元数据已登记，自定义镜像已可用。');
      }
      setFormMode(undefined);
      setEditTarget(undefined);
      const next = new URLSearchParams(searchParams);
      next.set('type', 'custom');
      next.delete('create');
      next.delete('resourceId');
      setSearchParams(next);
      setRevision((value) => value + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '操作未完成。');
    }
  }

  const columns: readonly TableColumn<PlatformImage>[] = [
    {
      key: 'name',
      title: '镜像',
      sortable: true,
      sortValue: (image) => image.name,
      render: (image) => (
        <div className="management-primary-cell">
          <button type="button" className="management-link-button" onClick={() => setSelected(image)}>
            {image.name}
          </button>
          <span>{image.id}</span>
        </div>
      ),
    },
    {
      key: 'system',
      title: '系统与架构',
      render: (image) => (
        <div className="management-primary-cell">
          <strong>{image.operatingSystem} {image.version}</strong>
          <span>{image.architecture}</span>
        </div>
      ),
    },
    { key: 'environment', title: '环境摘要', render: (image) => image.environmentSummary, multiline: true },
    { key: 'compute', title: '适用计算', render: (image) => image.compatibleComputeTypes.map((item) => item.toUpperCase()).join(' / ') },
    { key: 'size', title: '大小', render: (image) => `${image.sizeGb} GB` },
    { key: 'price', title: '费用策略', render: (image) => imagePriceLabel(image.id) },
    {
      key: 'status',
      title: '状态',
      render: (image) => {
        const view = statusView(image.status);
        return <StatusBadge tone={view.tone}>{view.label}</StatusBadge>;
      },
    },
    { key: 'updated', title: '更新时间', render: (image) => formatDate(image.updatedAt) },
  ];

  const list = (
    <div className="management-list-stack">
      {feedback && <Toast title={feedback} onClose={() => setFeedback('')} />}
      <section className="management-guide">
        <strong>{type === 'public' ? '直接用于创建资源' : '保留团队自己的系统环境'}</strong>
        <p>
          {type === 'public'
            ? '公共镜像由平台维护，只提供查看和创建资源入口。'
            : '自定义镜像可从云服务器系统盘制作，也可读取本地镜像文件元数据后登记。'}
        </p>
      </section>
      <DataTable
        className="management-table"
        aria-label={`${typeLabel(type)}列表`}
        eyebrow={typeLabel(type)}
        title="镜像列表"
        description="通过系统、架构和计算类型定位可用镜像。"
        toolbar={(
          <div className="management-filter-grid management-filter-grid--four">
            <SearchInput aria-label="搜索镜像" value={query.search} placeholder="搜索名称、ID 或环境" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
            <Select aria-label="操作系统筛选" value={query.operatingSystem} onValueChange={(value) => setParam('os', value)} options={[{ value: 'all', label: '全部操作系统' }, { value: 'Linux LTS', label: 'Linux LTS' }]} />
            <Select aria-label="架构筛选" value={query.architecture} onValueChange={(value) => setParam('arch', value)} options={[{ value: 'all', label: '全部架构' }, { value: 'x86_64', label: 'x86_64' }, { value: 'arm64', label: 'arm64' }]} />
            <Select aria-label="计算类型筛选" value={query.computeType} onValueChange={(value) => setParam('compute', value)} options={[{ value: 'all', label: '全部计算类型' }, { value: 'cpu', label: 'CPU' }, { value: 'gpu', label: 'GPU' }]} />
          </div>
        )}
        resultLabel={`共 ${images.length} 个结果`}
        columns={columns}
        rows={images}
        getRowKey={(image) => image.id}
        empty={(
          <PageState
            title={query.search ? '没有匹配的镜像' : `暂无${typeLabel(type)}`}
            description={type === 'custom' ? '可从云服务器制作镜像，或导入本地镜像文件。' : '请调整筛选条件。'}
            actionLabel={type === 'custom' ? '从云服务器制作' : undefined}
            onAction={type === 'custom' ? () => openForm('resource') : undefined}
          />
        )}
        renderRowActions={(image) => (
          <div className="management-row-actions">
            <TextButton onClick={() => setSelected(image)}>查看详情</TextButton>
            <TextButton onClick={() => navigate(`${APP_PATHS.cloudPurchase}?image=${encodeURIComponent(image.id)}`)}>使用镜像</TextButton>
            {image.type === 'custom' && (
              <DropdownMenu trigger="更多">
                <DropdownMenuItem onSelect={() => openForm('edit', image)}>编辑信息</DropdownMenuItem>
                <DropdownMenuItem
                  danger
                  disabled={image.status === 'creating' || image.status === 'importing'}
                  onSelect={() => setDeleteTarget(image)}
                >
                  删除镜像
                </DropdownMenuItem>
              </DropdownMenu>
            )}
          </div>
        )}
      />
    </div>
  );

  const selectedRelations = selected ? getImageResourceIds(selected.id) : [];
  return (
    <div className="management-page">
      <TitleBarTabs
        aria-label="镜像类型"
        value={type}
        onValueChange={(value) => setParam('type', value)}
        items={[
          { value: 'public', label: '公共镜像', panel: list },
          { value: 'custom', label: '自定义镜像', panel: list },
        ]}
      />

      <Modal open={Boolean(selected)} title="镜像详情" onClose={() => setSelected(undefined)}>
        {selected && (
          <>
            <dl className="management-definition-grid">
              <div><dt>镜像 ID</dt><dd>{selected.id}</dd></div>
              <div><dt>名称</dt><dd>{selected.name}</dd></div>
              <div><dt>类型</dt><dd>{typeLabel(selected.type)}</dd></div>
              <div><dt>操作系统</dt><dd>{selected.operatingSystem} {selected.version}</dd></div>
              <div><dt>架构</dt><dd>{selected.architecture}</dd></div>
              <div><dt>状态</dt><dd>{statusView(selected.status).label}</dd></div>
              <div><dt>来源</dt><dd>{selected.source.kind === 'public' ? '平台提供' : selected.source.kind === 'resource' ? '从云服务器制作' : '本地镜像文件'}</dd></div>
              <div><dt>关联资源</dt><dd>{selectedRelations.length} 个</dd></div>
              {selected.source.kind === 'file' && <div><dt>文件</dt><dd>{selected.source.fileName} · {selected.source.bootMode}</dd></div>}
              {selected.failureReason && <div><dt>失败原因</dt><dd>{selected.failureReason}</dd></div>}
            </dl>
            {selected.source.kind === 'resource' && (
              <div className="management-related-links">
                <Link to={resourceDetailPath('cloud-server', selected.source.resourceId)}>查看来源资源</Link>
              </div>
            )}
            {selectedRelations.length > 0 && (
              <div className="management-related-links">
                {selectedRelations.map((resourceId) => (
                  <Link key={resourceId} to={resourceDetailPath('cloud-server', resourceId)}>{resourceId}</Link>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(formMode)}
        title={formMode === 'resource' ? '从云服务器制作镜像' : formMode === 'import' ? '导入镜像文件' : '编辑自定义镜像'}
        onClose={() => setFormMode(undefined)}
        footer={null}
      >
        <Form onSubmit={submitForm}>
          {formMode === 'resource' && (
            <FormField label="来源云服务器" required>
              <Select value={draft.resourceId} placeholder="请选择云服务器" onValueChange={(value) => setDraft({ ...draft, resourceId: value })} options={cloudResources.map((resource) => ({ value: resource.id, label: `${resource.name} · ${resource.operatingSystem}` }))} />
            </FormField>
          )}
          <FormField label="镜像名称" required error={error || undefined}>
            <Input value={draft.name} maxLength={48} showCount onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
          </FormField>
          {formMode === 'import' && (
            <>
              <FormField label="镜像文件" required help="支持 qcow2、raw、img、vhd、vhdx，文件不超过 30 GiB。">
                <input type="file" accept=".qcow2,.raw,.img,.vhd,.vhdx" onChange={(event) => setDraft({ ...draft, file: event.target.files?.[0] })} />
              </FormField>
              <FormField label="操作系统" required><Select value={draft.operatingSystem} onValueChange={(value) => setDraft({ ...draft, operatingSystem: value })} options={[{ value: 'Linux LTS', label: 'Linux LTS' }]} /></FormField>
              <FormField label="版本"><Input value={draft.version} onChange={(event) => setDraft({ ...draft, version: event.target.value })} /></FormField>
              <FormField label="架构"><Select value={draft.architecture} onValueChange={(value) => setDraft({ ...draft, architecture: value as Draft['architecture'] })} options={[{ value: 'x86_64', label: 'x86_64' }, { value: 'arm64', label: 'arm64' }]} /></FormField>
              <FormField label="启动方式"><Select value={draft.bootMode} onValueChange={(value) => setDraft({ ...draft, bootMode: value as Draft['bootMode'] })} options={[{ value: 'UEFI', label: 'UEFI' }, { value: 'BIOS', label: 'BIOS' }]} /></FormField>
              <FormField label="适用计算类型"><Select value={draft.computeType} onValueChange={(value) => setDraft({ ...draft, computeType: value as Draft['computeType'] })} options={[{ value: 'both', label: 'CPU 与 GPU' }, { value: 'cpu', label: '仅 CPU' }, { value: 'gpu', label: '仅 GPU' }]} /></FormField>
            </>
          )}
          {formMode === 'resource' && (
            <label className="management-inline-check">
              <input type="checkbox" checked={draft.includeSystemConfiguration} onChange={(event) => setDraft({ ...draft, includeSystemConfiguration: event.target.checked })} />
              包含必要系统配置
            </label>
          )}
          <FormField label="说明"><Textarea value={draft.description} maxLength={240} showCount onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></FormField>
          <div className="management-form-actions">
            <Button type="button" variant="secondary" onClick={() => setFormMode(undefined)}>取消</Button>
            <Button type="submit" variant="primary">{formMode === 'edit' ? '保存修改' : formMode === 'resource' ? '开始制作' : '开始导入'}</Button>
          </div>
        </Form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="删除自定义镜像"
        role="alertdialog"
        onClose={() => setDeleteTarget(undefined)}
        primaryAction={{
          label: '确认删除',
          variant: 'danger',
          onClick: async () => {
            if (!deleteTarget) return;
            try {
              await deleteCustomImage(deleteTarget.id);
              setFeedback('自定义镜像已删除。');
              setDeleteTarget(undefined);
              setRevision((value) => value + 1);
            } catch (nextError) {
              setError(nextError instanceof Error ? nextError.message : '删除未完成。');
            }
          },
        }}
        secondaryAction={{ label: '取消', onClick: () => setDeleteTarget(undefined) }}
      >
        <p>{error || '删除后不能再使用该镜像创建资源。'}</p>
      </Modal>
    </div>
  );
}
