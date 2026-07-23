import { useMemo, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { Button, Container, UnderlineTabs } from '../components/ui';
import {
  ConnectionInformation,
  getResourceById,
  MonitoringPanel,
  ResourceActionDialog,
  ResourceDetailHeader,
  ResourceNetwork,
  ResourceOperations,
  ResourceOverview,
  ResourceSoftware,
  ResourceStorage,
  type ResourceType,
} from '../features/resources';
import '../features/resources/resource-management.css';

const DETAIL_TABS = [
  'overview',
  'monitoring',
  'storage',
  'network',
  'software',
  'operations',
] as const;

export function ResourceDetailPage({
  resourceType,
}: Readonly<{ resourceType: ResourceType }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resourceId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const selectedTab = DETAIL_TABS.includes(
    requestedTab as (typeof DETAIL_TABS)[number],
  )
    ? requestedTab!
    : 'overview';
  const [revision, setRevision] = useState(0);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const resource = useMemo(
    () => {
      void revision;
      return getResourceById(resourceType, resourceId);
    },
    [resourceId, resourceType, revision],
  );
  const listPath =
    resourceType === 'cloud-server'
      ? '/resources/cloud-servers'
      : '/resources/physical-machines';
  const fromList = (
    location.state as { fromResourceList?: string } | null
  )?.fromResourceList;
  const backPath =
    fromList?.startsWith(listPath) && !fromList.includes('://')
      ? fromList
      : listPath;

  function changeTab(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === 'overview') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next);
  }

  if (!resource) {
    return (
      <div className="resource-page resource-detail-page">
        <Container className="resource-page-state" role="status">
          <strong>未找到资源</strong>
          <span>该资源不存在或当前无法访问。</span>
          <Button onClick={() => navigate(listPath)}>返回资源列表</Button>
        </Container>
      </div>
    );
  }

  const connection = (
    <ConnectionInformation
      connection={resource.connection}
      physicalResource={
        resource.resourceType === 'physical-machine' ? resource : undefined
      }
    />
  );

  return (
    <div className="resource-page resource-detail-page">
      <ResourceDetailHeader
        resource={resource}
        onBack={() => navigate(backPath)}
        onConnection={() => changeTab('network')}
        onManage={() => setActionOpen(true)}
      />
      {actionFeedback && (
        <Container className="resource-action-feedback" role="status">
          {actionFeedback}
        </Container>
      )}
      <Container className="resource-detail-tabs">
        <UnderlineTabs
          aria-label="资源详情"
          value={selectedTab}
          onValueChange={changeTab}
          items={[
            {
              value: 'overview',
              label: '概览',
              panel: <ResourceOverview resource={resource} />,
            },
            {
              value: 'monitoring',
              label: '监控',
              panel: <MonitoringPanel resource={resource} />,
            },
            {
              value: 'storage',
              label: '存储',
              panel: <ResourceStorage resource={resource} />,
            },
            {
              value: 'network',
              label: '网络与访问',
              panel: (
                <ResourceNetwork
                  resource={resource}
                  connectionContent={connection}
                />
              ),
            },
            {
              value: 'software',
              label: '软件与环境',
              panel: (
                <ResourceSoftware
                  resourceId={resource.id}
                  onOpenSoftwareCenter={() => navigate('/software')}
                />
              ),
            },
            {
              value: 'operations',
              label: '操作记录',
              panel: (
                <ResourceOperations resourceId={resource.id} />
              ),
            },
          ]}
        />
      </Container>
      {actionOpen && (
        <ResourceActionDialog
          resource={resource}
          open
          onClose={() => setActionOpen(false)}
          onCompleted={(result) => {
            setRevision((value) => value + 1);
            setActionFeedback(result.record.message);
            setActionOpen(false);
          }}
        />
      )}
    </div>
  );
}
