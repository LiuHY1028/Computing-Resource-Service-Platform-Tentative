import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  APP_PATHS,
  orderDetailPath,
  storageDetailPath,
  storageFilesPath,
} from '../../../app/routes';
import {
  Button,
  Container,
  DataTable,
  EmptyTable,
  getUsageState,
  Modal,
  StatusBadge,
  UsageMeter,
  type TableColumn,
} from '../../../components/ui';
import {
  getStorageMountsForResource,
  canManageStorageFiles,
  type StorageMount,
  type StorageSpace,
} from '../../storage';
import { getSoftwareForResource, type SoftwareInstallation } from '../../software';
import { getNetworkRulesForResource, type NetworkAccessRule } from '../../network';
import {
  APPLICATION_TYPE_LABELS,
  ORDER_STATUS_VIEWS,
  getOrdersForResource,
} from '../../orders';
import { getOperationsForTarget, type PlatformOperationRecord } from '../../operations';
import {
  formatHourlyPrice,
  formatMoney,
  formatMonthlyPrice,
  PricingSummary,
} from '../../pricing';
import {
  EXPIRY_STATE_LABELS,
  formatAccelerator,
  formatDateTime,
  OPERATION_STATUS_LABELS,
} from '../formatters';
import type { CloudDataDisk, Resource } from '../types';
import { ResourceStatusBadge } from './ResourceStatusBadge';
import { ResourceActionMenu, type ResourceMenuAction } from './ResourceTable';
import { createExtensionQuote, createRenewalQuote } from '../state/resourceStore';

function capacityStatus(percent: number) {
  const state = getUsageState(percent);
  return {
    ...state,
    badge: state.tone === 'critical' ? 'error' as const : state.tone === 'warning' ? 'warning' as const : 'success' as const,
  };
}

function DefinitionSection({ title, eyebrow, fields }: Readonly<{
  title: string;
  eyebrow: string;
  fields: readonly (readonly [string, ReactNode])[];
}>) {
  return (
    <Container as="section" className="resource-section">
      <div className="resource-section__heading"><div><span>{eyebrow}</span><h3>{title}</h3></div></div>
      <dl className="resource-definition-grid">
        {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
    </Container>
  );
}

export function ResourceOverview({ resource }: Readonly<{ resource: Resource }>) {
  const relatedOrders = getOrdersForResource(resource.id);
  const identity: readonly (readonly [string, ReactNode])[] = [
    [resource.resourceType === 'cloud-server' ? '实例 ID' : '资源 ID', resource.id],
    ['资源名称', resource.name],
    ['运行状态', <ResourceStatusBadge status={resource.status} />],
    [resource.resourceType === 'cloud-server' ? '实例健康' : '硬件健康', resource.health.summary],
    ['所属站点', resource.site],
    ['项目归属', resource.project],
    ['标签', resource.tags.join(' · ')],
    ['创建时间', formatDateTime(resource.createdAt)],
    [resource.resourceType === 'cloud-server' ? '到期时间' : '使用期限', formatDateTime(resource.expiresAt)],
    ['到期状态', EXPIRY_STATE_LABELS[resource.expiryState]],
  ];
  const specific: readonly (readonly [string, ReactNode])[] = resource.resourceType === 'cloud-server'
    ? [
        ['实例规格', `${resource.instanceSpec} · ${resource.vCpu} vCPU · ${resource.memoryGb} GB`],
        ['GPU', formatAccelerator(resource)],
        ['镜像', resource.image],
        ['操作系统', resource.operatingSystem],
        ['系统盘', `${resource.systemDiskGb} GB`],
        ['数据盘', `${resource.dataDisks.filter((disk) => disk.role === 'data').length} 个`],
        ['网络', `${resource.vpc} · ${resource.ip.privateIp}`],
        ['公网 IP', resource.ip.publicIp ?? '未分配'],
        ['计费模式', resource.billingMode === 'subscription' ? '包年包月' : '按量计费'],
        ['自动续费', resource.billingMode === 'subscription' ? (resource.autoRenewal.enabled ? `已开启 · ${resource.autoRenewal.periodMonths} 个月` : '未开启') : '不适用'],
      ]
    : [
        ['资产编号', resource.assetNumber],
        ['整机型号', resource.machineModel],
        ['CPU', `${resource.cpuModel} × ${resource.cpuSockets}`],
        ['内存', `${resource.memoryGb} GB`],
        ['GPU', formatAccelerator(resource)],
        ['本地存储', resource.storageSummary],
        ['物理位置', `${resource.room} · ${resource.rack} · ${resource.rackUnit}`],
        ['操作系统', resource.operatingSystem],
        ['主机名', resource.hostname],
        ['管理网络', resource.managementNetwork],
        ['业务网络', `${resource.businessNetwork} · ${resource.ip.privateIp}`],
        ['责任人', resource.owner],
      ];
  return (
    <div className="resource-detail-stack">
      <DefinitionSection eyebrow={resource.resourceType === 'cloud-server' ? '云实例身份' : '物理资产身份'} title="基础信息" fields={identity} />
      <DefinitionSection eyebrow={resource.resourceType === 'cloud-server' ? '虚拟化与云资源' : '整机硬件与位置'} title={resource.resourceType === 'cloud-server' ? '云服务器配置' : '物理机配置'} fields={specific} />
      <Container as="section" className="resource-section">
        <div className="resource-section__heading"><div><span>生命周期申请</span><h3>相关申请</h3></div></div>
        {relatedOrders.length ? <div className="management-related-links">{relatedOrders.map((order) => <Link to={orderDetailPath(order.id)} key={order.id}>{order.id} · {APPLICATION_TYPE_LABELS[order.applicationType]} · {ORDER_STATUS_VIEWS[order.status].label}</Link>)}</div> : <EmptyTable title="暂无相关申请" />}
      </Container>
    </div>
  );
}

export function ResourceBilling({
  resource,
  onLifecycle,
}: Readonly<{
  resource: Resource;
  onLifecycle: () => void;
}>) {
  const latestOrder = getOrdersForResource(resource.id)[0];
  const isCloud = resource.resourceType === 'cloud-server';
  const canRenew = isCloud ? resource.billingMode === 'subscription' : true;
  const latestQuote = canRenew
    ? isCloud
      ? createRenewalQuote(resource, 1)
      : createExtensionQuote(resource, 1)
    : undefined;
  const fields: readonly (readonly [string, ReactNode])[] = isCloud
    ? [
        ['计费模式', resource.billingMode === 'subscription' ? '包月' : '按量'],
        ['当前规格价格', resource.billingMode === 'subscription' ? formatMonthlyPrice(resource.priceSnapshot.unitPrice) : formatHourlyPrice(resource.priceSnapshot.unitPrice)],
        ['当前周期', resource.billingMode === 'subscription' ? `${resource.priceSnapshot.duration ?? 1} 个月` : '按实际使用时长'],
        ['当前周期费用', resource.billingMode === 'subscription' ? formatMoney(resource.priceSnapshot.total) : '按小时累计'],
        ['自动续费', resource.billingMode === 'subscription' ? (resource.autoRenewal.enabled ? `已开启 · ${resource.autoRenewal.periodMonths} 个月` : '未开启') : '不适用'],
        ['到期时间', resource.billingMode === 'subscription' ? formatDateTime(resource.expiresAt) : '不适用'],
        ['价格生成时间', formatDateTime(resource.priceSnapshot.generatedAt)],
        ['最近订单', latestOrder ? <Link to={orderDetailPath(latestOrder.id)}>{latestOrder.id}</Link> : '暂无'],
      ]
    : [
        ['月租价格', formatMonthlyPrice(resource.priceSnapshot.unitPrice)],
        ['当前使用周期', `${resource.priceSnapshot.duration ?? 1} 个月`],
        ['当前周期费用', formatMoney(resource.priceSnapshot.total)],
        ['到期时间', formatDateTime(resource.expiresAt)],
        ['延期状态', resource.extensionStatus === 'pending' ? '处理中' : '无待处理申请'],
        ['价格生成时间', formatDateTime(resource.priceSnapshot.generatedAt)],
        ['最近申请', latestOrder ? <Link to={orderDetailPath(latestOrder.id)}>{latestOrder.id}</Link> : '暂无'],
      ];
  return (
    <div className="resource-detail-stack">
      <DefinitionSection
        eyebrow={isCloud ? '价格快照与有效期' : '月租与使用期限'}
        title={isCloud ? '计费信息' : '费用与期限'}
        fields={fields}
      />
      {latestQuote && (
        <Container as="section" className="resource-section">
          <div className="resource-section__heading">
            <div><span>使用当前价目</span><h3>{isCloud ? '续费价格参考' : '延期价格参考'}</h3></div>
            <Button onClick={onLifecycle}>{isCloud ? '提交续费申请' : '提交延期申请'}</Button>
          </div>
          <PricingSummary value={latestQuote} title="1 个月费用参考" />
        </Container>
      )}
    </div>
  );
}

function DiskCapacity({ disk }: Readonly<{ disk: CloudDataDisk }>) {
  return (
    <div className="resource-capacity-cell">
      <UsageMeter used={disk.usedGb} total={disk.capacityGb} label={`${disk.name}容量使用率`} size="mini" />
    </div>
  );
}

export function ResourceStorage({ resource }: Readonly<{ resource: Resource }>) {
  const relations = getStorageMountsForResource(resource.id);
  if (resource.resourceType === 'physical-machine') {
    const storage = resource.localStorage;
    const percent = Math.round((storage.usedCapacityGb / storage.totalCapacityGb) * 100);
    const state = capacityStatus(percent);
    return (
      <div className="resource-detail-stack">
        <Container as="section" className="resource-section resource-capacity-overview">
          <div className="resource-section__heading"><div><span>整机本地存储</span><h3>容量与磁盘健康</h3></div><StatusBadge tone={state.badge}>{state.label}</StatusBadge></div>
          <div className="resource-capacity-metrics">
            <div><span>总容量</span><strong>{storage.totalCapacityGb} GB</strong></div>
            <div><span>已使用</span><strong>{storage.usedCapacityGb} GB</strong></div>
            <div><span>可用容量</span><strong>{storage.totalCapacityGb - storage.usedCapacityGb} GB</strong></div>
            <div><span>使用率</span><strong>{percent}%</strong></div>
          </div>
          <UsageMeter used={storage.usedCapacityGb} total={storage.totalCapacityGb} label="本地存储容量使用率" size="large" />
        </Container>
        <DefinitionSection eyebrow="物理磁盘与逻辑卷" title="本地存储配置" fields={[
          ['物理磁盘', `${storage.diskCount} 块 × ${storage.perDiskCapacityGb} GB`],
          ['RAID 级别', storage.raidLevel],
          ['磁盘健康', storage.health === 'normal' ? '正常' : '需要关注'],
          ['文件系统', storage.fileSystem],
          ['逻辑卷', storage.logicalVolume],
          ['挂载点', storage.mountPoint],
        ]} />
      </div>
    );
  }
  const diskColumns: readonly TableColumn<CloudDataDisk>[] = [
    { key: 'name', title: '磁盘', multiline: true, render: (disk) => <div className="resource-table__primary"><strong>{disk.name}</strong><span>{disk.id}</span><span>{disk.role === 'system' ? '系统盘' : '数据盘'}</span></div> },
    { key: 'type', title: '类型与挂载', multiline: true, render: (disk) => <div className="resource-table__primary"><strong>{disk.diskType}</strong><span>{disk.deviceName} · {disk.mountPath}</span><span>{disk.fileSystem} · {disk.readOnly ? '只读' : '读写'}</span></div> },
    { key: 'capacity', title: '容量使用', multiline: true, render: (disk) => <DiskCapacity disk={disk} /> },
    { key: 'lifecycle', title: '状态与期限', multiline: true, render: (disk) => <div className="resource-table__primary"><strong>{disk.status === 'warning' ? '需要关注' : '使用中'}</strong><span>{disk.releaseWithInstance ? '随实例释放' : '独立保留'}</span><span>{formatDateTime(disk.expiresAt)}</span></div> },
    { key: 'performance', title: '性能指标', multiline: true, render: (disk) => <div className="resource-table__primary"><span>读/写 {disk.performance.readThroughputMbs}/{disk.performance.writeThroughputMbs} MB/s</span><span>IOPS {disk.performance.readIops}/{disk.performance.writeIops}</span><span>平均时延 {disk.performance.averageLatencyMs} ms</span></div> },
  ];
  const sharedColumns: readonly TableColumn<{ space: StorageSpace; mount: StorageMount }>[] = [
    { key: 'name', title: '外挂存储', multiline: true, render: ({ space }) => <div className="resource-table__primary"><Link to={storageDetailPath(space.id)}>{space.name}</Link><span>{space.type === 'cloud-disk' ? '云硬盘' : '高性能共享存储'} · {space.id}</span>{canManageStorageFiles(space) && <Link to={storageFilesPath(space.id)}>文件管理</Link>}</div> },
    { key: 'capacity', title: '容量', multiline: true, render: ({ space }) => {
      return <div className="resource-capacity-cell"><UsageMeter used={space.usedGb} total={space.capacityGb} label={`${space.name}容量使用率`} size="mini" /></div>;
    } },
    { key: 'access', title: '访问', multiline: true, render: ({ space, mount }) => <div className="resource-table__primary"><strong>{space.protocol}</strong><span>{mount.mountPath}</span><span>{mount.readOnly ? '只读' : '读写'}</span></div> },
    { key: 'expiry', title: '到期时间', render: ({ space }) => formatDateTime(space.expiresAt) },
  ];
  return (
    <div className="resource-detail-stack">
      <Container as="section" className="resource-section">
        <div className="resource-section__heading"><div><span>系统盘与数据盘</span><h3>云服务器磁盘</h3></div></div>
        <DataTable title="云服务器磁盘" embedded enableDensity={false} enableColumnSettings={false} aria-label="云服务器磁盘" columns={diskColumns} rows={resource.dataDisks} getRowKey={(disk) => disk.id} />
      </Container>
      <Container as="section" className="resource-section">
        <div className="resource-section__heading"><div><span>独立购买与挂载</span><h3>外挂存储</h3></div><div className="management-row-actions"><Link to={`${APP_PATHS.storagePurchase}?mount=${resource.id}&site=${encodeURIComponent(resource.site)}`}>购买并挂载存储</Link><Link to={`${APP_PATHS.storage}?mounted=no&site=${encodeURIComponent(resource.site)}`}>挂载已有存储</Link></div></div>
        <DataTable title="关联存储空间" embedded enableDensity={false} enableColumnSettings={false} aria-label="关联存储空间" columns={sharedColumns} rows={relations} getRowKey={({ mount }) => mount.id} empty={<EmptyTable title="尚未挂载独立存储，可购买或选择已有存储" />} />
      </Container>
    </div>
  );
}

export function ResourceHealth({ resource }: Readonly<{ resource: Resource }>) {
  const columns: readonly TableColumn<Resource['health']['items'][number]>[] = [
    { key: 'name', title: '检查项', render: (item) => item.name },
    { key: 'status', title: '状态', render: (item) => <StatusBadge tone={item.status === 'normal' ? 'success' : item.status === 'warning' ? 'warning' : 'info'}>{item.status === 'normal' ? '正常' : item.status === 'warning' ? '告警' : '检查中'}</StatusBadge> },
    { key: 'message', title: '说明', render: (item) => item.message },
  ];
  return <Container as="section" className="resource-section"><div className="resource-section__heading"><div><span>{resource.resourceType === 'cloud-server' ? '实例检查' : 'CPU、内存、GPU、磁盘、电源与温度'}</span><h3>{resource.resourceType === 'cloud-server' ? '实例健康' : '硬件与健康'}</h3></div></div><DataTable title="健康检查项" embedded enableDensity={false} enableColumnSettings={false} aria-label="健康检查项" columns={columns} rows={resource.health.items} getRowKey={(item) => item.name} /></Container>;
}

export function ResourceImageSystem({ resource }: Readonly<{ resource: Resource }>) {
  if (resource.resourceType !== 'cloud-server') return null;
  return <DefinitionSection eyebrow="镜像与启动系统" title="镜像和操作系统" fields={[
    ['镜像名称', resource.image],
    ['镜像 ID', <Link to={`${APP_PATHS.images}?resource=${resource.id}`}>{resource.imageId}</Link>],
    ['操作系统', resource.operatingSystem],
    ['SSH', resource.sshEnabled ? '已启用' : '未启用'],
    ['系统盘', `${resource.systemDiskGb} GB`],
  ]} />;
}

export function ResourceDelivery({ resource }: Readonly<{ resource: Resource }>) {
  if (resource.resourceType !== 'physical-machine') return null;
  return <DefinitionSection eyebrow="交付与带外管理" title="交付和管理网络" fields={[
    ['交付状态', resource.deliveryStatus === 'delivered' ? '已交付' : resource.deliveryStatus === 'preparing' ? '准备中' : '释放处理中'],
    ['资产编号', resource.assetNumber],
    ['物理位置', `${resource.room} · ${resource.rack} · ${resource.rackUnit}`],
    ['管理网络', resource.managementNetwork],
    ['业务网络', resource.businessNetwork],
    ['BMC/IPMI 授权', resource.bmcAccess === 'authorized' ? '已授权' : resource.bmcAccess === 'restricted' ? '受限' : '未提供'],
    ['认证方式', resource.connection.authenticationMethod ?? '资源就绪后提供'],
  ]} />;
}

export function ResourceNetwork({ resource, connectionContent }: Readonly<{ resource: Resource; connectionContent: ReactNode }>) {
  const [selectedRule, setSelectedRule] = useState<NetworkAccessRule>();
  const rules = getNetworkRulesForResource(resource.id);
  const columns: readonly TableColumn<NetworkAccessRule>[] = [
    { key: 'name', title: '规则名称', render: (rule) => rule.description || '端口访问规则' },
    { key: 'protocol', title: '协议', render: (rule) => rule.protocol },
    { key: 'mapping', title: '端口映射', render: (rule) => `${rule.servicePort} → ${rule.mappedPort}` },
    { key: 'source', title: '允许来源', render: (rule) => rule.source },
    { key: 'status', title: '状态', render: (rule) => rule.status === 'effective' ? '已生效' : rule.status === 'failed' ? '失败' : '处理中' },
  ];
  return (
    <div className="resource-detail-stack">
      {connectionContent}
      <Container as="section" className="resource-section">
        <div className="resource-section__heading"><div><span>端口与来源</span><h3>访问规则</h3></div><Link to={`${APP_PATHS.networkAccess}?resource=${resource.id}`}>进入网络管理</Link></div>
        <DataTable title="网络访问规则" embedded enableDensity={false} enableColumnSettings={false} aria-label="网络访问规则" columns={columns} rows={rules} getRowKey={(rule) => rule.id} renderRowActions={(rule) => <Button variant="ghost" onClick={() => setSelectedRule(rule)}>查看</Button>} empty={<EmptyTable title="暂无访问规则" />} />
      </Container>
      <Modal open={Boolean(selectedRule)} title="访问规则详情" onClose={() => setSelectedRule(undefined)} primaryAction={{ label: '关闭', onClick: () => setSelectedRule(undefined) }}>
        {selectedRule && <dl className="resource-modal-definition"><div><dt>规则名称</dt><dd>{selectedRule.description}</dd></div><div><dt>协议</dt><dd>{selectedRule.protocol}</dd></div><div><dt>服务端口</dt><dd>{selectedRule.servicePort}</dd></div><div><dt>映射端口</dt><dd>{selectedRule.mappedPort}</dd></div><div><dt>允许来源</dt><dd>{selectedRule.source}</dd></div></dl>}
      </Modal>
    </div>
  );
}

export function ResourceSoftware({ resourceId, onOpenSoftwareCenter }: Readonly<{ resourceId: string; onOpenSoftwareCenter: () => void }>) {
  const software = getSoftwareForResource(resourceId);
  const columns: readonly TableColumn<SoftwareInstallation>[] = [
    { key: 'name', title: '软件', render: (item) => item.softwareName },
    { key: 'version', title: '版本', render: (item) => item.version },
    { key: 'status', title: '状态', render: (item) => item.status === 'installed' ? '已安装' : item.status === 'failed' ? '失败' : '处理中' },
    { key: 'installedAt', title: '安装时间', render: (item) => formatDateTime(item.submittedAt) },
  ];
  return <Container as="section" className="resource-section"><div className="resource-section__heading"><div><span>软件与运行环境</span><h3>已安装软件</h3></div><Button onClick={onOpenSoftwareCenter}>前往软件中心</Button></div><DataTable title="已安装软件列表" embedded enableDensity={false} enableColumnSettings={false} aria-label="已安装软件列表" columns={columns} rows={software} getRowKey={(item) => item.id} /></Container>;
}

export function ResourceOperations({ resourceId }: Readonly<{ resourceId: string }>) {
  const records = getOperationsForTarget(resourceId);
  const columns: readonly TableColumn<PlatformOperationRecord>[] = [
    { key: 'action', title: '操作类型', render: (record) => record.action },
    { key: 'actor', title: '操作主体', render: (record) => record.actor },
    { key: 'createdAt', title: '操作时间', render: (record) => formatDateTime(record.createdAt) },
    { key: 'status', title: '执行状态', render: (record) => OPERATION_STATUS_LABELS[record.status] },
    { key: 'message', title: '结果说明', render: (record) => record.message },
  ];
  return <Container as="section" className="resource-section"><div className="resource-section__heading"><div><span>资源变更追踪</span><h3>操作记录</h3></div><Link to={`${APP_PATHS.operationRecords}?q=${resourceId}`}>查看全部记录</Link></div><DataTable title="资源操作记录" embedded enableDensity={false} enableColumnSettings={false} aria-label="资源操作记录" columns={columns} rows={records} getRowKey={(record) => record.id} /></Container>;
}

export function ResourceDetailHeader({ resource, onBack, onConnection, onPurchaseSimilar, onAction }: Readonly<{
  resource: Resource;
  onBack: () => void;
  onConnection: () => void;
  onPurchaseSimilar: () => void;
  onAction: (action: ResourceMenuAction) => void;
}>) {
  const isRunning = resource.status === 'running';
  return (
    <Container as="section" className="resource-detail-header">
      <div className="resource-detail-header__navigation"><Button variant="ghost" onClick={onBack}>返回资源列表</Button></div>
      <div className="resource-detail-header__main">
        <div><span>{resource.resourceType === 'cloud-server' ? '☁ 云服务器' : '▤ 物理机资产'}</span><h2>{resource.name}</h2><p>{resource.resourceType === 'physical-machine' ? resource.assetNumber : resource.id} · {resource.site} · {resource.project}</p></div>
        <div className="resource-detail-header__actions">
          <ResourceStatusBadge status={resource.status} />
          <StatusBadge tone={resource.health.status === 'normal' ? 'success' : resource.health.status === 'warning' ? 'warning' : 'info'}>{resource.health.status === 'normal' ? '健康正常' : resource.health.status === 'warning' ? '健康告警' : '健康检查中'}</StatusBadge>
          <Button variant="primary" onClick={onPurchaseSimilar}>{resource.resourceType === 'cloud-server' ? '购买同规格' : '购买同类整机'}</Button>
          {resource.resourceType === 'cloud-server'
            ? <Button variant="secondary" onClick={() => onAction('configuration-change')}>变更配置</Button>
            : <Button variant="secondary" onClick={() => onAction('hardware-health')}>硬件健康</Button>}
          <Button variant="secondary" onClick={onConnection}>{resource.resourceType === 'cloud-server' ? '连接' : '连接信息'}</Button>
          <Button variant="secondary" onClick={() => onAction(resource.resourceType === 'cloud-server' ? 'renew' : 'extend')}>{resource.resourceType === 'cloud-server' ? '续费' : '申请延期'}</Button>
          <Button onClick={() => onAction(isRunning ? 'stop' : 'start')}>{isRunning ? (resource.resourceType === 'cloud-server' ? '停止' : '关机') : '启动'}</Button>
          <ResourceActionMenu resource={resource} onAction={(_, action) => onAction(action)} />
        </div>
      </div>
    </Container>
  );
}
