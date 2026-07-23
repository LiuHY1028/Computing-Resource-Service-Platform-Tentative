import {
  Button,
  EmptyTable,
  Table,
  TextButton,
  Tooltip,
  type TableColumn,
} from '../../../components/ui';
import {
  EXPIRY_STATE_LABELS,
  formatDate,
  formatIp,
  formatSpecification,
} from '../formatters';
import type { Resource, ResourceType } from '../types';
import { ResourceStatusBadge } from './ResourceStatusBadge';

type ResourceTableProps = Readonly<{
  resourceType: ResourceType;
  rows: readonly Resource[];
  loading: boolean;
  error?: string;
  catalogEmpty: boolean;
  onRetry: () => void;
  onResetFilters: () => void;
  onGoMarketplace: () => void;
  onViewDetails: (resource: Resource) => void;
  onConnection: (resource: Resource) => void;
  onMore: (resource: Resource) => void;
}>;

function TruncatedValue({
  value,
  className,
}: Readonly<{ value: string; className?: string }>) {
  return (
    <Tooltip content={value}>
      <span
        className={['resource-table__truncate', className]
          .filter(Boolean)
          .join(' ')}
        tabIndex={0}
      >
        {value}
      </span>
    </Tooltip>
  );
}

export function ResourceTable({
  resourceType,
  rows,
  loading,
  error,
  catalogEmpty,
  onRetry,
  onResetFilters,
  onGoMarketplace,
  onViewDetails,
  onConnection,
  onMore,
}: ResourceTableProps) {
  const columns: TableColumn<Resource>[] = [
    {
      key: 'name',
      title: '名称',
      multiline: true,
      render: (resource) => (
        <>
          <strong className="resource-table__name">{resource.name}</strong>
          <span className="resource-table__secondary">{resource.id}</span>
        </>
      ),
    },
    {
      key: 'site',
      title: '站点',
      render: (resource) => resource.site,
    },
    {
      key: 'specification',
      title: resourceType === 'cloud-server' ? '配置规格' : '整机配置',
      render: (resource) => (
        <TruncatedValue value={formatSpecification(resource)} />
      ),
    },
    {
      key: 'ip',
      title: 'IP',
      render: (resource) => (
        <TruncatedValue value={formatIp(resource)} className="resource-table__ip" />
      ),
    },
    {
      key: 'platform',
      title: resourceType === 'cloud-server' ? '镜像' : '操作系统',
      render: (resource) => (
        <TruncatedValue
          value={
            resource.resourceType === 'cloud-server'
              ? resource.image
              : resource.operatingSystem
          }
        />
      ),
    },
    {
      key: 'status',
      title: '运行状态',
      render: (resource) => <ResourceStatusBadge status={resource.status} />,
    },
    {
      key: 'createdAt',
      title: '创建时间',
      render: (resource) => formatDate(resource.createdAt),
    },
    {
      key: 'expiresAt',
      title: '到期时间',
      multiline: true,
      render: (resource) => (
        <>
          <span>{formatDate(resource.expiresAt)}</span>
          <span className="resource-table__secondary">
            {EXPIRY_STATE_LABELS[resource.expiryState]}
          </span>
        </>
      ),
    },
  ];

  return (
    <Table
      aria-label={resourceType === 'cloud-server' ? '云服务器列表' : '物理机列表'}
      className="resource-table"
      columns={columns}
      rows={rows}
      loading={loading}
      error={error}
      onRetry={onRetry}
      getRowKey={(resource) => resource.id}
      getRowLabel={(resource) => resource.name}
      empty={
        <EmptyTable
          title={catalogEmpty ? '暂无资源' : '没有匹配的资源'}
          description={
            catalogEmpty
              ? '当前资源类型下暂无可管理资源。'
              : '请调整搜索词或筛选条件后重试。'
          }
          action={
            catalogEmpty ? (
              <Button onClick={onGoMarketplace}>前往资源商城</Button>
            ) : (
              <Button onClick={onResetFilters}>重置筛选</Button>
            )
          }
        />
      }
      renderRowActions={(resource) => (
        <div className="resource-table__actions">
          <TextButton onClick={() => onViewDetails(resource)}>
            查看详情
          </TextButton>
          <TextButton onClick={() => onConnection(resource)}>
            连接信息
          </TextButton>
          <TextButton onClick={() => onMore(resource)}>更多操作</TextButton>
        </div>
      )}
    />
  );
}
