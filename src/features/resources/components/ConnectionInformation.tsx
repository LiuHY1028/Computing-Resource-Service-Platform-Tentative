import { useMemo, useState } from 'react';
import { Button, Container } from '../../../components/ui';
import type {
  ConnectionInformationData,
  PhysicalMachineResource,
} from '../index';

type ConnectionInformationProps = Readonly<{
  connection: ConnectionInformationData;
  physicalResource?: PhysicalMachineResource;
}>;

export function ConnectionInformation({
  connection,
  physicalResource,
}: ConnectionInformationProps) {
  const [feedback, setFeedback] = useState('');
  const command = useMemo(() => {
    if (
      !connection.available ||
      !connection.sshUser ||
      !connection.sshPort
    ) {
      return '';
    }
    const target = connection.publicIp ?? connection.privateIp;
    return target
      ? `ssh -p ${connection.sshPort} ${connection.sshUser}@${target}`
      : '';
  }, [connection]);

  async function copyCommand() {
    if (!command) return;
    try {
      await navigator.clipboard.writeText(command);
      setFeedback('SSH 命令已复制。');
    } catch {
      setFeedback('复制失败，请手动复制 SSH 命令。');
    }
  }

  if (!connection.available) {
    return (
      <Container as="section" className="resource-section resource-connection">
        <div className="resource-section__heading">
          <div>
            <span>远程访问</span>
            <h3>连接信息</h3>
          </div>
        </div>
        <div className="resource-inline-state" role="status">
          <strong>连接信息暂不可用</strong>
          <span>资源就绪后生成。</span>
        </div>
      </Container>
    );
  }

  const fields = [
    ['内网 IP', connection.privateIp ?? '未分配'],
    ['公网 IP', connection.publicIp ?? '未分配'],
    ['SSH 用户', connection.sshUser ?? '未提供'],
    ['SSH 端口', String(connection.sshPort ?? '未提供')],
    ['认证方式', connection.authenticationMethod ?? '未提供'],
    ['子网', connection.subnet ?? '未提供'],
    ['网关', connection.gateway ?? '未提供'],
  ];

  return (
    <Container as="section" className="resource-section resource-connection">
      <div className="resource-section__heading">
        <div>
          <span>远程访问</span>
          <h3>连接信息</h3>
        </div>
      </div>
      <dl className="resource-definition-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        {physicalResource && (
          <div>
            <dt>BMC/IPMI</dt>
            <dd>
              {physicalResource.bmcAccess === 'restricted'
                ? '管理信息受限'
                : '未提供管理入口'}
            </dd>
          </div>
        )}
      </dl>
      <div className="resource-connection__command">
        <div>
          <span>SSH 命令</span>
          <code>{command}</code>
        </div>
        <Button onClick={copyCommand}>复制命令</Button>
      </div>
      <p className="resource-section__note">{connection.notes}</p>
      {physicalResource?.bmcAccess === 'restricted' && (
        <p className="resource-section__note">
          BMC/IPMI 管理信息不在当前页面提供。
        </p>
      )}
      <p className="resource-feedback" aria-live="polite">
        {feedback}
      </p>
    </Container>
  );
}
