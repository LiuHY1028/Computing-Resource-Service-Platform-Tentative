import { useEffect, useRef, useState } from 'react';
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
  type Resource,
  type ResourceType,
} from '../features/resources';
import '../features/resources/resource-management.css';

type DetailViewState = 'normal' | 'loading' | 'error';
const DETAIL_TABS = [
  'overview',
  'monitoring',
  'storage',
  'network',
  'software',
  'operations',
] as const;

function parseViewState(value: string | null): DetailViewState {
  return value === 'loading' || value === 'error' ? value : 'normal';
}

export function ResourceDetailPage({
  resourceType,
}: Readonly<{ resourceType: ResourceType }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const { resourceId = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const viewState = parseViewState(searchParams.get('viewState'));
  const requestedTab = searchParams.get('tab');
  const selectedTab = DETAIL_TABS.includes(
    requestedTab as (typeof DETAIL_TABS)[number],
  )
    ? requestedTab!
    : 'overview';
  const [resource, setResource] = useState<Resource>();
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [actionOpen, setActionOpen] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');
  const [settledKey, setSettledKey] = useState('');
  const requestRef = useRef(0);
  const requestKey = JSON.stringify({
    resourceType,
    resourceId,
    viewState,
    retryAttempt,
  });
  const loading = viewState === 'loading' || settledKey !== requestKey;
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

  useEffect(() => {
    if (viewState === 'loading') return undefined;
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    const controller = new AbortController();
    getResourceById(resourceType, resourceId, {
      delayMs: viewState === 'normal' ? 0 : undefined,
      simulateError: viewState === 'error' && retryAttempt === 0,
      signal: controller.signal,
    })
      .then((nextResource) => {
        if (controller.signal.aborted || requestId !== requestRef.current) return;
        setResource(nextResource);
        setMissing(!nextResource);
        setError('');
        setSettledKey(requestKey);
      })
      .catch((nextError: unknown) => {
        if (
          controller.signal.aborted ||
          requestId !== requestRef.current ||
          (nextError instanceof DOMException && nextError.name === 'AbortError')
        ) {
          return;
        }
        setResource(undefined);
        setMissing(false);
        setError(
          nextError instanceof Error
            ? nextError.message
            : '资源详情读取失败，请稍后重试。',
        );
        setSettledKey(requestKey);
      });
    return () => controller.abort();
  }, [requestKey, resourceId, resourceType, retryAttempt, viewState]);

  function changeTab(value: string) {
    const next = new URLSearchParams(searchParams);
    if (value === 'overview') next.delete('tab');
    else next.set('tab', value);
    setSearchParams(next);
  }

  if (loading) {
    return (
      <div className="resource-page resource-detail-page">
        <Container className="resource-page-state" role="status">
          <strong>正在读取资源详情</strong>
          <span>请稍候…</span>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resource-page resource-detail-page">
        <Container className="resource-page-state" role="alert">
          <strong>资源详情读取失败</strong>
          <span>{error}</span>
          <div>
            <Button onClick={() => setRetryAttempt((value) => value + 1)}>
              重新加载
            </Button>
            <Button variant="ghost" onClick={() => navigate(backPath)}>
              返回资源列表
            </Button>
          </div>
        </Container>
      </div>
    );
  }

  if (missing || !resource) {
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
                <ResourceOperations records={resource.operationRecords} />
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
            setResource(result.resource);
            setActionFeedback(result.record.message);
            setActionOpen(false);
          }}
        />
      )}
    </div>
  );
}
