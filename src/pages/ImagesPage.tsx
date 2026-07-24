import { useCallback, useMemo, useState, type FormEvent } from 'react';
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
  TitleBarTabs,
  Toast,
  type TableColumn,
} from '../components/ui';
import { useConsolePageHeader } from '../app/shell/PageHeaderContext';
import { resourceDetailPath } from '../app/routes';
import {
  createCustomImage,
  deleteCustomImage,
  queryImages,
  updateCustomImage,
  type ImageComputeType,
  type ImageStatus,
  type ImageType,
  type PlatformImage,
} from '../features/images';
import {
  getImagePrice,
  money,
  pricePolicyLabel,
} from '../features/pricing';
import '../styles/management.css';

const PAGE_SIZE = 8;

function typeLabel(type: ImageType) {
  if (type === 'public') return '公共镜像';
  if (type === 'platform') return '平台镜像';
  return '自定义镜像';
}

function statusView(status: ImageStatus) {
  if (status === 'available') return { label: '可用', tone: 'success' as const };
  if (status === 'failed') return { label: '失败', tone: 'error' as const };
  if (status === 'submitted') return { label: '任务已提交', tone: 'info' as const };
  return { label: '处理中', tone: 'warning' as const };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function imagePriceLabel(imageId: string) {
  const price = getImagePrice(imageId);
  return price
    ? pricePolicyLabel(price.policy, money(price.monthlyPriceFen))
    : '价格待确认';
}

type ImageDraft = Readonly<{
  name: string;
  description: string;
  operatingSystem: string;
  version: string;
  architecture: 'x86_64' | 'arm64';
  computeType: 'cpu' | 'gpu' | 'both';
  file?: File;
}>;

const INITIAL_DRAFT: ImageDraft = {
  name: '',
  description: '',
  operatingSystem: 'Linux LTS',
  version: '',
  architecture: 'x86_64',
  computeType: 'both',
};

export function ImagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<PlatformImage>();
  const [formMode, setFormMode] = useState<'create' | 'import' | 'edit'>();
  const [editTarget, setEditTarget] = useState<PlatformImage>();
  const [deleteTarget, setDeleteTarget] = useState<PlatformImage>();
  const [draft, setDraft] = useState<ImageDraft>(INITIAL_DRAFT);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const type = (searchParams.get('type') ?? 'public') as ImageType;
  const query = useMemo(
    () => ({
      type,
      search: searchParams.get('q') ?? '',
      operatingSystem: searchParams.get('os') ?? 'all',
      computeType: (searchParams.get('compute') ?? 'all') as
        | 'all'
        | ImageComputeType,
      status: (searchParams.get('status') ?? 'all') as 'all' | ImageStatus,
    }),
    [searchParams, type],
  );
  const images = useMemo(() => {
    void revision;
    return queryImages(query);
  }, [query, revision]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setSearchParams(next);
  }

  const totalPages = Math.max(1, Math.ceil(images.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const rows = images.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const columns: readonly TableColumn<PlatformImage>[] = [
    {
      key: 'name',
      title: '镜像名称',
      sortable: true,
      sortValue: (image) => image.name,
      hideable: false,
      render: (image) => (
        <div className="management-primary-cell">
          <button className="management-link-button" type="button" onClick={() => setSelected(image)}>{image.name}</button>
          <span>{image.id}</span>
        </div>
      ),
    },
    { key: 'type', title: '镜像类型', sortable: true, sortValue: (image) => typeLabel(image.type), render: (image) => typeLabel(image.type) },
    { key: 'os', title: '操作系统', sortable: true, sortValue: (image) => `${image.operatingSystem} ${image.version}`, render: (image) => <div className="management-primary-cell"><strong>{image.operatingSystem} {image.version}</strong><span>{image.architecture}</span></div> },
    { key: 'environment', title: '环境摘要', render: (image) => image.environmentSummary, multiline: true },
    { key: 'compute', title: '适用计算类型', render: (image) => image.compatibleComputeTypes.map((item) => item.toUpperCase()).join(' / ') },
    { key: 'price', title: '费用', sortable: true, sortValue: (image) => imagePriceLabel(image.id), render: (image) => <strong>{imagePriceLabel(image.id)}</strong> },
    {
      key: 'status',
      title: '状态',
      sortable: true,
      sortValue: (image) => statusView(image.status).label,
      render: (image) => {
        const view = statusView(image.status);
        return <StatusBadge tone={view.tone}>{view.label}</StatusBadge>;
      },
    },
    { key: 'created', title: '创建时间', sortable: true, sortValue: (image) => image.createdAt, render: (image) => formatDate(image.createdAt) },
  ];

  const openCreate = useCallback((mode: 'create' | 'import') => {
    setDraft(INITIAL_DRAFT);
    setEditTarget(undefined);
    setError('');
    setFormMode(mode);
  }, []);

  function closeForm() {
    setFormMode(undefined);
    setEditTarget(undefined);
    setError('');
  }

  const pageHeader = useMemo(() => ({
    description: '统一管理可用镜像、环境兼容性、处理状态和资源关联。',
    actions: (
      <>
        <Button onClick={() => openCreate('create')}>创建镜像记录</Button>
        <Button variant="primary" onClick={() => openCreate('import')}>导入镜像</Button>
      </>
    ),
  }), [openCreate]);
  useConsolePageHeader(pageHeader);

  function openEdit(image: PlatformImage) {
    setDraft({
      name: image.name,
      description: image.description,
      operatingSystem: image.operatingSystem,
      version: image.version,
      architecture: image.architecture,
      computeType:
        image.compatibleComputeTypes.length === 2
          ? 'both'
          : image.compatibleComputeTypes[0] ?? 'cpu',
    });
    setSelected(undefined);
    setError('');
    setEditTarget(image);
    setFormMode('edit');
  }

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
      } else {
        const compatibleComputeTypes: readonly ImageComputeType[] =
          draft.computeType === 'both'
            ? ['cpu', 'gpu']
            : [draft.computeType];
        const created = await createCustomImage({
          name: draft.name,
          description: draft.description,
          operatingSystem: draft.operatingSystem,
          version: draft.version,
          architecture: draft.architecture,
          compatibleComputeTypes,
          sourceFile: draft.file
            ? { name: draft.file.name, size: draft.file.size }
            : undefined,
        });
        setFeedback(
          created.sourceFile
            ? '镜像导入任务已提交，正在处理文件元数据。'
            : '自定义镜像记录已提交。',
        );
      }
      setFormMode(undefined);
      setEditTarget(undefined);
      setDeleteTarget(undefined);
      setParam('type', 'custom');
      setRevision((value) => value + 1);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '提交失败。');
    }
  }

  const list = (
    <div className="management-list-stack">
      {feedback && <Toast title={feedback} onClose={() => setFeedback('')} />}
      <DataTable
        className="management-table"
        aria-label={`${typeLabel(type)}列表`}
        eyebrow={typeLabel(type)}
        title="镜像列表"
        description="按操作系统、计算类型和状态快速定位可用镜像。"
        toolbar={(
          <div className="management-filter-grid management-filter-grid--four">
            <SearchInput aria-label="搜索镜像" value={query.search} placeholder="搜索镜像名称、ID 或环境" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
            <Select aria-label="操作系统筛选" value={query.operatingSystem} onValueChange={(value) => setParam('os', value)} options={[{ value: 'all', label: '全部操作系统' }, { value: 'Linux LTS', label: 'Linux LTS' }]} />
            <Select aria-label="计算类型筛选" value={query.computeType} onValueChange={(value) => setParam('compute', value)} options={[{ value: 'all', label: '全部计算类型' }, { value: 'cpu', label: 'CPU' }, { value: 'gpu', label: 'GPU' }]} />
            <Select aria-label="镜像状态筛选" value={query.status} onValueChange={(value) => setParam('status', value)} options={[{ value: 'all', label: '全部状态' }, { value: 'available', label: '可用' }, { value: 'submitted', label: '任务已提交' }, { value: 'processing', label: '处理中' }, { value: 'failed', label: '失败' }]} />
          </div>
        )}
        resultLabel={`共 ${images.length} 个结果`}
        columns={columns}
        rows={rows}
        getRowKey={(image) => image.id}
        empty={<PageState title={query.search ? '没有匹配的镜像' : `暂无${typeLabel(type)}`} description={query.search ? '请调整搜索或筛选条件。' : '当前分类暂无可显示的镜像记录。'} />}
        renderRowActions={(image) => (
          <div className="management-row-actions">
            <TextButton onClick={() => setSelected(image)}>查看详情</TextButton>
            {image.type === 'custom' && (
              <DropdownMenu trigger="更多">
                <DropdownMenuItem onSelect={() => openEdit(image)}>编辑信息</DropdownMenuItem>
                <DropdownMenuItem danger disabled={Boolean(image.resourceIds.length)} title={image.resourceIds.length ? '有关联资源时不能删除' : undefined} onSelect={() => setDeleteTarget(image)}>删除镜像</DropdownMenuItem>
              </DropdownMenu>
            )}
          </div>
        )}
        pagination={images.length > 0 ? <Pagination page={safePage} totalPages={totalPages} totalItems={images.length} onPageChange={(next) => setParam('page', String(next))} /> : undefined}
      />
    </div>
  );

  return (
    <div className="management-page">
      <div className="management-tabs">
        <TitleBarTabs
          aria-label="镜像类型"
          value={type}
          onValueChange={(value) => setParam('type', value)}
          items={[
            { value: 'public', label: '公共镜像', panel: list },
            { value: 'platform', label: '平台镜像', panel: list },
            { value: 'custom', label: '自定义镜像', panel: list },
          ]}
        />
      </div>

      <Modal open={Boolean(selected)} title="镜像详情" onClose={() => setSelected(undefined)} footer={selected?.type === 'custom' ? <div className="management-row-actions"><Button variant="secondary" onClick={() => selected && openEdit(selected)}>编辑信息</Button><Button variant="danger" disabled={Boolean(selected.resourceIds.length)} title={selected.resourceIds.length ? '有关联资源时不能删除' : undefined} onClick={() => { setDeleteTarget(selected); setSelected(undefined); }}>删除镜像</Button></div> : undefined}>
        {selected && (
          <dl className="management-definition-grid">
            <div><dt>镜像 ID</dt><dd>{selected.id}</dd></div>
            <div><dt>名称</dt><dd>{selected.name}</dd></div>
            <div><dt>类型</dt><dd>{typeLabel(selected.type)}</dd></div>
            <div><dt>操作系统</dt><dd>{selected.operatingSystem} {selected.version}</dd></div>
            <div><dt>架构</dt><dd>{selected.architecture}</dd></div>
            <div><dt>环境</dt><dd>{selected.environmentSummary}</dd></div>
            <div><dt>适用计算类型</dt><dd>{selected.compatibleComputeTypes.map((item) => item.toUpperCase()).join(' / ')}</dd></div>
            <div><dt>大小</dt><dd>{selected.sizeGb ? `${selected.sizeGb} GB` : '等待任务处理'}</dd></div>
            <div><dt>创建时间</dt><dd>{formatDate(selected.createdAt)}</dd></div>
            <div><dt>使用资源数量</dt><dd>{selected.resourceIds.length} 个</dd></div>
            <div><dt>费用</dt><dd>{imagePriceLabel(selected.id)}</dd></div>
            {selected.sourceFile && <div><dt>文件元数据</dt><dd>{selected.sourceFile.name}</dd></div>}
          </dl>
        )}
        {selected?.resourceIds.length ? (
          <div className="management-related-links">
            <strong>关联资源</strong>
            {selected.resourceIds.map((resourceId) => <Link key={resourceId} to={resourceDetailPath(resourceId.startsWith('pm-') ? 'physical-machine' : 'cloud-server', resourceId)}>{resourceId}</Link>)}
          </div>
        ) : null}
      </Modal>

      <Modal open={Boolean(formMode)} title={formMode === 'edit' ? '编辑自定义镜像' : formMode === 'import' ? '导入镜像' : '创建自定义镜像记录'} onClose={closeForm} footer={null}>
        <Form onSubmit={submitForm}>
          <FormField label="镜像名称" required error={error || undefined}><Input value={draft.name} maxLength={48} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></FormField>
          {formMode !== 'edit' && (
            <>
              <FormField label="操作系统" required><Select value={draft.operatingSystem} onValueChange={(value) => setDraft({ ...draft, operatingSystem: value })} options={[{ value: 'Linux LTS', label: 'Linux LTS' }]} /></FormField>
              <FormField label="版本"><Input value={draft.version} onChange={(event) => setDraft({ ...draft, version: event.target.value })} /></FormField>
              <FormField label="架构"><Select value={draft.architecture} onValueChange={(value) => setDraft({ ...draft, architecture: value as 'x86_64' | 'arm64' })} options={[{ value: 'x86_64', label: 'x86_64' }, { value: 'arm64', label: 'arm64' }]} /></FormField>
              <FormField label="适用计算类型"><Select value={draft.computeType} onValueChange={(value) => setDraft({ ...draft, computeType: value as ImageDraft['computeType'] })} options={[{ value: 'both', label: 'CPU 与 GPU' }, { value: 'cpu', label: '仅 CPU' }, { value: 'gpu', label: '仅 GPU' }]} /></FormField>
              {formMode === 'import' && <FormField label="镜像文件" required help="请选择需要导入的镜像文件。"><input type="file" onChange={(event) => setDraft({ ...draft, file: event.target.files?.[0] })} /></FormField>}
            </>
          )}
          <FormField label="说明"><Textarea value={draft.description} maxLength={240} showCount onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></FormField>
          <div className="management-form-actions"><Button type="button" variant="secondary" onClick={closeForm}>取消</Button><Button type="submit" variant="primary">确认提交</Button></div>
        </Form>
      </Modal>

      <Modal open={Boolean(deleteTarget) && !formMode} title="删除自定义镜像" role="alertdialog" onClose={() => setDeleteTarget(undefined)} primaryAction={{ label: '确认删除', variant: 'danger', onClick: async () => { if (!deleteTarget) return; try { await deleteCustomImage(deleteTarget.id); setFeedback('自定义镜像记录已删除。'); setDeleteTarget(undefined); setRevision((value) => value + 1); } catch (nextError) { setError(nextError instanceof Error ? nextError.message : '删除失败。'); } } }} secondaryAction={{ label: '取消', onClick: () => setDeleteTarget(undefined) }}>
        <p>{error || `确认删除“${deleteTarget?.name ?? ''}”的自定义镜像记录？`}</p>
      </Modal>
    </div>
  );
}
