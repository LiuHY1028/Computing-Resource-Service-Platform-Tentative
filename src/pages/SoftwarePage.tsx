import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Button,
  Container,
  Form,
  FormField,
  Modal,
  PageState,
  Pagination,
  SearchInput,
  Select,
  StatusBadge,
} from '../components/ui';
import {
  getSoftwareCompatibility,
  getSoftwareInstallCount,
  getSoftwareInstallations,
  querySoftware,
  submitSoftwareInstallation,
  type SoftwareProduct,
} from '../features/software';
import {
  queryResources,
  type Resource,
} from '../features/resources';
import '../styles/management.css';
import {
  getSoftwarePrice,
  money,
  pricePolicyLabel,
} from '../features/pricing';

const PAGE_SIZE = 6;

function resourcePath(resourceId: string) {
  return `/resources/${resourceId.startsWith('pm-') ? 'physical-machines' : 'cloud-servers'}/${resourceId}?tab=software`;
}

function softwarePriceLabel(softwareId: string) {
  const price = getSoftwarePrice(softwareId);
  return price
    ? pricePolicyLabel(price.policy, money(price.monthlyPriceFen))
    : '需授权';
}

export function SoftwarePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<SoftwareProduct>();
  const [installing, setInstalling] = useState(false);
  const [version, setVersion] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const query = useMemo(
    () => ({
      search: searchParams.get('q') ?? '',
      category: searchParams.get('category') ?? 'all',
      operatingSystem: searchParams.get('os') ?? 'all',
      computeType: (searchParams.get('compute') ?? 'all') as
        | 'all'
        | 'cpu'
        | 'gpu',
    }),
    [searchParams],
  );
  const software = useMemo(() => querySoftware(query), [query]);
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

  const totalPages = Math.max(1, Math.ceil(software.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = software.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const installations = selected
    ? getSoftwareInstallations().filter((item) => item.softwareId === selected.id)
    : [];

  function openInstall(item: SoftwareProduct) {
    setSelected(item);
    setInstalling(true);
    setVersion(item.versions[0] ?? '');
    setResourceId('');
    setError('');
  }

  async function submitInstall() {
    if (!selected) return;
    const resource = resources.find((item) => item.id === resourceId);
    if (!resource) {
      setError('请选择目标资源。');
      return;
    }
    try {
      const task = await submitSoftwareInstallation({
        softwareId: selected.id,
        version,
        resource,
      });
      setFeedback(`${task.softwareName} ${task.version} 安装任务已提交。`);
      setInstalling(false);
      setSelected(undefined);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '安装任务提交失败。');
    }
  }

  return (
    <div className="management-page">
      <Container className="management-toolbar">
        <div className="management-filter-grid management-filter-grid--four">
          <SearchInput aria-label="搜索软件" value={query.search} placeholder="搜索软件、分类或发布方" onChange={(event) => setParam('q', event.target.value)} clearable onClear={() => setParam('q', '')} />
          <Select aria-label="软件分类" value={query.category} onValueChange={(value) => setParam('category', value)} options={[{ value: 'all', label: '全部分类' }, { value: '运行环境', label: '运行环境' }, { value: '开发工具', label: '开发工具' }, { value: '运维工具', label: '运维工具' }]} />
          <Select aria-label="适用操作系统" value={query.operatingSystem} onValueChange={(value) => setParam('os', value)} options={[{ value: 'all', label: '全部操作系统' }, { value: 'Linux', label: 'Linux' }]} />
          <Select aria-label="适用计算类型" value={query.computeType} onValueChange={(value) => setParam('compute', value)} options={[{ value: 'all', label: 'CPU 与 GPU' }, { value: 'cpu', label: 'CPU' }, { value: 'gpu', label: 'GPU' }]} />
        </div>
      </Container>
      {feedback && <Container className="management-feedback" role="status">{feedback}</Container>}
      <Container className="management-results">
          <div className="management-results__header"><div><span>软件目录</span><h2>可安装软件与环境</h2></div><p>共 {software.length} 个结果</p></div>
          {visible.length ? (
            <div className="management-card-grid">
              {visible.map((item) => (
                <article className="management-card" key={item.id}>
                  <div className="management-card__meta">
                    <StatusBadge tone="info">{item.category}</StatusBadge>
                    <StatusBadge>{item.compatibleComputeTypes.map((type) => type.toUpperCase()).join(' / ')}</StatusBadge>
                  </div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <dl className="management-compact-definition">
                    <div><dt>版本</dt><dd>{item.versions.join('、')}</dd></div>
                    <div><dt>发布方</dt><dd>{item.publisher}</dd></div>
                    <div><dt>环境要求</dt><dd>{item.environmentRequirement}</dd></div>
                    <div><dt>费用</dt><dd>{softwarePriceLabel(item.id)}</dd></div>
                    <div><dt>当前安装数量</dt><dd>{getSoftwareInstallCount(item.id)} 个</dd></div>
                  </dl>
                  <div className="management-card__actions">
                    <Button variant="secondary" onClick={() => setSelected(item)}>查看详情</Button>
                    <Button variant="primary" onClick={() => openInstall(item)}>安装到资源</Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <PageState title="没有匹配的软件" description="请调整搜索或筛选条件。" actionLabel="重置条件" onAction={() => setSearchParams({})} />
          )}
          {software.length > 0 && <Pagination page={safePage} totalPages={totalPages} totalItems={software.length} onPageChange={(next) => setParam('page', String(next))} />}
      </Container>

      <Modal open={Boolean(selected) && !installing} title="软件详情" onClose={() => setSelected(undefined)} primaryAction={{ label: '选择资源安装', onClick: () => selected && openInstall(selected) }} secondaryAction={{ label: '关闭', onClick: () => setSelected(undefined) }}>
        {selected && (
          <>
            <dl className="management-definition-grid">
              <div><dt>软件名称</dt><dd>{selected.name}</dd></div>
              <div><dt>分类</dt><dd>{selected.category}</dd></div>
              <div><dt>版本</dt><dd>{selected.versions.join('、')}</dd></div>
              <div><dt>发布方</dt><dd>{selected.publisher}</dd></div>
              <div><dt>环境要求</dt><dd>{selected.environmentRequirement}</dd></div>
              <div><dt>适用资源</dt><dd>{selected.compatibleComputeTypes.map((item) => item.toUpperCase()).join(' / ')}</dd></div>
              <div><dt>简介</dt><dd>{selected.description}</dd></div>
              <div><dt>当前安装数量</dt><dd>{getSoftwareInstallCount(selected.id)} 个</dd></div>
              <div><dt>费用</dt><dd>{softwarePriceLabel(selected.id)}</dd></div>
            </dl>
            <div className="management-related-links">
              <strong>已安装或处理中资源</strong>
              {installations.length ? installations.map((item) => <Link key={item.id} to={resourcePath(item.resourceId)}>{item.resourceName} · {item.status === 'installed' ? '已安装' : '处理中'}</Link>) : <span>暂无关联资源</span>}
            </div>
          </>
        )}
      </Modal>

      <Modal open={installing} title="提交软件安装任务" onClose={() => setInstalling(false)} primaryAction={{ label: '提交安装任务', onClick: () => void submitInstall() }} secondaryAction={{ label: '取消', onClick: () => setInstalling(false) }}>
        {selected && (
          <Form>
            <p>为 <strong>{selected.name}</strong> 选择版本和目标资源。提交后可在操作记录中查看处理状态。</p>
            <p>费用：{softwarePriceLabel(selected.id)}</p>
            <FormField label="软件版本" required><Select value={version} onValueChange={setVersion} options={selected.versions.map((item) => ({ value: item, label: item }))} /></FormField>
            <FormField label="目标资源" required error={error || undefined}>
              <Select
                value={resourceId}
                placeholder="请选择目标资源"
                onValueChange={setResourceId}
                options={resources.map((resource) => {
                  const compatibility = getSoftwareCompatibility(selected, resource);
                  return {
                    value: resource.id,
                    label: `${resource.name} · ${compatibility.compatible ? '兼容' : compatibility.reason}`,
                    disabled: !compatibility.compatible,
                  };
                })}
              />
            </FormField>
          </Form>
        )}
      </Modal>
    </div>
  );
}
