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

function cloudColumns(): TableColumn<Resource>[] {
  return [
    { key: 'name', title: '名称与实例 ID', multiline: true, render: (resource) => <div className="resource-table__primary"><strong>{resource.name}</strong><span>{resource.id}</span></div> },
    { key: 'status', title: '状态与健康', multiline: true, render: statusCell },
    { key: 'specification', title: '实例规格', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><strong>{resource.vCpu} vCPU · {resource.memoryGb} GB</strong><span>{formatAccelerator(resource)}</span><span>{resource.instanceSpec}</span></div> },
    { key: 'platform', title: '镜像与系统', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><Truncated value={resource.image} /><span>{resource.operatingSystem}</span></div> },
    { key: 'network', title: 'IP 与网络', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><span>内网 {resource.ip.privateIp}</span><span>{resource.ip.publicIp ? `公网 ${resource.ip.publicIp}` : '未分配公网 IP'}</span><span>{resource.vpc}</span></div> },
    { key: 'billing', title: '计费模式', multiline: true, render: (resource) => resource.resourceType === 'cloud-server' && <div className="resource-table__primary"><strong>{resource.billingMode === 'subscription' ? '包年包月' : '按量计费'}</strong><span>{resource.billingMode === 'subscription' ? (resource.autoRenewal.enabled ? `自动续费 ${resource.autoRenewal.periodMonths} 个月` : '自动续费未开启') : '无需续费'}</span></div> },
    { key: 'expiry', title: '到期时间', multiline: true, render: (resource) => <div className="resource-table__primary"><strong>{formatDate(resource.expiresAt)}</strong><span>{expiryText(resource)}</span>{resource.lifecycleRequestState === 'renewal-processing' && <StatusBadge tone="info">续费处理中</StatusBadge>}</div> },
    { key: 'scope', title: '项目与标签', multiline: true, render: (resource) => <div className="resource-table__primary"><strong>{resource.project}</strong><span>{resource.tags.join(' · ')}</span></div> },
  ];
}

function physicalColumns(): TableColumn<Resource>[] {
  return [
    { key: 'name', title: '名称与资产编号', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><strong>{resource.name}</strong><span>{resource.assetNumber}</span><span>{resource.id}</span></div> },
    { key: 'status', title: '状态与硬件健康', multiline: true, render: statusCell },
    { key: 'hardware', title: '整机配置', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><strong>{resource.cpuModel} × {resource.cpuSockets}</strong><span>{resource.memoryGb} GB 内存</span><span>{formatAccelerator(resource)}</span><span>{resource.storageSummary}</span></div> },
    { key: 'location', title: '物理位置', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><strong>{resource.site}</strong><span>{resource.room} · {resource.rack} · {resource.rackUnit}</span></div> },
    { key: 'platform', title: '系统与主机名', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><Truncated value={resource.operatingSystem} /><span>{resource.hostname}</span></div> },
    { key: 'network', title: '网络', multiline: true, render: (resource) => resource.resourceType === 'physical-machine' && <div className="resource-table__primary"><span>管理 {resource.managementNetwork}</span><span>业务 {resource.ip.privateIp}</span><span>{resource.ip.publicIp ? `公网 ${resource.ip.publicIp}` : '未分配公网 IP'}</span></div> },
    { key: 'expiry', title: '使用期限', multiline: true, render: (resource) => <div className="resource-table__primary"><strong>{formatDate(resource.expiresAt)}</strong><span>{expiryText(resource)}</span>{resource.lifecycleRequestState === 'extension-processing' && <StatusBadge tone="info">延期申请处理中</StatusBadge>}</div> },
    { key: 'scope', title: '项目与责任人', multiline: true, render: (resource) => <div className="resource-table__primary"><strong>{resource.project}</strong><span>{resource.owner}</span></div> },
  ];
}

export function ResourceTable(props: ResourceTableProps) {
  const columns = (props.resourceType === 'cloud-server' ? cloudColumns() : physicalColumns())
    .filter((column) => ['name', 'status'].includes(column.key) || props.visibleOptionalColumns.includes(column.key));
  return (
    <Table
      aria-label={props.resourceType === 'cloud-server' ? '云服务器列表' : '物理机列表'}
      className="resource-table"
      columns={columns}
      rows={props.rows}
      loading={props.loading}
      error={props.error}
      onRetry={props.onRetry}
      selectable
      selectedKeys={props.selectedKeys}
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
