import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, Container, UnderlineTabs, type TabItem } from '../components/ui';
import {
  ConnectionInformation,
  getResourceById,
  MonitoringPanel,
  ResourceActionDialog,
  ResourceDelivery,
  ResourceDetailHeader,
  ResourceBilling,
  ResourceHealth,
  ResourceImageSystem,
  ResourceLifecycleDialog,
  ResourceNetwork,
  ResourceOperations,
  ResourceOverview,
  ResourceSoftware,
  ResourceStorage,
  type LifecycleDialogAction,
  type ResourceAction,
  type ResourceMenuAction,
  type ResourceType,
} from '../features/resources';
import '../features/resources/resource-management.css';

function isDirectAction(action: ResourceMenuAction): action is ResourceAction {
  return ['start', 'stop', 'restart', 'rename', 'release'].includes(action);
}

export function ResourceDetailPage({ resourceType }: Readonly<{ resourceType: ResourceType }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resourceId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [revision, setRevision] = useState(0);
  const [directAction, setDirectAction] = useState<ResourceAction>();
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleDialogAction>();
  const [feedback, setFeedback] = useState('');
  const resource = useMemo(() => {
    void revision;
    return getResourceById(resourceType, resourceId);
  }, [resourceId, resourceType, revision]);
  const listPath = resourceType === 'cloud-server' ? '/resources/cloud-servers' : '/resources/physical-machines';
  const fromList = (location.state as { fromResourceList?: string } | null)?.fromResourceList;
  const backPath = fromList?.startsWith(listPath) && !fromList.includes('://') ? fromList : listPath;

  if (!resource) {
    return <div className="resource-page resource-detail-page"><Container className="resource-page-state" role="status"><strong>未找到资源</strong><span>该资源不存在或当前无法访问。</span><Button onClick={() => navigate(listPath)}>返回资源列表</Button></Container></div>;
  }

  const connection = <ConnectionInformation connection={resource.connection} physicalResource={resource.resourceType === 'physical-machine' ? resource : undefined} />;
  const cloudTabs: readonly TabItem[] = [
    { value: 'overview', label: '概览', panel: <ResourceOverview resource={resource} /> },
    { value: 'billing', label: '计费信息', panel: <ResourceBilling resource={resource} onLifecycle={() => setLifecycleAction('renew')} /> },
    { value: 'monitoring', label: '监控', panel: <MonitoringPanel resource={resource} /> },
    { value: 'storage', label: '存储', panel: <ResourceStorage resource={resource} /> },
    { value: 'network', label: '网络与访问', panel: <ResourceNetwork resource={resource} connectionContent={connection} /> },
    { value: 'image-system', label: '镜像与系统', panel: <ResourceImageSystem resource={resource} /> },
    { value: 'software', label: '软件环境', panel: <ResourceSoftware resourceId={resource.id} onOpenSoftwareCenter={() => navigate(`/software?resource=${resource.id}`)} /> },
    { value: 'operations', label: '操作记录', panel: <ResourceOperations resourceId={resource.id} /> },
  ];
  const physicalTabs: readonly TabItem[] = [
    { value: 'overview', label: '概览', panel: <ResourceOverview resource={resource} /> },
    { value: 'billing', label: '费用与期限', panel: <ResourceBilling resource={resource} onLifecycle={() => setLifecycleAction('extend')} /> },
    { value: 'health', label: '硬件与健康', panel: <ResourceHealth resource={resource} /> },
    { value: 'monitoring', label: '监控', panel: <MonitoringPanel resource={resource} /> },
    { value: 'storage', label: '本地存储', panel: <ResourceStorage resource={resource} /> },
    { value: 'network', label: '网络与访问', panel: <ResourceNetwork resource={resource} connectionContent={connection} /> },
    { value: 'delivery', label: '交付与带外管理', panel: <ResourceDelivery resource={resource} /> },
    { value: 'software', label: '软件环境', panel: <ResourceSoftware resourceId={resource.id} onOpenSoftwareCenter={() => navigate(`/software?resource=${resource.id}`)} /> },
    { value: 'operations', label: '操作记录', panel: <ResourceOperations resourceId={resource.id} /> },
  ];
  const tabs = resource.resourceType === 'cloud-server' ? cloudTabs : physicalTabs;
  const requested = searchParams.get('tab');
  const selectedTab = tabs.some((tab) => tab.value === requested) ? requested! : 'overview';

  function changeTab(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === 'overview') next.delete('tab'); else next.set('tab', value);
    setSearchParams(next);
  }

  function handleAction(action: ResourceMenuAction) {
    if (isDirectAction(action)) return setDirectAction(action);
    if (['renew', 'auto-renew', 'extend', 'metadata', 'configuration-change', 'os-reinstall'].includes(action)) return setLifecycleAction(action as LifecycleDialogAction);
    if (action === 'image') return changeTab('image-system');
    const tab: Partial<Record<ResourceMenuAction, string>> = {
      details: 'overview', storage: 'storage', network: 'network', monitoring: 'monitoring',
      operations: 'operations', 'hardware-health': 'health', bmc: 'delivery',
    };
    changeTab(tab[action] ?? 'overview');
  }

  return (
    <div className="resource-page resource-detail-page" data-resource-type={resource.resourceType}>
      <ResourceDetailHeader resource={resource} onBack={() => navigate(backPath)} onConnection={() => changeTab('network')} onAction={handleAction} />
      {feedback && <Container className="resource-action-feedback" role="status">{feedback}</Container>}
      <Container className="resource-detail-tabs"><UnderlineTabs aria-label="资源详情" value={selectedTab} onValueChange={changeTab} items={tabs} /></Container>
      {directAction && <ResourceActionDialog resource={resource} action={directAction} open onClose={() => setDirectAction(undefined)} onCompleted={(result) => { setFeedback(result.record.message); setDirectAction(undefined); setRevision((value) => value + 1); }} />}
      {lifecycleAction && <ResourceLifecycleDialog resources={[resource]} action={lifecycleAction} open onClose={() => setLifecycleAction(undefined)} onCompleted={(message) => { setFeedback(message); setLifecycleAction(undefined); setRevision((value) => value + 1); }} />}
    </div>
  );
}
