import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Button,
  Container,
  EmptyTable,
  Modal,
  Table,
  type TableColumn,
} from '../../../components/ui';
import {
  getStorageMountsForResource,
  type StorageMount,
  type StorageSpace,
} from '../../storage';
import {
  COMPUTE_TYPE_LABELS,
  EXPIRY_STATE_LABELS,
  formatAccelerator,
  formatDateTime,
  OPERATION_STATUS_LABELS,
} from '../formatters';
import type {
  InstalledSoftware,
  OperationRecord,
  PortRule,
  Resource,
} from '../types';
import { ResourceStatusBadge } from './ResourceStatusBadge';

function DefinitionSection({
  title,
  eyebrow,
  fields,
}: Readonly<{
  title: string;
  eyebrow: string;
  fields: readonly (readonly [string, string])[];
}>) {
  return (
    <Container as="section" className="resource-section">
      <div className="resource-section__heading">
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>
      </div>
      <dl className="resource-definition-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </Container>
  );
}

export function ResourceOverview({
  resource,
}: Readonly<{ resource: Resource }>) {
  const commonFields: readonly (readonly [string, string])[] = [
    ['资源 ID', resource.id],
    ['资源名称', resource.name],
    [
      '资源类型',
      resource.resourceType === 'cloud-server' ? '云服务器' : '物理机',
    ],
    ['所属站点', resource.site],
    ['计算类型', COMPUTE_TYPE_LABELS[resource.computeType]],
    ['CPU', resource.cpu],
    ['内存', `${resource.memoryGb} GB`],
    ['GPU', formatAccelerator(resource)],
    ['内网 IP', resource.ip.privateIp],
    ['公网 IP', resource.ip.publicIp ?? '未分配'],
    ['创建时间', formatDateTime(resource.createdAt)],
    ['到期时间', formatDateTime(resource.expiresAt)],
    ['到期状态', EXPIRY_STATE_LABELS[resource.expiryState]],
    ['项目归属', resource.project],
    ['用途说明', resource.purpose],
    ['责任主体', resource.owner],
  ];
  const specificFields: readonly (readonly [string, string])[] =
    resource.resourceType === 'cloud-server'
      ? [
          ['镜像', resource.image],
          ['系统盘', `${resource.systemDiskGb} GB`],
          ['数据盘', `${resource.dataDisks.length} 个`],
          ['实例信息', resource.instanceInformation],
        ]
      : [
          ['整机型号', resource.machineModel],
          ['主机名', resource.hostname],
          ['操作系统', resource.operatingSystem],
          ['认证方式', resource.connection.authenticationMethod ?? '未提供'],
          ['整机存储', resource.storageSummary],
        ];

  return (
    <div className="resource-detail-stack">
      <DefinitionSection
        eyebrow="资源身份与配置"
        title="基础信息"
        fields={commonFields}
      />
      <DefinitionSection
        eyebrow={
          resource.resourceType === 'cloud-server' ? '实例配置' : '整机配置'
        }
        title={
          resource.resourceType === 'cloud-server'
            ? '云服务器信息'
            : '物理机信息'
        }
        fields={specificFields}
      />
    </div>
  );
}

export function ResourceStorage({
  resource,
}: Readonly<{ resource: Resource }>) {
  const relations = getStorageMountsForResource(resource.id);
  const columns: readonly TableColumn<{
    space: StorageSpace;
    mount: StorageMount;
  }>[] = [
    {
      key: 'name',
      title: '名称',
      render: ({ space }) => (
        <Link to={`/storage/${space.id}`}>{space.name}</Link>
      ),
    },
    {
      key: 'type',
      title: '类型',
      render: ({ space }) =>
        space.type === 'local' ? '本地数据存储' : '高性能共享存储',
    },
    {
      key: 'mountPath',
      title: '挂载路径',
      render: ({ mount }) => <code>{mount.mountPath}</code>,
    },
    {
      key: 'capacity',
      title: '容量',
      render: ({ space }) => `${space.capacityGb} GB`,
    },
    {
      key: 'readOnly',
      title: '访问模式',
      render: ({ mount }) => (mount.readOnly ? '只读' : '可读写'),
    },
  ];

  return (
    <div className="resource-detail-stack">
      {resource.resourceType === 'cloud-server' ? (
        <DefinitionSection
          eyebrow="系统与运行环境"
          title="系统盘"
          fields={[
            ['系统盘容量', `${resource.systemDiskGb} GB`],
            ['管理范围', '当前仅提供容量信息查看'],
          ]}
        />
      ) : (
        <DefinitionSection
          eyebrow="整机存储"
          title="存储摘要"
          fields={[
            ['整机型号', resource.machineModel],
            ['存储配置', resource.storageSummary],
            ['管理范围', '当前仅提供整机存储信息查看'],
          ]}
        />
      )}
      <Container as="section" className="resource-section">
        <div className="resource-section__heading">
          <div>
            <span>持久化数据</span>
            <h3>数据存储</h3>
          </div>
        </div>
        <Table
          aria-label="数据存储列表"
          columns={columns}
          rows={relations}
          getRowKey={({ mount }) => mount.id}
          empty={
            <EmptyTable
              title="未关联数据存储"
              description="当前资源没有可展示的数据存储。"
            />
          }
        />
      </Container>
    </div>
  );
}

export function ResourceNetwork({
  resource,
  connectionContent,
}: Readonly<{ resource: Resource; connectionContent: React.ReactNode }>) {
  const [selectedRule, setSelectedRule] = useState<PortRule>();
  const columns: readonly TableColumn<PortRule>[] = [
    { key: 'name', title: '规则名称', render: (rule) => rule.name },
    { key: 'protocol', title: '协议', render: (rule) => rule.protocol },
    {
      key: 'mapping',
      title: '端口映射',
      render: (rule) => `${rule.servicePort} → ${rule.mappedPort}`,
    },
    { key: 'source', title: '允许来源', render: (rule) => rule.source },
    {
      key: 'status',
      title: '状态',
      render: (rule) => (rule.status === 'enabled' ? '已启用' : '已停用'),
    },
  ];

  return (
    <div className="resource-detail-stack">
      {connectionContent}
      <Container as="section" className="resource-section">
        <div className="resource-section__heading">
          <div>
            <span>端口与来源</span>
            <h3>访问规则</h3>
          </div>
        </div>
        <Table
          aria-label="网络访问规则"
          columns={columns}
          rows={resource.networkRules}
          getRowKey={(rule) => rule.id}
          renderRowActions={(rule) => (
            <Button variant="ghost" onClick={() => setSelectedRule(rule)}>
              查看
            </Button>
          )}
          empty={
            <EmptyTable
              title="暂无访问规则"
              description="当前资源没有可展示的端口访问规则。"
            />
          }
        />
      </Container>
      <Modal
        open={Boolean(selectedRule)}
        title="访问规则详情"
        onClose={() => setSelectedRule(undefined)}
        primaryAction={{
          label: '关闭',
          onClick: () => setSelectedRule(undefined),
        }}
      >
        {selectedRule && (
          <dl className="resource-modal-definition">
            <div><dt>规则名称</dt><dd>{selectedRule.name}</dd></div>
            <div><dt>协议</dt><dd>{selectedRule.protocol}</dd></div>
            <div><dt>服务端口</dt><dd>{selectedRule.servicePort}</dd></div>
            <div><dt>映射端口</dt><dd>{selectedRule.mappedPort}</dd></div>
            <div><dt>允许来源</dt><dd>{selectedRule.source}</dd></div>
            <div><dt>状态</dt><dd>{selectedRule.status === 'enabled' ? '已启用' : '已停用'}</dd></div>
          </dl>
        )}
      </Modal>
    </div>
  );
}

export function ResourceSoftware({
  software,
  onOpenSoftwareCenter,
}: Readonly<{
  software: readonly InstalledSoftware[];
  onOpenSoftwareCenter: () => void;
}>) {
  const columns: readonly TableColumn<InstalledSoftware>[] = [
    { key: 'name', title: '软件', render: (item) => item.name },
    { key: 'version', title: '版本', render: (item) => item.version },
    {
      key: 'status',
      title: '状态',
      render: (item) =>
        item.status === 'available'
          ? '可用'
          : item.status === 'updating'
            ? '更新中'
            : '需要关注',
    },
    {
      key: 'installedAt',
      title: '安装时间',
      render: (item) => formatDateTime(item.installedAt),
    },
  ];
  return (
    <Container as="section" className="resource-section">
      <div className="resource-section__heading">
        <div>
          <span>软件与运行环境</span>
          <h3>已安装软件</h3>
        </div>
        <Button onClick={onOpenSoftwareCenter}>前往软件中心</Button>
      </div>
      <Table
        aria-label="已安装软件列表"
        columns={columns}
        rows={software}
        getRowKey={(item) => item.id}
      />
    </Container>
  );
}

export function ResourceOperations({
  records,
}: Readonly<{ records: readonly OperationRecord[] }>) {
  const columns: readonly TableColumn<OperationRecord>[] = [
    { key: 'action', title: '操作类型', render: (record) => record.action },
    { key: 'actor', title: '操作主体', render: (record) => record.actor },
    {
      key: 'createdAt',
      title: '操作时间',
      render: (record) => formatDateTime(record.createdAt),
    },
    {
      key: 'status',
      title: '执行状态',
      render: (record) => OPERATION_STATUS_LABELS[record.status],
    },
    { key: 'message', title: '结果说明', render: (record) => record.message },
  ];
  return (
    <Container as="section" className="resource-section">
      <div className="resource-section__heading">
        <div>
          <span>资源变更追踪</span>
          <h3>操作记录</h3>
        </div>
      </div>
      <Table
        aria-label="资源操作记录"
        columns={columns}
        rows={records}
        getRowKey={(record) => record.id}
      />
    </Container>
  );
}

export function ResourceDetailHeader({
  resource,
  onBack,
  onConnection,
  onManage,
}: Readonly<{
  resource: Resource;
  onBack: () => void;
  onConnection: () => void;
  onManage: () => void;
}>) {
  return (
    <Container as="section" className="resource-detail-header">
      <div className="resource-detail-header__navigation">
        <Button variant="ghost" onClick={onBack}>
          返回资源列表
        </Button>
      </div>
      <div className="resource-detail-header__main">
        <div>
          <span>
            {resource.resourceType === 'cloud-server' ? '云服务器' : '物理机'}
          </span>
          <h2>{resource.name}</h2>
          <p>{resource.id} · {resource.site}</p>
        </div>
        <div className="resource-detail-header__actions">
          <ResourceStatusBadge status={resource.status} />
          <Button variant="secondary" onClick={onConnection}>
            连接信息
          </Button>
          <Button onClick={onManage}>管理操作</Button>
        </div>
      </div>
    </Container>
  );
}
