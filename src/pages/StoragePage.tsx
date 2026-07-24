import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  APP_PATHS,
  checkoutPath,
  orderDetailPath,
  resourceDetailPath,
  storageDetailPath,
  storageFilesPath,
} from '../app/routes';
import {
  Button,
  DataTable,
  Container,
  DropdownMenu,
  DropdownMenuItem,
  FormField,
  Input,
  Modal,
  Pagination,
  PageState,
  SearchInput,
  Select,
  StatusBadge,
  TextButton,
  Toast,
  UsageMeter,
  type TableColumn,
} from '../components/ui';
import { useConsolePageHeader } from '../app/shell/PageHeaderContext';
import { ORDER_STATUS_VIEWS, queryOrders } from '../features/orders';
import { formatMoney } from '../features/pricing';
import { listResources } from '../features/resources/state/resourceStore';
import {
  canManageStorageFiles,
  createStoragePriceQuote,
  getStorageSpace,
  queryStorageSpaces,
  renameStorageSpace,
  createStorageExpansionOrder,
  createStorageRenewalOrder,
  mountStorage,
  releaseStorage,
  unmountStorage,
  setStorageAutoRenew,
  storageAvailableGb,
  type StorageMount,
  type StorageSpace,
  type StorageStatus,
  type StorageType,
} from '../features/storage';
import '../styles/management.css';
import '../styles/storage.css';

type Dialog =
  | { type: 'rename'; space: StorageSpace }
  | { type: 'mount'; space: StorageSpace }
  | { type: 'expand'; space: StorageSpace }
  | { type: 'renew'; space: StorageSpace }
  | { type: 'unmount'; space: StorageSpace; mount: StorageMount }
  | { type: 'release'; space: StorageSpace };

function typeLabel(type: StorageType) {
  return type === 'cloud-disk' ? '云硬盘' : '高性能共享存储';
}

function tierLabel(space: StorageSpace) {
  return space.performanceTier === 'performance' ? '性能型' : '标准型';
}

function statusView(status: StorageStatus) {
  if (status === 'available') return { label: '可用', tone: 'success' as const };
  if (status === 'attached') return { label: '已挂载', tone: 'success' as const };
  if (status === 'creating') return { label: '创建中', tone: 'info' as const };
  if (status === 'attaching') return { label: '挂载中', tone: 'info' as const };
  if (status === 'detaching') return { label: '卸载中', tone: 'info' as const };
  if (status === 'expanding') return { label: '扩容中', tone: 'info' as const };
  if (status === 'renewing') return { label: '续费中', tone: 'info' as const };
  if (status === 'expiring') return { label: '即将到期', tone: 'warning' as const };
  if (status === 'expired') return { label: '已到期', tone: 'error' as const };
  if (status === 'releasing') return { label: '释放中', tone: 'warning' as const };
  return { label: '异常', tone: 'error' as const };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function monthlyCost(space: StorageSpace) {
  return formatMoney(space.priceSnapshot.total);
}

export function StorageListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState<Dialog>();
  const [feedback, setFeedback] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<readonly string[]>([]);
  const [page, setPage] = useState(1);
  const [viewOpenedAt] = useState(() => Date.now());
  const query = {
    search: searchParams.get('q') ?? '',
    type: (searchParams.get('type') ?? 'all') as 'all' | StorageType,
    status: (searchParams.get('status') ?? 'all') as 'all' | StorageStatus,
    mounted: (searchParams.get('mounted') ?? 'all') as 'all' | 'yes' | 'no',
  };
  void revision;
  const spaces = queryStorageSpaces(query);
  const totalCapacity = spaces.reduce((total, space) => total + space.capacityGb, 0);
  const totalUsed = spaces.reduce((total, space) => total + space.usedGb, 0);
  const currentMonthFee = spaces.reduce(
    (total, space) => total + Math.round(
      space.priceSnapshot.total.amountFen / (space.priceSnapshot.duration ?? 1),
    ),
    0,
  );
  const expiringSoon = spaces.filter((space) => {
    const remaining = new Date(space.expiresAt).getTime() - viewOpenedAt;
    return remaining > 0 && remaining <= 30 * 24 * 60 * 60 * 1000;
  }).length;
  const pageHeader = useMemo(() => ({
    description: '统一查看容量、挂载关系、费用与到期风险。',
    actions: (
      <Button variant="primary" onClick={() => navigate(APP_PATHS.storagePurchase)}>
        购买存储
      </Button>
    ),
  }), [navigate]);
  useConsolePageHeader(pageHeader);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
    setPage(1);
  }

  function clearFilters() {
    setSearchParams({});
    setPage(1);
  }

  const columns: readonly TableColumn<StorageSpace>[] = [
    {
      key: 'storage',
      title: '存储',
      sortable: true,
      sortValue: (space) => space.name,
      hideable: false,
      render: (space) => (
        <div className="storage-workbench__identity">
          <span className="storage-workbench__type-icon" data-type={space.type} aria-hidden="true">
            {space.type === 'cloud-disk' ? '▣' : '⌘'}
          </span>
          <div className="management-primary-cell">
            <Link to={storageDetailPath(space.id)}>{space.name}</Link>
            <span>{space.id}</span>
            <span>{space.site}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      title: '类型和规格',
      sortable: true,
      sortValue: (space) => typeLabel(space.type),
      render: (space) => (
        <div className="management-primary-cell">
          <strong>{typeLabel(space.type)}</strong>
          <span>{tierLabel(space)} · {space.fileSystem}</span>
          <span>{space.protocol ?? '块设备'}</span>
        </div>
      ),
    },
    {
      key: 'capacity',
      title: '容量',
      sortable: true,
      sortValue: (space) => space.usedGb / space.capacityGb,
      render: (space) => (
        <UsageMeter
          used={space.usedGb}
          total={space.capacityGb}
          label={`${space.name}容量使用率`}
          variant="table"
        />
      ),
    },
    {
      key: 'mounts',
      title: '挂载关系',
      render: (space) => space.mounts.length ? (
        <div className="management-primary-cell">
          <strong>{space.mounts.length} 个资源</strong>
          <span>{space.mounts[0]?.mountPath}</span>
          {space.mounts.length > 1 && <span>另有 {space.mounts.length - 1} 个挂载点</span>}
        </div>
      ) : <span className="storage-workbench__unmounted">暂未挂载</span>,
    },
    {
      key: 'billing',
      title: '费用和到期',
      render: (space) => (
        <div className="management-primary-cell">
          <strong className="storage-workbench__price">{monthlyCost(space)}</strong>
          <span>到期 {formatDate(space.expiresAt)}</span>
          <span>{space.autoRenew ? '自动续费已开启' : '手动续费'}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: '状态',
      sortable: true,
      sortValue: (space) => statusView(space.status).label,
      render: (space) => {
        const view = statusView(space.status);
        return <StatusBadge tone={view.tone}>{view.label}</StatusBadge>;
      },
    },
  ];

  async function toggleAutoRenew(space: StorageSpace) {
    const updated = await setStorageAutoRenew(space.id, !space.autoRenew);
    setFeedback(`${updated.name}的自动续费已${updated.autoRenew ? '开启' : '关闭'}。`);
    setRevision((value) => value + 1);
  }

  return (
    <div className="storage-workbench">
      <section className="storage-overview-band" aria-label="存储资源概览">
        <div><span>存储总数</span><strong>{spaces.length}</strong><small>个独立存储</small></div>
        <div><span>总容量</span><strong>{totalCapacity.toLocaleString('zh-CN')} GB</strong><small>当前筛选范围</small></div>
        <div><span>已使用容量</span><strong>{totalUsed.toLocaleString('zh-CN')} GB</strong><small>{totalCapacity ? Math.round(totalUsed / totalCapacity * 100) : 0}% 已使用</small></div>
        <div><span>本月费用</span><strong>{formatMoney({ amountFen: currentMonthFee, currency: 'CNY' })}</strong><small>按现有价格快照</small></div>
        <div><span>即将到期</span><strong>{expiringSoon}</strong><small>未来 30 天</small></div>
      </section>
      <DataTable<StorageSpace>
        aria-label="存储列表"
        className="storage-workbench-table"
        title="存储空间"
        toolbar={(
          <div className="management-filter-grid management-filter-grid--four">
            <SearchInput value={query.search} placeholder="搜索名称、ID或站点" onChange={(event) => setParam('q', event.target.value)} />
            <Select aria-label="存储类型" value={query.type} onValueChange={(value) => setParam('type', value)} options={[{ value: 'all', label: '全部类型' }, { value: 'cloud-disk', label: '云硬盘' }, { value: 'shared', label: '高性能共享存储' }]} />
            <Select aria-label="状态" value={query.status} onValueChange={(value) => setParam('status', value)} options={[{ value: 'all', label: '全部状态' }, { value: 'available', label: '可用' }, { value: 'attached', label: '已挂载' }, { value: 'creating', label: '创建中' }, { value: 'attaching', label: '挂载中' }, { value: 'detaching', label: '卸载中' }, { value: 'expanding', label: '扩容中' }, { value: 'renewing', label: '续费中' }, { value: 'expiring', label: '即将到期' }, { value: 'expired', label: '已到期' }, { value: 'releasing', label: '释放中' }, { value: 'abnormal', label: '异常' }]} />
            <Select aria-label="挂载状态" value={query.mounted} onValueChange={(value) => setParam('mounted', value)} options={[{ value: 'all', label: '全部挂载状态' }, { value: 'yes', label: '已挂载' }, { value: 'no', label: '未挂载' }]} />
          </div>
        )}
        filterSummary={(query.search || query.type !== 'all' || query.status !== 'all' || query.mounted !== 'all') && (
          <>
            <span className="storage-filter-summary__label">已选条件</span>
            {query.search && <button type="button" className="storage-filter-tag" onClick={() => setParam('q', '')}>关键词：{query.search} ×</button>}
            {query.type !== 'all' && <button type="button" className="storage-filter-tag" onClick={() => setParam('type', 'all')}>类型：{typeLabel(query.type)} ×</button>}
            {query.status !== 'all' && <button type="button" className="storage-filter-tag" onClick={() => setParam('status', 'all')}>状态：{statusView(query.status).label} ×</button>}
            {query.mounted !== 'all' && <button type="button" className="storage-filter-tag" onClick={() => setParam('mounted', 'all')}>挂载：{query.mounted === 'yes' ? '已挂载' : '未挂载'} ×</button>}
            <TextButton onClick={clearFilters}>清除全部</TextButton>
          </>
        )}
        utilityActions={<Button variant="ghost" onClick={() => { setRevision((value) => value + 1); setFeedback('存储列表已刷新。'); }}>刷新</Button>}
        columns={columns}
        rows={spaces}
        getRowKey={(space) => space.id}
        getRowLabel={(space) => space.name}
        selectable
        selectedKeys={selectedKeys}
        onSelectionChange={(keys) => setSelectedKeys(keys.map(String))}
        selectionActions={(
          <>
            <Button onClick={() => setFeedback(`已选择 ${selectedKeys.length} 个存储，可逐项确认续费周期与费用。`)}>批量续费</Button>
            <Button onClick={() => setFeedback(`已选择 ${selectedKeys.length} 个存储，可继续导出清单。`)}>导出清单</Button>
          </>
        )}
        actionsWidth="216px"
        minWidth="1180px"
        pagination={(
          <Pagination
            page={page}
            totalPages={1}
            totalItems={spaces.length}
            pageSize={10}
            onPageChange={setPage}
            onPageSizeChange={() => setPage(1)}
          />
        )}
        empty={<PageState title="暂无符合条件的存储" description="调整筛选条件，或购买新的独立存储。" actionLabel="购买存储" onAction={() => navigate(APP_PATHS.storagePurchase)} />}
        renderRowActions={(space) => (
          <div className="management-row-actions">
            {canManageStorageFiles(space)
              ? <TextButton onClick={() => navigate(storageFilesPath(space.id))}>文件管理</TextButton>
              : !space.mounts.length
                ? <TextButton onClick={() => setDialog({ type: 'mount', space })}>挂载</TextButton>
                : null}
            <TextButton onClick={() => navigate(storageDetailPath(space.id))}>查看详情</TextButton>
            <DropdownMenu trigger={<span>更多</span>}>
              <DropdownMenuItem onSelect={() => setDialog({ type: 'expand', space })}>扩容</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog({ type: 'renew', space })}>续费</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void toggleAutoRenew(space)}>设置自动续费</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setDialog({ type: 'rename', space })}>修改名称</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate(`${APP_PATHS.storagePurchase}?type=${space.type}&tier=${space.performanceTier}`)}>购买同类型</DropdownMenuItem>
              <DropdownMenuItem danger onSelect={() => setDialog({ type: 'release', space })}>释放资源</DropdownMenuItem>
            </DropdownMenu>
          </div>
        )}
      />
      {feedback && <Toast title={feedback} onClose={() => setFeedback('')} />}
      <StorageActionDialog key={dialog ? `${dialog.type}-${dialog.space.id}` : 'closed'} dialog={dialog} onClose={() => setDialog(undefined)} onDone={(message) => { setDialog(undefined); setFeedback(message); setRevision((value) => value + 1); }} />
    </div>
  );
}

export function StorageDetailPage() {
  const { storageId = '' } = useParams();
  const navigate = useNavigate();
  const [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState<Dialog>();
  const [feedback, setFeedback] = useState('');
  void revision;
  const space = getStorageSpace(storageId);
  if (!space) {
    return <div className="management-page"><PageState tone="error" title="未找到存储" description="该存储可能不可用或地址不正确。" actionLabel="返回存储管理" onAction={() => navigate(APP_PATHS.storage)} /></div>;
  }
  const relatedOrders = queryOrders({}).filter((order) => order.resourceId === space.id);
  return (
    <div className="management-page">
      <Container className="management-detail-header">
        <TextButton onClick={() => navigate(APP_PATHS.storage)}>返回存储管理</TextButton>
        <div className="management-detail-header__main">
          <div><span>{typeLabel(space.type)} · {tierLabel(space)}</span><h2>{space.name}</h2><p>{space.id} · {space.site}</p></div>
          <StatusBadge tone={statusView(space.status).tone}>{statusView(space.status).label}</StatusBadge>
        </div>
        <div className="management-detail-actions">
          {canManageStorageFiles(space)
            ? <Button variant="primary" onClick={() => navigate(storageFilesPath(space.id))}>文件管理</Button>
            : <Button variant="primary" disabled title={space.type === 'cloud-disk' ? '请先挂载并初始化文件系统。' : '当前状态不可用。'}>文件管理</Button>}
          <Button onClick={() => setDialog({ type: 'mount', space })} disabled={space.type === 'cloud-disk' && space.mounts.length > 0}>挂载存储</Button>
          <Button onClick={() => setDialog({ type: 'expand', space })}>扩容存储</Button>
          <Button onClick={() => setDialog({ type: 'renew', space })}>续费存储</Button>
          <Button onClick={() => navigate(`${APP_PATHS.storagePurchase}?type=${space.type}&tier=${space.performanceTier}`)}>购买同类型</Button>
        </div>
      </Container>
      {feedback && <div className="management-feedback" role="status">{feedback}</div>}
      {!canManageStorageFiles(space) && space.type === 'cloud-disk' && (
        <div className="management-feedback">云硬盘需处于可用状态、已挂载并已初始化文件系统后才能管理文件。可先使用“挂载存储”。</div>
      )}
      <div className="management-detail-grid">
        <Container className="management-detail-section">
          <h2>容量与费用</h2>
          <UsageMeter
            className="storage-detail-usage"
            used={space.usedGb}
            total={space.capacityGb}
            label={`${space.name}容量使用率`}
            size="large"
          />
          <dl className="management-definition-grid">
            <div><dt>总容量</dt><dd>{space.capacityGb} GB</dd></div>
            <div><dt>已使用</dt><dd>{space.usedGb} GB</dd></div>
            <div><dt>剩余容量</dt><dd>{storageAvailableGb(space)} GB</dd></div>
            <div><dt>当前周期费用</dt><dd>{monthlyCost(space)}</dd></div>
            <div><dt>计费模式</dt><dd>包月容量</dd></div>
            <div><dt>到期时间</dt><dd>{formatDate(space.expiresAt)}</dd></div>
            <div><dt>自动续费</dt><dd>{space.autoRenew ? '已开启' : '未开启'}</dd></div>
            <div><dt>统一价格 SKU</dt><dd>{space.skuId}</dd></div>
          </dl>
        </Container>
        <Container className="management-detail-section">
          <h2>规格与文件系统</h2>
          <dl className="management-definition-grid">
            <div><dt>性能等级</dt><dd>{tierLabel(space)}</dd></div>
            <div><dt>文件系统</dt><dd>{space.fileSystem}</dd></div>
            <div><dt>协议</dt><dd>{space.protocol ?? '块设备'}</dd></div>
            <div><dt>设备名</dt><dd>{space.deviceName ?? '不适用'}</dd></div>
            <div><dt>IOPS</dt><dd>{space.iops.toLocaleString('zh-CN')}</dd></div>
            <div><dt>吞吐</dt><dd>{space.throughputMbs} MB/s</dd></div>
            <div><dt>文件数量</dt><dd>{space.fileCount}</dd></div>
            <div><dt>目录数量</dt><dd>{space.directoryCount}</dd></div>
          </dl>
        </Container>
        <Container className="management-detail-section management-detail-section--wide">
          <div className="management-results__header"><div><h2>挂载资源</h2><p>每个关系保留独立挂载路径和读写模式。</p></div><Button onClick={() => setDialog({ type: 'mount', space })} disabled={space.type === 'cloud-disk' && space.mounts.length > 0}>挂载存储</Button></div>
          {space.mounts.length ? (
            <div className="management-card-grid">
              {space.mounts.map((mount) => (
                <article className="management-card" key={mount.id}>
                  <span className="management-card__eyebrow">{mount.status === 'effective' ? '挂载关系有效' : mount.status === 'removing' ? '正在卸载' : '正在挂载'}</span>
                  <h3><Link to={resourceDetailPath(mount.resourceType, mount.resourceId)}>{mount.resourceName}</Link></h3>
                  <p>{mount.mountPath} · {mount.readOnly ? '只读' : '读写'}{mount.deviceName ? ` · ${mount.deviceName}` : ''}</p>
                  <Button onClick={() => setDialog({ type: 'unmount', space, mount })} disabled={mount.status !== 'effective'}>卸载存储</Button>
                </article>
              ))}
            </div>
          ) : <PageState title="暂未挂载" description="选择同站点适用资源并确认挂载。" actionLabel="挂载存储" onAction={() => setDialog({ type: 'mount', space })} />}
        </Container>
        <Container className="management-detail-section management-detail-section--wide">
          <div className="management-results__header"><div><h2>关联订单</h2><p>购买、扩容与续费订单保留各自的成交价格快照。</p></div><Link to={`${APP_PATHS.orders}?related=yes`}>查看全部订单</Link></div>
          {relatedOrders.length ? <ul className="management-record-list">{relatedOrders.slice(0, 5).map((order) => {
            const orderStatus = ORDER_STATUS_VIEWS[order.status];
            return <li key={order.id}><Link to={orderDetailPath(order.id)}>{order.id}</Link><StatusBadge tone={orderStatus.tone}>{orderStatus.label}</StatusBadge><p>{order.items[0]?.name ?? '存储服务'} · {formatMoney(order.pricingSnapshot.total)}</p></li>;
          })}</ul> : <p>暂无关联订单。</p>}
          <div className="management-related-links"><Link to={`${APP_PATHS.operationRecords}?target=${space.id}`}>查看操作记录</Link></div>
        </Container>
      </div>
      <StorageActionDialog key={dialog ? `${dialog.type}-${dialog.space.id}` : 'closed'} dialog={dialog} onClose={() => setDialog(undefined)} onDone={(message) => { setDialog(undefined); setFeedback(message); setRevision((value) => value + 1); }} />
    </div>
  );
}

function StorageActionDialog({ dialog, onClose, onDone }: Readonly<{ dialog?: Dialog; onClose: () => void; onDone: (message: string) => void }>) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [targetId, setTargetId] = useState('');
  const [mountPath, setMountPath] = useState('/data/storage');
  const [readOnly, setReadOnly] = useState('false');
  const [error, setError] = useState('');
  const targets = dialog ? listResources().filter((resource) => resource.site === dialog.space.site && (dialog.space.type === 'shared' || resource.resourceType === 'cloud-server')) : [];

  async function submit() {
    if (!dialog) return;
    setError('');
    try {
      if (dialog.type === 'rename') {
        await renameStorageSpace(dialog.space.id, value || dialog.space.name);
        onDone('存储名称已更新。');
      } else if (dialog.type === 'expand') {
        const order = await createStorageExpansionOrder(dialog.space.id, Number(value || dialog.space.capacityGb + 100));
        onDone(`扩容订单 ${order.id} 已创建。`);
        navigate(checkoutPath(order.id));
      } else if (dialog.type === 'renew') {
        const order = await createStorageRenewalOrder(dialog.space.id, Number(value || 1) as 1 | 3 | 6 | 12);
        onDone(`续费订单 ${order.id} 已创建。`);
        navigate(checkoutPath(order.id));
      } else if (dialog.type === 'mount') {
        const resource = targets.find((item) => item.id === targetId);
        if (!resource) throw new Error('请选择挂载资源。');
        await mountStorage(dialog.space.id, {
          resourceId: resource.id,
          resourceName: resource.name,
          resourceType: resource.resourceType,
          mountPath,
          deviceName: dialog.space.type === 'cloud-disk' ? '/dev/vdb' : undefined,
          readOnly: readOnly === 'true',
        });
        onDone('存储已挂载。');
      } else if (dialog.type === 'unmount') {
        await unmountStorage(dialog.space.id, dialog.mount.id);
        onDone('存储已卸载。');
      } else if (dialog.type === 'release') {
        await releaseStorage(dialog.space.id);
        onDone('资源已进入释放流程，完成前数据保持不变。');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '操作失败。');
    }
  }

  if (!dialog) return null;
  const title = dialog.type === 'rename' ? '修改存储名称'
    : dialog.type === 'expand' ? '扩容存储'
    : dialog.type === 'renew' ? '续费存储'
    : dialog.type === 'mount' ? '挂载存储'
    : dialog.type === 'unmount' ? '卸载存储'
    : '释放存储';
  const expansionCapacity = dialog.type === 'expand'
    ? Math.max(dialog.space.capacityGb + 1, Number(value) || dialog.space.capacityGb + 100)
    : 0;
  const expansionQuote = dialog.type === 'expand'
    ? createStoragePriceQuote(dialog.space, expansionCapacity - dialog.space.capacityGb)
    : undefined;
  const expandedMonthlyQuote = dialog.type === 'expand'
    ? createStoragePriceQuote(dialog.space, expansionCapacity)
    : undefined;
  const renewalMonths = dialog.type === 'renew'
    ? (Number(value || 1) as 1 | 3 | 6 | 12)
    : 1;
  const renewalQuote = dialog.type === 'renew'
    ? createStoragePriceQuote(dialog.space, dialog.space.capacityGb, renewalMonths)
    : undefined;
  const expectedExpiry = dialog.type === 'renew'
    ? (() => {
        const next = new Date(dialog.space.expiresAt);
        next.setUTCMonth(next.getUTCMonth() + renewalMonths);
        return next.toISOString();
      })()
    : '';
  return (
    <Modal open title={title} onClose={onClose} secondaryAction={{ label: '取消', onClick: onClose }} primaryAction={{ label: dialog.type === 'rename' ? '保存名称' : dialog.type === 'expand' || dialog.type === 'renew' ? '创建订单并支付' : dialog.type === 'mount' ? '确认挂载' : dialog.type === 'unmount' ? '确认卸载' : '确认释放', onClick: submit }}>
      <div className="storage-dialog-form">
        {dialog.type === 'rename' && <FormField id="storage-name" label="存储名称"><Input id="storage-name" value={value} placeholder={dialog.space.name} onChange={(event) => setValue(event.target.value)} /></FormField>}
        {dialog.type === 'expand' && <>
          <p>当前 {dialog.space.capacityGb} GB，已用 {dialog.space.usedGb} GB，可用 {storageAvailableGb(dialog.space)} GB。</p>
          <FormField id="storage-capacity" label="目标容量（GB）"><Input id="storage-capacity" type="number" min={dialog.space.capacityGb + 1} value={value} placeholder={String(dialog.space.capacityGb + 100)} onChange={(event) => setValue(event.target.value)} /></FormField>
          <dl className="storage-dialog-summary">
            <div><dt>增加容量</dt><dd>{expansionCapacity - dialog.space.capacityGb} GB</dd></div>
            <div><dt>新月度费用</dt><dd>{formatMoney(expandedMonthlyQuote!.total)}</dd></div>
            <div><dt>本次扩容费用</dt><dd>{formatMoney(expansionQuote!.total)}</dd></div>
          </dl>
          <p>支付完成后进入扩容流程；支付前不会改变当前容量。</p>
        </>}
        {dialog.type === 'renew' && <>
          <FormField id="storage-renew-period" label="续费周期"><Select id="storage-renew-period" value={value || '1'} onValueChange={setValue} options={[{ value: '1', label: '1 个月' }, { value: '3', label: '3 个月' }, { value: '6', label: '6 个月' }, { value: '12', label: '12 个月' }]} /></FormField>
          <dl className="storage-dialog-summary">
            <div><dt>当前到期时间</dt><dd>{formatDate(dialog.space.expiresAt)}</dd></div>
            <div><dt>预计新到期时间</dt><dd>{formatDate(expectedExpiry)}</dd></div>
            <div><dt>续费费用</dt><dd>{formatMoney(renewalQuote!.total)}</dd></div>
            <div><dt>自动续费</dt><dd>{dialog.space.autoRenew ? '已开启' : '未开启'}</dd></div>
          </dl>
        </>}
        {dialog.type === 'mount' && <>
          <FormField id="storage-target" label="目标资源"><Select id="storage-target" value={targetId} onValueChange={setTargetId} placeholder="请选择同站点资源" options={targets.map((resource) => ({ value: resource.id, label: `${resource.name} · ${resource.resourceType === 'cloud-server' ? '云服务器' : '物理机'}` }))} /></FormField>
          <FormField id="storage-mount-path" label="挂载路径"><Input id="storage-mount-path" value={mountPath} onChange={(event) => setMountPath(event.target.value)} /></FormField>
          <FormField id="storage-read-only" label="读写模式"><Select id="storage-read-only" value={readOnly} onValueChange={setReadOnly} options={[{ value: 'false', label: '读写' }, { value: 'true', label: '只读' }]} /></FormField>
        </>}
        {dialog.type === 'unmount' && <p>将从“{dialog.mount.resourceName}”卸载 {dialog.space.name}。操作执行期间当前关系仍会保留。</p>}
        {dialog.type === 'release' && <p>释放不会立即删除存储或文件。存在有效挂载关系时必须先卸载。</p>}
        {error && <p className="storage-dialog-error" role="alert">{error}</p>}
      </div>
    </Modal>
  );
}
