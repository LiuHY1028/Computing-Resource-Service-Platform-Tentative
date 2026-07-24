import { useState } from 'react';
import {
  Button,
  FilterTag,
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
  | 'room'
  | 'status'
  | 'healthStatus'
  | 'computeType'
  | 'acceleratorModel'
  | 'expiryState'
  | 'billingMode'
  | 'scope'
  | 'tag'
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeFilters: Array<{ key: FilterKey; label: string }> = [];
  if (query.search) activeFilters.push({ key: 'search', label: `关键词：${query.search}` });
  if (query.site !== 'all') activeFilters.push({ key: 'site', label: `站点：${query.site}` });
  if (query.status !== 'all') activeFilters.push({ key: 'status', label: `状态：${RESOURCE_STATUS_LABELS[query.status]}` });
  if (query.healthStatus && query.healthStatus !== 'all') activeFilters.push({ key: 'healthStatus', label: `健康：${query.healthStatus === 'normal' ? '正常' : query.healthStatus === 'warning' ? '告警' : '检查中'}` });
  if (query.room && query.room !== 'all') activeFilters.push({ key: 'room', label: `机房：${query.room}` });
  if (query.computeType !== 'all') activeFilters.push({ key: 'computeType', label: `计算：${COMPUTE_TYPE_LABELS[query.computeType]}` });
  if (query.acceleratorModel !== 'all') activeFilters.push({ key: 'acceleratorModel', label: `GPU：${query.acceleratorModel}` });
  if (query.expiryState !== 'all') activeFilters.push({ key: 'expiryState', label: `到期：${EXPIRY_STATE_LABELS[query.expiryState]}` });
  if (query.billingMode && query.billingMode !== 'all') activeFilters.push({ key: 'billingMode', label: `计费：${query.billingMode === 'subscription' ? '包年包月' : '按量计费'}` });
  if (query.scope !== 'all') activeFilters.push({ key: 'scope', label: `项目：${query.scope}` });
  if (query.tag && query.tag !== 'all') activeFilters.push({ key: 'tag', label: `标签：${query.tag}` });
  if (query.image !== 'all') activeFilters.push({ key: 'image', label: `镜像：${query.image}` });
  if (query.operatingSystem !== 'all') activeFilters.push({ key: 'operatingSystem', label: `系统：${query.operatingSystem}` });

  function clearFilter(key: FilterKey) {
    onChange(key, key === 'search' ? '' : 'all');
  }

  return (
    <div className="resource-filters" aria-label="资源筛选">
      <div className="resource-filters__primary">
        <SearchInput
          id="resource-search"
          aria-label="资源名称或 ID"
          placeholder="搜索资源名称或 ID"
          value={query.search}
          clearable
          onChange={(event) => onChange('search', event.target.value)}
          onClear={() => onChange('search', '')}
          onSearch={(value) => onChange('search', value)}
        />
        <Select
          aria-label="站点"
          options={optionsWithAll(options.sites, '全部站点')}
          value={query.site}
          onValueChange={(value) => onChange('site', value)}
        />
        <Select
          aria-label="运行状态"
          options={[
            { value: 'all', label: '全部状态' },
            ...options.statuses.map((status) => ({ value: status, label: RESOURCE_STATUS_LABELS[status] })),
          ]}
          value={query.status}
          onValueChange={(value) => onChange('status', value)}
        />
        <Select
          aria-label={resourceType === 'cloud-server' ? '实例健康' : '硬件健康'}
          value={query.healthStatus ?? 'all'}
          onValueChange={(value) => onChange('healthStatus', value)}
          options={[
            { value: 'all', label: '全部健康状态' },
            { value: 'normal', label: '正常' },
            { value: 'warning', label: '告警' },
            { value: 'checking', label: '检查中' },
          ]}
        />
        <Button
          variant="ghost"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((value) => !value)}
        >
          更多筛选{activeFilters.length ? ` (${activeFilters.length})` : ''}
        </Button>
      </div>
      {advancedOpen && (
        <div className="resource-filters__advanced" role="region" aria-label="更多资源筛选">
          {resourceType === 'physical-machine' && (
            <Select aria-label="机房" options={optionsWithAll(options.rooms, '全部机房')} value={query.room ?? 'all'} onValueChange={(value) => onChange('room', value)} />
          )}
          <Select aria-label="计算类型" options={[{ value: 'all', label: '全部计算类型' }, { value: 'cpu', label: COMPUTE_TYPE_LABELS.cpu }, { value: 'gpu', label: COMPUTE_TYPE_LABELS.gpu }]} value={query.computeType} onValueChange={(value) => onChange('computeType', value)} />
          <Select aria-label="GPU 型号" options={optionsWithAll(options.acceleratorModels, '全部 GPU 型号')} value={query.acceleratorModel} disabled={query.computeType === 'cpu'} onValueChange={(value) => onChange('acceleratorModel', value)} />
          <Select aria-label="到期状态" options={[{ value: 'all', label: '全部到期状态' }, ...Object.entries(EXPIRY_STATE_LABELS).map(([value, label]) => ({ value, label }))]} value={query.expiryState} onValueChange={(value) => onChange('expiryState', value)} />
          {resourceType === 'cloud-server' && <Select aria-label="计费模式" value={query.billingMode ?? 'all'} onValueChange={(value) => onChange('billingMode', value)} options={[{ value: 'all', label: '全部计费模式' }, { value: 'subscription', label: '包年包月' }, { value: 'pay-as-you-go', label: '按量计费' }]} />}
          <Select aria-label={resourceType === 'cloud-server' ? '项目归属' : '项目或责任人'} options={optionsWithAll(options.scopes, '全部项目与用途')} value={query.scope} onValueChange={(value) => onChange('scope', value)} />
          <Select aria-label="标签" value={query.tag ?? 'all'} onValueChange={(value) => onChange('tag', value)} options={optionsWithAll(options.tags, '全部标签')} />
          {resourceType === 'cloud-server'
            ? <Select aria-label="镜像" options={optionsWithAll(options.images, '全部镜像')} value={query.image} onValueChange={(value) => onChange('image', value)} />
            : <Select aria-label="操作系统" options={optionsWithAll(options.operatingSystems, '全部操作系统')} value={query.operatingSystem} onValueChange={(value) => onChange('operatingSystem', value)} />}
        </div>
      )}
      {activeFilters.length > 0 && (
        <div className="resource-filters__active">
          <span>已选条件</span>
          {activeFilters.map((filter) => (
            <FilterTag key={filter.key} selected onClick={() => clearFilter(filter.key)}>
              {filter.label} ×
            </FilterTag>
          ))}
          <Button variant="ghost" onClick={onReset}>清除全部</Button>
        </div>
      )}
    </div>
  );
}
