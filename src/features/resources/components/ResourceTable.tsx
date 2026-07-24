import {
  Button,
  DropdownMenu,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  EmptyTable,
  StatusBadge,
  Table,
  TextButton,
  Tooltip,
  type TableColumn,
  type TableKey,
} from '../../../components/ui';
import {
  getExtensionAvailability,
  getRenewalAvailability,
  getResourceActionAvailability,
} from '../state/resourceStore';
import {
  EXPIRY_STATE_LABELS,
  formatDate,
  formatAccelerator,
} from '../formatters';
import type { HealthStatus, Resource, ResourceAction, ResourceType } from '../types';
import {
  formatHourlyPrice,
  formatMoney,
  formatMonthlyPrice,
} from '../../pricing';
import { ResourceStatusBadge } from './ResourceStatusBadge';

export type ResourceMenuAction =
  | ResourceAction
  | 'details'
  | 'renew'
  | 'auto-renew'
  | 'extend'
  | 'metadata'
  | 'configuration-change'
  | 'os-reinstall'
  | 'storage'
  | 'network'
  | 'monitoring'
  | 'operations'
  | 'image'
  | 'hardware-health'
  | 'bmc';

type ResourceTableProps = Readonly<{
  resourceType: ResourceType;
  rows: readonly Resource[];
  loading: boolean;
  error?: string;
  catalogEmpty: boolean;
  selectedKeys: readonly TableKey[];
  density: 'compact' | 'standard' | 'comfortable';
  visibleOptionalColumns: readonly string[];
  onSelectionChange: (keys: TableKey[]) => void;
  onRetry: () => void;
  onResetFilters: () => void;
  onGoMarketplace: () => void;
  onConnection: (resource: Resource) => void;
  onAction: (resource: Resource, action: ResourceMenuAction) => void;
}>;

const HEALTH: Readonly<Record<HealthStatus, { label: string; tone: 'success' | 'warning' | 'info' }>> = {
  normal: { label: '正常', tone: 'success' },
  warning: { label: '告警', tone: 'warning' },
  checking: { label: '检查中', tone: 'info' },
};

function expiryText(resource: Resource) {
  const days = Math.ceil((new Date(resource.expiresAt).getTime() - Date.now()) / 86_400_000);
  if (resource.expiryState === 'expired') return `已到期 ${Math.abs(days)} 天`;
  return days <= 30 ? `剩余 ${Math.max(0, days)} 天` : EXPIRY_STATE_LABELS[resource.expiryState];
}

function Truncated({ value }: Readonly<{ value: string }>) {
  return <Tooltip content={value}><span className="resource-table__truncate" tabIndex={0}>{value}</span></Tooltip>;
}

function statusCell(resource: Resource) {
  const health = HEALTH[resource.health.status];
  return (
    <div className="resource-table__status-stack">
      <ResourceStatusBadge status={resource.status} />
      <StatusBadge tone={health.tone}>{health.label}</StatusBadge>
    </div>
  );
}

export function ResourceActionMenu({ resource, onAction }: Readonly<{ resource: Resource; onAction: ResourceTableProps['onAction'] }>) {
  const actionItem = (action: ResourceAction, label: string, danger = false) => {
    const availability = getResourceActionAvailability(resource, action);
    return (
      <DropdownMenuItem
        disabled={!availability.enabled}
        title={availability.reason}
        danger={danger}
        onSelect={() => onAction(resource, action)}
      >
        {label}
      </DropdownMenuItem>
    );
  };
  if (resource.resourceType === 'cloud-server') {
    const renewal = getRenewalAvailability(resource);
    return (
      <DropdownMenu trigger="更多" aria-label={`${resource.name}更多操作`}>
        <DropdownMenuGroup label="实例操作">
          <DropdownMenuItem onSelect={() => onAction(resource, 'details')}>查看详情</DropdownMenuItem>
          {actionItem('start', '启动')}
          {actionItem('stop', '停止')}
          {actionItem('restart', '重启')}
          {actionItem('rename', '修改名称')}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup label="配置与运维">
          <DropdownMenuItem disabled={!renewal.enabled} title={renewal.reason} onSelect={() => onAction(resource, 'renew')}>续费</DropdownMenuItem>
          <DropdownMenuItem disabled={!renewal.enabled} title={renewal.reason} onSelect={() => onAction(resource, 'auto-renew')}>自动续费设置</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction(resource, 'configuration-change')}>变更配置</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction(resource, 'os-reinstall')}>重装系统</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction(resource, 'image')}>制作镜像</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction(resource, 'storage')}>存储管理</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction(resource, 'network')}>网络与访问</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction(resource, 'monitoring')}>查看监控</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup label="管理">
          <DropdownMenuItem onSelect={() => onAction(resource, 'metadata')}>标签或项目管理</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onAction(resource, 'operations')}>查看操作记录</DropdownMenuItem>
          {actionItem('release', '释放资源', true)}
        </DropdownMenuGroup>
      </DropdownMenu>
    );
  }
  const extension = getExtensionAvailability(resource);
  return (
    <DropdownMenu trigger="更多" aria-label={`${resource.name}更多操作`}>
      <DropdownMenuGroup label="电源与运维">
        <DropdownMenuItem onSelect={() => onAction(resource, 'details')}>查看详情</DropdownMenuItem>
        {actionItem('start', '启动')}
        {actionItem('stop', '关机')}
        {actionItem('restart', '重启')}
        {actionItem('rename', '修改名称')}
        <DropdownMenuItem onSelect={() => onAction(resource, 'hardware-health')}>查看硬件健康</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup label="交付与管理">
        <DropdownMenuItem disabled={!extension.enabled} title={extension.reason} onSelect={() => onAction(resource, 'extend')}>申请延期</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction(resource, 'os-reinstall')}>重装系统申请</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction(resource, 'network')}>网络与访问</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction(resource, 'storage')}>本地存储</DropdownMenuItem>
        <DropdownMenuItem disabled={resource.bmcAccess !== 'authorized'} title={resource.bmcAccess !== 'authorized' ? '当前资源未获得带外管理授权。' : undefined} onSelect={() => onAction(resource, 'bmc')}>带外管理</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction(resource, 'monitoring')}>查看监控</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction(resource, 'operations')}>查看操作记录</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup label="管理">
        <DropdownMenuItem onSelect={() => onAction(resource, 'metadata')}>项目或责任人</DropdownMenuItem>
        {actionItem('release', '释放申请', true)}
      </DropdownMenuGroup>
    </DropdownMenu>
  );
}

function cloudCoreColumns(): TableColumn<Resource>[] {
  return [
    { key: 'resource', title: '资源', width: '14%', multiline: true, render: (resource) => <div className="resource-table__primary"><Truncated value={resource.name} /><span>{resource.id}</span><span>{resource.project || resource.tags[0]}</span></div> },
    { key: 'status', title: '状态', width: '9%', multiline: true, render: statusCell },
    { key: 'specification', title: '规格', width: '14%', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><strong>{resource.vCpu} vCPU · {resource.memoryGb} GB</strong>{resource.accelerator && <span>{formatAccelerator(resource)}</span>}<span>{resource.instanceSpec}</span></div> },
    { key: 'system-network', title: '系统与网络', width: '18%', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><Truncated value={resource.operatingSystem || resource.image} /><span>内网 {resource.ip.privateIp}</span><span>{resource.ip.publicIp ? `公网 ${resource.ip.publicIp}` : '公网 IP 未分配'}</span></div> },
    { key: 'billing-expiry', title: '计费与到期', width: '23%', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><strong>{resource.billingMode === 'subscription' ? `包月 · ${formatMonthlyPrice(resource.priceSnapshot.unitPrice)}` : `按量 · ${formatHourlyPrice(resource.priceSnapshot.unitPrice)}`}</strong><span>{resource.billingMode === 'subscription' ? `当前周期 ${formatMoney(resource.priceSnapshot.total)} · ${formatDate(resource.expiresAt)}` : '按实际使用时长计费'}</span>{resource.billingMode === 'subscription' && <span>{resource.autoRenewal.enabled ? `自动续费 ${resource.autoRenewal.periodMonths} 个月` : '自动续费未开启'} · {expiryText(resource)}</span>}{resource.lifecycleRequestState === 'renewal-processing' && <StatusBadge tone="info">续费处理中</StatusBadge>}</div> },
  ];
}

function physicalCoreColumns(): TableColumn<Resource>[] {
  return [
    { key: 'resource', title: '资源', width: '14%', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><Truncated value={resource.name} /><span>{resource.assetNumber}</span><span>{resource.project || resource.owner}</span></div> },
    { key: 'status', title: '状态', width: '9%', multiline: true, render: statusCell },
    { key: 'hardware', title: '整机配置', width: '19%', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><Truncated value={`${resource.cpuModel} × ${resource.cpuSockets}`} /><span>{resource.memoryGb} GB 内存{resource.accelerator ? ` · ${formatAccelerator(resource)}` : ''}</span><span>{resource.storageSummary}</span></div> },
    { key: 'location-network', title: '位置与网络', width: '17%', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><strong>{resource.site}</strong><span>{resource.room} · {resource.rack} · {resource.rackUnit}</span><span>{resource.hostname || resource.ip.privateIp}</span></div> },
    { key: 'fee-term', title: '费用与期限', width: '19%', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><strong>按月租用 · {formatMonthlyPrice(resource.priceSnapshot.unitPrice)}</strong><span>当前周期 {formatMoney(resource.priceSnapshot.total)}</span><span>{formatDate(resource.expiresAt)} · {expiryText(resource)}</span>{resource.lifecycleRequestState === 'extension-processing' && <StatusBadge tone="info">延期处理中</StatusBadge>}</div> },
  ];
}

function extensionColumns(resourceType: ResourceType): TableColumn<Resource>[] {
  if (resourceType === 'cloud-server') {
    return [
      { key: 'image-full', title: '镜像完整信息', width: '190px', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><Truncated value={resource.image} /><span>{resource.imageId}</span></div> },
      { key: 'system-disk', title: '系统盘', width: '150px', render: (resource) => resource.resourceType === 'cloud-server' ? `${resource.systemDiskGb} GB` : '' },
      { key: 'data-disks', title: '数据盘', width: '180px', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><strong>{resource.dataDisks.filter((disk) => disk.role === 'data').length} 块</strong><span>{resource.dataDisks.filter((disk) => disk.role === 'data').map((disk) => `${disk.capacityGb} GB`).join(' · ') || '未挂载'}</span></div> },
      { key: 'network-type', title: '网络类型', width: '170px', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><strong>{resource.vpc}</strong><span>{resource.sshEnabled ? '远程连接已开启' : '远程连接未开启'}</span></div> },
      { key: 'created-at', title: '创建时间', width: '160px', render: (resource) => formatDate(resource.createdAt) },
      { key: 'owner', title: '责任人', width: '140px', render: (resource) => resource.owner },
      { key: 'tags', title: '标签', width: '180px', render: (resource) => resource.tags.join(' · ') },
      { key: 'last-operated-at', title: '最近操作时间', width: '160px', render: (resource) => formatDate(resource.lastOperatedAt) },
    ];
  }
  return [
    { key: 'operating-system', title: '操作系统', width: '190px', render: (resource) => resource.resourceType === 'physical-machine' && <Truncated value={resource.operatingSystem} /> },
    { key: 'hostname', title: '主机名', width: '160px', render: (resource) => resource.resourceType === 'physical-machine' ? resource.hostname : '' },
    { key: 'bmc-status', title: 'BMC 状态', width: '150px', render: (resource) => resource.resourceType === 'physical-machine' ? ({ authorized: '已授权', restricted: '受限', 'not-provided': '未提供' }[resource.bmcAccess]) : '' },
    { key: 'management-network', title: '管理网络', width: '180px', render: (resource) => resource.resourceType === 'physical-machine' ? resource.managementNetwork : '' },
    { key: 'business-network', title: '业务网络', width: '180px', render: (resource) => resource.resourceType === 'physical-machine' ? resource.businessNetwork : '' },
    { key: 'raid', title: 'RAID', width: '130px', render: (resource) => resource.resourceType === 'physical-machine' ? resource.localStorage.raidLevel : '' },
    { key: 'created-at', title: '创建时间', width: '160px', render: (resource) => formatDate(resource.createdAt) },
    { key: 'tags', title: '标签', width: '180px', render: (resource) => resource.tags.join(' · ') },
    { key: 'last-operated-at', title: '最近操作时间', width: '160px', render: (resource) => formatDate(resource.lastOperatedAt) },
  ];
}

export function ResourceTable(props: ResourceTableProps) {
  const core = props.resourceType === 'cloud-server' ? cloudCoreColumns() : physicalCoreColumns();
  const extensions = extensionColumns(props.resourceType)
    .filter((column) => props.visibleOptionalColumns.includes(column.key));
  const hasExtensions = extensions.length > 0;
  const columns = [...core, ...extensions];
  return (
    <Table
      aria-label={props.resourceType === 'cloud-server' ? '云服务器列表' : '物理机列表'}
      className="resource-table"
      columns={columns}
      layout="fixed"
      minWidth={hasExtensions ? `${1000 + extensions.length * 170}px` : '0'}
      overflow={hasExtensions ? 'auto' : 'clip'}
      actionsWidth="128px"
      rows={props.rows}
      loading={props.loading}
      error={props.error}
      onRetry={props.onRetry}
      selectable
      selectedKeys={props.selectedKeys}
      density={props.density}
      onSelectionChange={props.onSelectionChange}
      getRowKey={(resource) => resource.id}
      getRowLabel={(resource) => resource.name}
      empty={<EmptyTable title={props.catalogEmpty ? '暂无资源' : '没有匹配的资源'} description={props.catalogEmpty ? '当前资源类型下暂无可管理资源。' : '请调整搜索词或筛选条件后重试。'} action={props.catalogEmpty ? <Button onClick={props.onGoMarketplace}>前往资源商城</Button> : <Button onClick={props.onResetFilters}>重置筛选</Button>} />}
      renderRowActions={(resource) => (
        <div className="resource-table__actions">
          <TextButton onClick={() => props.onConnection(resource)}>
            {resource.resourceType === 'cloud-server' ? '连接' : '连接信息'}
          </TextButton>
          <ResourceActionMenu resource={resource} onAction={props.onAction} />
        </div>
      )}
    />
  );
}
