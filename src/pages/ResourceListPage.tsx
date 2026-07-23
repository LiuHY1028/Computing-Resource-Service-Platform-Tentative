import { useEffect, useMemo, useState } from 'react';
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { Container, Pagination, TitleBarTabs } from '../components/ui';
import {
  getResourceFilterOptions,
  queryResources,
  ResourceActionDialog,
  ResourceFilters,
  ResourceTable,
  type ComputeTypeFilter,
  type ExpiryStateFilter,
  type Resource,
  type ResourceQuery,
  type ResourceStatusFilter,
  type ResourceType,
} from '../features/resources';
import '../features/resources/resource-management.css';

const PAGE_SIZE = 5;

function validValue(value: string | null, allowed: readonly string[]) {
  return value && allowed.includes(value) ? value : 'all';
}

function parsePositiveInteger(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function ResourceListPage({
  resourceType,
}: Readonly<{ resourceType: ResourceType }>) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const options = useMemo(
    () => getResourceFilterOptions(resourceType),
    [resourceType],
  );
  const query = useMemo<ResourceQuery>(
    () => ({
      resourceType,
      search: searchParams.get('q') ?? '',
      site: validValue(searchParams.get('site'), options.sites),
      status: validValue(searchParams.get('status'), options.statuses) as ResourceStatusFilter,
      computeType: validValue(searchParams.get('compute'), [
        'cpu',
        'gpu',
      ]) as ComputeTypeFilter,
      acceleratorModel: validValue(
        searchParams.get('gpu'),
        options.acceleratorModels,
      ),
      expiryState: validValue(searchParams.get('expiry'), [
        'active',
        'expiring',
        'expired',
      ]) as ExpiryStateFilter,
      scope: validValue(searchParams.get('scope'), options.scopes),
      image: validValue(searchParams.get('image'), options.images),
      operatingSystem: validValue(
        searchParams.get('os'),
        options.operatingSystems,
      ),
    }),
    [options, resourceType, searchParams],
  );
  const [revision, setRevision] = useState(0);
  const [selectedResource, setSelectedResource] = useState<Resource>();
  const [actionFeedback, setActionFeedback] = useState('');
  const page = parsePositiveInteger(searchParams.get('page'));
  const result = useMemo(
    () => {
      void revision;
      return queryResources(query);
    },
    [query, revision],
  );
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = result.items.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    if (page !== safePage) {
      const next = new URLSearchParams(searchParams);
      if (safePage === 1) next.delete('page');
      else next.set('page', String(safePage));
      setSearchParams(next, { replace: true });
    }
  }, [page, safePage, searchParams, setSearchParams]);

  function setParam(key: string, value: string, resetPage = true) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    if (resetPage) next.delete('page');
    setSearchParams(next);
  }

  function updateFilter(key: string, value: string) {
    const parameterMap: Readonly<Record<string, string>> = {
      search: 'q',
      site: 'site',
      status: 'status',
      computeType: 'compute',
      acceleratorModel: 'gpu',
      expiryState: 'expiry',
      scope: 'scope',
      image: 'image',
      operatingSystem: 'os',
    };
    if (key === 'computeType' && value === 'cpu') {
      const next = new URLSearchParams(searchParams);
      next.set('compute', value);
      next.delete('gpu');
      next.delete('page');
      setSearchParams(next);
      return;
    }
    setParam(parameterMap[key] ?? key, value);
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams());
  }

  function detailPath(resource: Resource, tab?: string) {
    const root =
      resource.resourceType === 'cloud-server'
        ? '/resources/cloud-servers'
        : '/resources/physical-machines';
    const tabQuery = tab ? `?tab=${tab}` : '';
    navigate(`${root}/${encodeURIComponent(resource.id)}${tabQuery}`, {
      state: {
        fromResourceList: `${location.pathname}?${searchParams.toString()}`,
      },
    });
  }

  const listContent = (
    <div className="resource-list__content">
      <ResourceFilters
        resourceType={resourceType}
        query={query}
        options={options}
        onChange={updateFilter}
        onReset={resetFilters}
      />
      {actionFeedback && (
        <Container className="resource-action-feedback" role="status">
          {actionFeedback}
        </Container>
      )}
      <Container as="section" className="resource-results">
        <div className="resource-results__header">
          <div>
            <span>资源管理</span>
            <h2>
              {resourceType === 'cloud-server' ? '云服务器' : '物理机'}资源
            </h2>
          </div>
          <p aria-live="polite">共 {result.total} 个结果</p>
        </div>
        <ResourceTable
          resourceType={resourceType}
          rows={pageItems}
          loading={false}
          catalogEmpty={result.catalogTotal === 0}
          onRetry={() => undefined}
          onResetFilters={resetFilters}
          onGoMarketplace={() =>
            navigate(
              resourceType === 'cloud-server'
                ? '/marketplace?type=cloud'
                : '/marketplace?type=physical',
            )
          }
          onViewDetails={(resource) => detailPath(resource)}
          onConnection={(resource) => detailPath(resource, 'network')}
          onMore={setSelectedResource}
        />
        {result.total > 0 && (
          <Pagination
            className="resource-results__pagination"
            page={safePage}
            totalPages={totalPages}
            totalItems={result.total}
            onPageChange={(nextPage) =>
              setParam('page', String(nextPage), false)
            }
          />
        )}
      </Container>
      {selectedResource && (
        <ResourceActionDialog
          resource={selectedResource}
          open
          onClose={() => setSelectedResource(undefined)}
          onCompleted={(actionResult) => {
            setActionFeedback(actionResult.record.message);
            setSelectedResource(undefined);
            setRevision((value) => value + 1);
          }}
        />
      )}
    </div>
  );

  const commonQuery = new URLSearchParams(searchParams);
  commonQuery.delete('image');
  commonQuery.delete('os');
  commonQuery.delete('page');
  const commonSuffix = commonQuery.toString()
    ? `?${commonQuery.toString()}`
    : '';

  return (
    <div className="resource-page">
      <Container className="resource-type-tabs">
        <TitleBarTabs
          aria-label="我的资源类型"
          value={resourceType === 'cloud-server' ? 'cloud' : 'physical'}
          onValueChange={(value) => {
            if (
              (value === 'cloud' && resourceType === 'cloud-server') ||
              (value === 'physical' && resourceType === 'physical-machine')
            ) {
              return;
            }
            navigate(
              value === 'cloud'
                ? `/resources/cloud-servers${commonSuffix}`
                : `/resources/physical-machines${commonSuffix}`,
            );
          }}
          items={[
            { value: 'cloud', label: '云服务器', panel: listContent },
            { value: 'physical', label: '物理机', panel: listContent },
          ]}
        />
      </Container>
    </div>
  );
}
