import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  Modal,
  Pagination,
  Toast,
  TitleBarTabs,
  type TableKey,
} from '../components/ui';
import { useConsolePageHeader } from '../app/shell/PageHeaderContext';
import {
  APP_PATHS,
  resourceDetailPath,
  resourceListPath,
} from '../app/routes';
import {
  getResourceFilterOptions,
  queryResources,
  ResourceActionDialog,
  ResourceFilters,
  ResourceLifecycleDialog,
  ResourceTable,
  submitBatchPowerAction,
  type BillingModeFilter,
  type ComputeTypeFilter,
  type ExpiryStateFilter,
  type HealthStatusFilter,
  type LifecycleDialogAction,
  type Resource,
  type ResourceAction,
  type ResourceMenuAction,
  type ResourceQuery,
  type ResourceStatusFilter,
  type ResourceType,
} from '../features/resources';
import '../features/resources/resource-management.css';

const PAGE_SIZE = 5;
const CLOUD_COLUMNS = ['image-full', 'system-disk', 'data-disks', 'network-type', 'created-at', 'owner', 'tags', 'last-operated-at'] as const;
const PHYSICAL_COLUMNS = ['operating-system', 'hostname', 'bmc-status', 'management-network', 'business-network', 'raid', 'created-at', 'tags', 'last-operated-at'] as const;
const COLUMN_LABELS: Readonly<Record<string, string>> = {
  'image-full': '镜像完整信息',
  'system-disk': '系统盘',
  'data-disks': '数据盘',
  'network-type': '网络类型',
  'operating-system': '操作系统',
  hostname: '主机名',
  'bmc-status': 'BMC 状态',
  'management-network': '管理网络',
  'business-network': '业务网络',
  raid: 'RAID',
  'created-at': '创建时间',
  owner: '责任人',
  tags: '标签',
  'last-operated-at': '最近操作时间',
};

function validValue(value: string | null, allowed: readonly string[]) {
  return value && allowed.includes(value) ? value : 'all';
}

function parsePositiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function isResourceAction(value: ResourceMenuAction): value is ResourceAction {
  return ['start', 'stop', 'restart', 'rename', 'release'].includes(value);
}

export function ResourceListPage({ resourceType }: Readonly<{ resourceType: ResourceType }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const options = useMemo(() => getResourceFilterOptions(resourceType), [resourceType]);
  const query = useMemo<ResourceQuery>(() => ({
    resourceType,
    search: searchParams.get('q') ?? '',
    site: validValue(searchParams.get('site'), options.sites),
    room: validValue(searchParams.get('room'), options.rooms),
    status: validValue(searchParams.get('status'), options.statuses) as ResourceStatusFilter,
    healthStatus: validValue(searchParams.get('health'), ['normal', 'warning', 'checking']) as HealthStatusFilter,
    computeType: validValue(searchParams.get('compute'), ['cpu', 'gpu']) as ComputeTypeFilter,
    acceleratorModel: validValue(searchParams.get('gpu'), options.acceleratorModels),
    expiryState: validValue(searchParams.get('expiry'), ['active', 'expiring', 'expired']) as ExpiryStateFilter,
    billingMode: validValue(searchParams.get('billing'), ['subscription', 'pay-as-you-go']) as BillingModeFilter,
    scope: validValue(searchParams.get('scope'), options.scopes),
    tag: validValue(searchParams.get('tag'), options.tags),
    image: validValue(searchParams.get('image'), options.images),
    operatingSystem: validValue(searchParams.get('os'), options.operatingSystems),
  }), [options, resourceType, searchParams]);
  const [revision, setRevision] = useState(0);
  const [selectedByType, setSelectedByType] = useState<Readonly<Record<ResourceType, readonly TableKey[]>>>({
    'cloud-server': [],
    'physical-machine': [],
  });
  const defaultColumns = resourceType === 'cloud-server' ? CLOUD_COLUMNS : PHYSICAL_COLUMNS;
  const [columnsByType, setColumnsByType] = useState<Readonly<Record<ResourceType, readonly string[]>>>({
    'cloud-server': [],
    'physical-machine': [],
  });
  const [density, setDensity] = useState<'compact' | 'standard' | 'comfortable'>('standard');
  const selectedKeys = selectedByType[resourceType];
  const visibleColumns = columnsByType[resourceType];
  const [resourceAction, setResourceAction] = useState<{ resource: Resource; action: ResourceAction }>();
  const [lifecycleAction, setLifecycleAction] = useState<{ resources: readonly Resource[]; action: LifecycleDialogAction }>();
  const [batchPower, setBatchPower] = useState<'start' | 'stop' | 'restart'>();
  const [feedback, setFeedback] = useState('');
  const [batchError, setBatchError] = useState('');
  const page = parsePositiveInteger(searchParams.get('page'));
  const result = useMemo(() => {
    void revision;
    return queryResources(query);
  }, [query, revision]);
  const allTypedResources = useMemo(() => {
    void revision;
    return queryResources({ ...query, search: '', site: 'all', room: 'all', status: 'all', healthStatus: 'all', computeType: 'all', acceleratorModel: 'all', expiryState: 'all', billingMode: 'all', scope: 'all', tag: 'all', image: 'all', operatingSystem: 'all' }).items;
  }, [query, revision]);
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = result.items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const selectedResources = allTypedResources.filter((resource) => selectedKeys.includes(resource.id));

  function setSelectedKeys(keys: readonly TableKey[]) {
    setSelectedByType((current) => ({ ...current, [resourceType]: keys }));
  }

  function setVisibleColumns(update: readonly string[] | ((current: readonly string[]) => readonly string[])) {
    setColumnsByType((current) => ({
      ...current,
      [resourceType]: typeof update === 'function' ? update(current[resourceType]) : update,
    }));
  }

  useEffect(() => {
    if (page !== safePage) {
      const next = new URLSearchParams(searchParams);
      if (safePage === 1) next.delete('page'); else next.set('page', String(safePage));
      setSearchParams(next, { replace: true });
    }
  }, [page, safePage, searchParams, setSearchParams]);

  useEffect(() => {
    const key = `resource-list-context:${resourceType}`;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return;
      const context = JSON.parse(raw) as { path?: string; scrollY?: number };
      const current = `${location.pathname}${location.search}`;
      if (context.path === current) {
        window.requestAnimationFrame(() => window.scrollTo({ top: context.scrollY ?? 0 }));
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // URL 查询参数仍会保留筛选上下文。
    }
  }, [location.pathname, location.search, resourceType]);

  const goPurchase = useCallback(() => {
    const path = `${location.pathname}${location.search}`;
    try {
      window.sessionStorage.setItem(
        `resource-list-context:${resourceType}`,
        JSON.stringify({ path, scrollY: window.scrollY }),
      );
    } catch {
      // 浏览器后退仍可恢复 URL 查询参数。
    }
    navigate(
      `${APP_PATHS.marketplace}?type=${resourceType === 'cloud-server' ? 'cloud' : 'physical'}`,
      { state: { fromResourceList: path } },
    );
  }, [location.pathname, location.search, navigate, resourceType]);

  const pageHeader = useMemo(() => ({
    description: resourceType === 'cloud-server'
      ? '统一查看实例状态、规格、网络、计费与到期风险。'
      : '统一查看整机状态、硬件配置、位置、费用与使用期限。',
    actions: (
      <Button variant="primary" onClick={goPurchase}>
        {resourceType === 'cloud-server' ? '购买云服务器' : '购买物理机'}
      </Button>
    ),
  }), [goPurchase, resourceType]);
  useConsolePageHeader(pageHeader);

  function setParam(key: string, value: string, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key); else next.set(key, value);
    if (resetPage) next.delete('page');
    setSearchParams(next);
  }

  function updateFilter(key: string, value: string) {
    const map: Readonly<Record<string, string>> = {
      search: 'q', site: 'site', room: 'room', status: 'status', healthStatus: 'health',
      computeType: 'compute', acceleratorModel: 'gpu', expiryState: 'expiry',
      billingMode: 'billing', scope: 'scope', tag: 'tag', image: 'image', operatingSystem: 'os',
    };
    if (key === 'computeType' && value === 'cpu') {
      const next = new URLSearchParams(searchParams);
      next.set('compute', value);
      next.delete('gpu');
      next.delete('page');
      setSearchParams(next);
      return;
    }
    setParam(map[key] ?? key, value);
  }

  function detailPath(resource: Resource, tab?: string) {
    navigate(`${resourceDetailPath(resource.resourceType, resource.id)}${tab ? `?tab=${tab}` : ''}`, {
      state: { fromResourceList: `${location.pathname}?${searchParams.toString()}` },
    });
  }

  function handleAction(resource: Resource, action: ResourceMenuAction) {
    if (isResourceAction(action)) {
      setResourceAction({ resource, action });
      return;
    }
    if (['renew', 'auto-renew', 'extend', 'metadata', 'configuration-change', 'os-reinstall'].includes(action)) {
      setLifecycleAction({ resources: [resource], action: action as LifecycleDialogAction });
      return;
    }
    const tabs: Partial<Record<ResourceMenuAction, string>> = {
      storage: 'storage', network: 'network', monitoring: 'monitoring', operations: 'operations',
      'hardware-health': 'health', bmc: 'delivery',
    };
    if (action === 'image') navigate(`${APP_PATHS.images}?resource=${encodeURIComponent(resource.id)}`);
    else detailPath(resource, tabs[action]);
  }

  function openBatch(action: LifecycleDialogAction | 'start' | 'stop' | 'restart') {
    setBatchError('');
    if (!selectedResources.length) {
      setFeedback('请先选择资源。');
      return;
    }
    if (action === 'start' || action === 'stop' || action === 'restart') setBatchPower(action);
    else setLifecycleAction({ resources: selectedResources, action });
  }

  const overview = resourceType === 'cloud-server'
    ? [
        ['资源总数', allTypedResources.length],
        ['运行中', allTypedResources.filter((item) => item.status === 'running').length],
        ['已停止', allTypedResources.filter((item) => item.status === 'stopped').length],
        ['异常', allTypedResources.filter((item) => item.status === 'abnormal').length],
        ['即将到期', allTypedResources.filter((item) => item.expiryState === 'expiring').length],
      ]
    : [
        ['资源总数', allTypedResources.length],
        ['运行中', allTypedResources.filter((item) => item.status === 'running').length],
        ['离线', allTypedResources.filter((item) => item.status === 'stopped').length],
        ['硬件告警', allTypedResources.filter((item) => item.health.status === 'warning').length],
        ['即将到期', allTypedResources.filter((item) => item.expiryState === 'expiring').length],
      ];
  const expiringCount = allTypedResources.filter((item) => item.expiryState !== 'active').length;

  const listContent = (
    <div className="resource-list__content">
      <div className="resource-overview" aria-label={`${resourceType === 'cloud-server' ? '云服务器' : '物理机'}资源概览`}>
        {overview.map(([label, value]) => <div key={label} className="resource-overview__item"><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      {expiringCount > 0 && (
        <div className="resource-expiry-alert" role="status">
          <div><strong>{expiringCount} 个资源存在到期风险</strong><span>可筛选查看剩余天数，并从行内菜单快速处理有效期。</span></div>
          <Button variant="secondary" onClick={() => setParam('expiry', 'expiring')}>查看即将到期</Button>
        </div>
      )}
      <ResourceTable
        resourceType={resourceType}
        rows={pageItems}
        loading={false}
        catalogEmpty={result.catalogTotal === 0}
        selectedKeys={selectedKeys}
        density={density}
        onDensityChange={setDensity}
        visibleOptionalColumns={visibleColumns}
        toolbar={<ResourceFilters resourceType={resourceType} query={query} options={options} onChange={updateFilter} onReset={() => setSearchParams({})} />}
        utilityActions={(
          <>
            <DropdownMenu trigger="列设置" aria-label="列表列设置">
              <DropdownMenuGroup label="扩展列">
                {defaultColumns.map((column) => (
                  <DropdownMenuItem key={column} onSelect={() => setVisibleColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column])}>
                    {visibleColumns.includes(column) ? '✓ ' : ''}{COLUMN_LABELS[column]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuItem onSelect={() => setVisibleColumns([])}>恢复默认列</DropdownMenuItem>
            </DropdownMenu>
          </>
        )}
        selectionActions={(
          <>
            <Button variant="secondary" onClick={() => openBatch('start')}>批量启动</Button>
            <Button variant="secondary" onClick={() => openBatch('stop')}>批量停止</Button>
            <Button variant="secondary" onClick={() => openBatch('restart')}>批量重启</Button>
            {resourceType === 'cloud-server' ? (
              <>
                <Button variant="secondary" onClick={() => openBatch('renew')}>批量续费</Button>
                <Button variant="secondary" onClick={() => openBatch('auto-renew')}>批量自动续费</Button>
              </>
            ) : <Button variant="secondary" onClick={() => openBatch('extend')}>批量申请延期</Button>}
            <Button variant="secondary" onClick={() => openBatch('metadata')}>批量项目与标签</Button>
          </>
        )}
        resultLabel={`共 ${result.total} 个结果`}
        pagination={result.total > 0 ? <Pagination page={safePage} totalPages={totalPages} totalItems={result.total} onPageChange={(next) => setParam('page', String(next), false)} /> : undefined}
        onSelectionChange={setSelectedKeys}
        onRetry={() => undefined}
        onResetFilters={() => setSearchParams({})}
        onGoMarketplace={goPurchase}
        onConnection={(resource) => detailPath(resource, 'network')}
        onAction={handleAction}
      />
    </div>
  );

  const commonQuery = new URLSearchParams(searchParams);
  ['image', 'os', 'room', 'billing', 'page'].forEach((key) => commonQuery.delete(key));
  const suffix = commonQuery.toString() ? `?${commonQuery.toString()}` : '';

  return (
    <div className="resource-page" data-resource-type={resourceType}>
      <div className="resource-type-tabs">
        <TitleBarTabs
          aria-label="我的资源类型"
          value={resourceType === 'cloud-server' ? 'cloud' : 'physical'}
          onValueChange={(value) => navigate(`${resourceListPath(value === 'cloud' ? 'cloud-server' : 'physical-machine')}${suffix}`)}
          items={[
            { value: 'cloud', label: '云服务器', panel: listContent },
            { value: 'physical', label: '物理机', panel: listContent },
          ]}
        />
      </div>
      {feedback && <Toast title={feedback} onClose={() => setFeedback('')} />}
      {resourceAction && <ResourceActionDialog resource={resourceAction.resource} action={resourceAction.action} open onClose={() => setResourceAction(undefined)} onCompleted={(resultValue) => { setFeedback(resultValue.record.message); setResourceAction(undefined); setRevision((value) => value + 1); }} />}
      {lifecycleAction && <ResourceLifecycleDialog resources={lifecycleAction.resources} action={lifecycleAction.action} open onClose={() => setLifecycleAction(undefined)} onCompleted={(message) => { setFeedback(message); setLifecycleAction(undefined); setSelectedKeys([]); setRevision((value) => value + 1); }} />}
      <Modal
        open={Boolean(batchPower)}
        title={`批量${batchPower === 'start' ? '启动' : batchPower === 'stop' ? '停止' : '重启'}资源`}
        onClose={() => setBatchPower(undefined)}
        primaryAction={{
          label: '确认提交',
          variant: batchPower === 'start' ? 'primary' : 'danger',
          onClick: () => {
            if (!batchPower) return;
            void submitBatchPowerAction(selectedResources.map((resource) => resource.id), batchPower)
              .then(() => {
                setFeedback(`${selectedResources.length} 个资源的批量操作已提交。`);
                setBatchPower(undefined);
                setSelectedKeys([]);
                setRevision((value) => value + 1);
              })
              .catch((error: unknown) => setBatchError(error instanceof Error ? error.message : '批量操作失败。'));
          },
        }}
        secondaryAction={{ label: '取消', onClick: () => setBatchPower(undefined) }}
      >
        <p>将对已选择的 {selectedResources.length} 个资源执行兼容性检查后提交操作。</p>
        {batchError && <p className="resource-action-dialog__error" role="alert">{batchError}</p>}
      </Modal>
    </div>
  );
}
