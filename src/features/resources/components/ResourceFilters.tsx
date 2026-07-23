import {
  Button,
  Container,
  FilterTag,
  Grid,
  GridItem,
  SearchInput,
  Select,
  type SelectOption,
} from '../../../components/ui';
import {
  COMPUTE_TYPE_LABELS,
  EXPIRY_STATE_LABELS,
  RESOURCE_STATUS_LABELS,
} from '../formatters';
import type {
  ResourceFilterOptions,
  ResourceQuery,
  ResourceType,
} from '../types';

type FilterKey =
  | 'search'
  | 'site'
  | 'status'
  | 'computeType'
  | 'acceleratorModel'
  | 'expiryState'
  | 'scope'
  | 'image'
  | 'operatingSystem';

type ResourceFiltersProps = Readonly<{
  resourceType: ResourceType;
  query: ResourceQuery;
  options: ResourceFilterOptions;
  onChange: (key: FilterKey, value: string) => void;
  onReset: () => void;
}>;

function optionsWithAll(
  values: readonly string[],
  allLabel: string,
): readonly SelectOption[] {
  return [
    { value: 'all', label: allLabel },
    ...values.map((value) => ({ value, label: value })),
  ];
}

export function ResourceFilters({
  resourceType,
  query,
  options,
  onChange,
  onReset,
}: ResourceFiltersProps) {
  const activeFilters: Array<{
    key: FilterKey;
    label: string;
  }> = [];
  if (query.search) {
    activeFilters.push({ key: 'search', label: `关键词：${query.search}` });
  }
  if (query.site !== 'all') {
    activeFilters.push({ key: 'site', label: `站点：${query.site}` });
  }
  if (query.status !== 'all') {
    activeFilters.push({
      key: 'status',
      label: `状态：${RESOURCE_STATUS_LABELS[query.status]}`,
    });
  }
  if (query.computeType !== 'all') {
    activeFilters.push({
      key: 'computeType',
      label: `计算类型：${COMPUTE_TYPE_LABELS[query.computeType]}`,
    });
  }
  if (query.acceleratorModel !== 'all') {
    activeFilters.push({
      key: 'acceleratorModel',
      label: `GPU：${query.acceleratorModel}`,
    });
  }
  if (query.expiryState !== 'all') {
    activeFilters.push({
      key: 'expiryState',
      label: `到期状态：${EXPIRY_STATE_LABELS[query.expiryState]}`,
    });
  }
  if (query.scope !== 'all') {
    activeFilters.push({
      key: 'scope',
      label: `项目或用途：${query.scope}`,
    });
  }
  if (query.image !== 'all') {
    activeFilters.push({ key: 'image', label: `镜像：${query.image}` });
  }
  if (query.operatingSystem !== 'all') {
    activeFilters.push({
      key: 'operatingSystem',
      label: `操作系统：${query.operatingSystem}`,
    });
  }

  function clearFilter(key: FilterKey) {
    onChange(key, key === 'search' ? '' : 'all');
  }

  return (
    <Container as="section" className="resource-filters" aria-label="资源筛选">
      <Grid className="resource-filters__grid">
        <GridItem span={6}>
          <label className="resource-filter-field" htmlFor="resource-search">
            <span>资源名称或 ID</span>
            <SearchInput
              id="resource-search"
              placeholder="输入资源名称或 ID"
              value={query.search}
              clearable
              onChange={(event) => onChange('search', event.target.value)}
              onClear={() => onChange('search', '')}
              onSearch={(value) => onChange('search', value)}
            />
          </label>
        </GridItem>
        <GridItem span={4}>
          <label className="resource-filter-field" htmlFor="resource-site">
            <span>站点</span>
            <Select
              id="resource-site"
              options={optionsWithAll(options.sites, '全部站点')}
              value={query.site}
              onValueChange={(value) => onChange('site', value)}
            />
          </label>
        </GridItem>
        <GridItem span={4}>
          <label className="resource-filter-field" htmlFor="resource-status">
            <span>运行状态</span>
            <Select
              id="resource-status"
              options={[
                { value: 'all', label: '全部状态' },
                ...options.statuses.map((status) => ({
                  value: status,
                  label: RESOURCE_STATUS_LABELS[status],
                })),
              ]}
              value={query.status}
              onValueChange={(value) => onChange('status', value)}
            />
          </label>
        </GridItem>
        <GridItem span={4}>
          <label className="resource-filter-field" htmlFor="resource-compute">
            <span>计算类型</span>
            <Select
              id="resource-compute"
              options={[
                { value: 'all', label: '全部计算类型' },
                { value: 'cpu', label: COMPUTE_TYPE_LABELS.cpu },
                { value: 'gpu', label: COMPUTE_TYPE_LABELS.gpu },
              ]}
              value={query.computeType}
              onValueChange={(value) => onChange('computeType', value)}
            />
          </label>
        </GridItem>
        <GridItem span={6}>
          <label className="resource-filter-field" htmlFor="resource-gpu">
            <span>GPU 型号</span>
            <Select
              id="resource-gpu"
              options={optionsWithAll(options.acceleratorModels, '全部 GPU 型号')}
              value={query.acceleratorModel}
              disabled={query.computeType === 'cpu'}
              onValueChange={(value) => onChange('acceleratorModel', value)}
            />
          </label>
        </GridItem>
        <GridItem span={4}>
          <label className="resource-filter-field" htmlFor="resource-expiry">
            <span>到期状态</span>
            <Select
              id="resource-expiry"
              options={[
                { value: 'all', label: '全部到期状态' },
                ...Object.entries(EXPIRY_STATE_LABELS).map(([value, label]) => ({
                  value,
                  label,
                })),
              ]}
              value={query.expiryState}
              onValueChange={(value) => onChange('expiryState', value)}
            />
          </label>
        </GridItem>
        <GridItem span={5}>
          <label className="resource-filter-field" htmlFor="resource-scope">
            <span>项目归属或用途</span>
            <Select
              id="resource-scope"
              options={optionsWithAll(options.scopes, '全部项目与用途')}
              value={query.scope}
              onValueChange={(value) => onChange('scope', value)}
            />
          </label>
        </GridItem>
        <GridItem span={5}>
          {resourceType === 'cloud-server' ? (
            <label className="resource-filter-field" htmlFor="resource-image">
              <span>镜像</span>
              <Select
                id="resource-image"
                options={optionsWithAll(options.images, '全部镜像')}
                value={query.image}
                onValueChange={(value) => onChange('image', value)}
              />
            </label>
          ) : (
            <label className="resource-filter-field" htmlFor="resource-os">
              <span>操作系统</span>
              <Select
                id="resource-os"
                options={optionsWithAll(
                  options.operatingSystems,
                  '全部操作系统',
                )}
                value={query.operatingSystem}
                onValueChange={(value) => onChange('operatingSystem', value)}
              />
            </label>
          )}
        </GridItem>
      </Grid>
      {activeFilters.length > 0 && (
        <div className="resource-filters__active">
          <span>当前条件</span>
          <div className="resource-filters__tags">
            {activeFilters.map((filter) => (
              <FilterTag
                key={filter.key}
                selected
                onSelectedChange={(selected) => {
                  if (!selected) clearFilter(filter.key);
                }}
              >
                {filter.label}
              </FilterTag>
            ))}
          </div>
          <Button variant="ghost" onClick={onReset}>
            重置全部
          </Button>
        </div>
      )}
    </Container>
  );
}
