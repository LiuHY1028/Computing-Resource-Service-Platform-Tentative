import type { ChangeEvent, RefObject } from 'react';
import {
  Button,
  Container,
  FilterTag,
  Grid,
  GridItem,
  MultiSelect,
  SearchInput,
  Select,
  type SelectOption,
} from '../../../components/ui';
import type {
  MarketplaceFilterOptions,
  MarketplaceQuery,
} from '../types';

type MarketplaceFiltersProps = Readonly<{
  query: MarketplaceQuery;
  options: MarketplaceFilterOptions;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onQueryChange: (query: MarketplaceQuery) => void;
  onReset: () => void;
  onSearchSubmit: (search: string) => void;
}>;

const computeTypeOptions: readonly SelectOption[] = [
  { value: 'all', label: '全部计算类型' },
  { value: 'cpu', label: 'CPU 计算' },
  { value: 'gpu', label: 'GPU 计算' },
];

const availabilityOptions: readonly SelectOption[] = [
  { value: 'all', label: '全部配置状态' },
  { value: 'configurable', label: '可继续配置' },
  { value: 'unavailable', label: '暂不可配置' },
];

function computeTypeLabel(value: MarketplaceQuery['computeType']) {
  return computeTypeOptions.find((option) => option.value === value)?.label;
}

function availabilityLabel(value: MarketplaceQuery['availability']) {
  return availabilityOptions.find((option) => option.value === value)?.label;
}

export function MarketplaceFilters({
  query,
  options,
  searchInputRef,
  onQueryChange,
  onReset,
  onSearchSubmit,
}: MarketplaceFiltersProps) {
  const siteOptions = options.sites.map((site) => ({ value: site, label: site }));
  const acceleratorModelOptions = options.acceleratorModels.map((model) => ({
    value: model,
    label: model,
  }));
  const acceleratorCountOptions = options.acceleratorCounts.map((count) => ({
    value: String(count),
    label: `${count} 张`,
  }));
  const hasActiveFilters =
    query.resourceType !== 'cloud-server' ||
    query.search.trim().length > 0 ||
    query.sites.length > 0 ||
    query.computeType !== 'all' ||
    query.acceleratorModels.length > 0 ||
    query.acceleratorCounts.length > 0 ||
    query.availability !== 'all';

  function update(patch: Partial<MarketplaceQuery>) {
    onQueryChange({ ...query, ...patch });
  }

  function restoreFocusAfterTagRemoval() {
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    update({ search: event.target.value });
  }

  function removeSite(site: string) {
    update({ sites: query.sites.filter((candidate) => candidate !== site) });
    restoreFocusAfterTagRemoval();
  }

  function removeAcceleratorModel(model: string) {
    update({
      acceleratorModels: query.acceleratorModels.filter(
        (candidate) => candidate !== model,
      ),
    });
    restoreFocusAfterTagRemoval();
  }

  function removeAcceleratorCount(count: number) {
    update({
      acceleratorCounts: query.acceleratorCounts.filter(
        (candidate) => candidate !== count,
      ),
    });
    restoreFocusAfterTagRemoval();
  }

  function removeComputeType() {
    update({
      computeType: 'all',
      acceleratorModels: [],
      acceleratorCounts: [],
    });
    restoreFocusAfterTagRemoval();
  }

  function removeAvailability() {
    update({ availability: 'all' });
    restoreFocusAfterTagRemoval();
  }

  return (
    <Container className="marketplace-filters" aria-label="资源筛选">
      <div className="marketplace-filters__header">
        <div>
          <h2>筛选资源</h2>
          <p>按名称、规格和站点缩小演示资源范围。</p>
        </div>
        {hasActiveFilters && (
          <Button variant="secondary" onClick={onReset}>
            重置全部
          </Button>
        )}
      </div>

      <Grid className="marketplace-filters__grid">
        <GridItem span={6}>
          <label className="marketplace-filter-field" htmlFor="marketplace-search">
            <span>搜索</span>
            <SearchInput
              ref={searchInputRef}
              id="marketplace-search"
              aria-label="搜索资源名称或规格"
              placeholder="搜索资源名称或规格"
              value={query.search}
              clearable
              onChange={handleSearchChange}
              onClear={() => update({ search: '' })}
              onSearch={onSearchSubmit}
            />
          </label>
        </GridItem>
        <GridItem span={5}>
          <label className="marketplace-filter-field" htmlFor="marketplace-sites">
            <span>站点</span>
            <MultiSelect
              id="marketplace-sites"
              aria-label="站点"
              options={siteOptions}
              value={query.sites}
              placeholder="全部站点"
              onValueChange={(sites) => update({ sites })}
            />
          </label>
        </GridItem>
        <GridItem span={4}>
          <label
            className="marketplace-filter-field"
            htmlFor="marketplace-compute-type"
          >
            <span>计算类型</span>
            <Select
              id="marketplace-compute-type"
              aria-label="计算类型"
              options={computeTypeOptions}
              value={query.computeType}
              onValueChange={(computeType) =>
                update({
                  computeType: computeType as MarketplaceQuery['computeType'],
                  ...(computeType === 'gpu'
                    ? {}
                    : { acceleratorModels: [], acceleratorCounts: [] }),
                })
              }
            />
          </label>
        </GridItem>
        <GridItem span={4}>
          <label
            className="marketplace-filter-field"
            htmlFor="marketplace-availability"
          >
            <span>配置状态</span>
            <Select
              id="marketplace-availability"
              aria-label="配置状态"
              options={availabilityOptions}
              value={query.availability}
              onValueChange={(availability) =>
                update({
                  availability:
                    availability as MarketplaceQuery['availability'],
                })
              }
            />
          </label>
        </GridItem>
        {query.computeType === 'gpu' && (
          <>
            <GridItem span={6}>
              <label
                className="marketplace-filter-field"
                htmlFor="marketplace-accelerator-models"
              >
                <span>GPU / 加速卡型号</span>
                <MultiSelect
                  id="marketplace-accelerator-models"
                  aria-label="GPU或加速卡型号"
                  options={acceleratorModelOptions}
                  value={query.acceleratorModels}
                  placeholder="全部型号"
                  onValueChange={(acceleratorModels) =>
                    update({ acceleratorModels })
                  }
                />
              </label>
            </GridItem>
            <GridItem span={4}>
              <label
                className="marketplace-filter-field"
                htmlFor="marketplace-accelerator-counts"
              >
                <span>GPU / 加速卡数量</span>
                <MultiSelect
                  id="marketplace-accelerator-counts"
                  aria-label="GPU或加速卡数量"
                  options={acceleratorCountOptions}
                  value={query.acceleratorCounts.map(String)}
                  placeholder="全部数量"
                  onValueChange={(counts) =>
                    update({ acceleratorCounts: counts.map(Number) })
                  }
                />
              </label>
            </GridItem>
          </>
        )}
      </Grid>

      <div className="marketplace-filters__active" aria-label="当前筛选条件">
        <span className="marketplace-filters__active-label">当前条件</span>
        <div className="marketplace-filters__tags">
          {!hasActiveFilters && <span>全部资源</span>}
          {query.resourceType !== 'cloud-server' && (
            <FilterTag selected onSelectedChange={(selected) => !selected && onReset()}>
              资源类型：物理机
            </FilterTag>
          )}
          {query.search.trim() && (
            <FilterTag
              selected
              onSelectedChange={(selected) => {
                if (!selected) {
                  update({ search: '' });
                  restoreFocusAfterTagRemoval();
                }
              }}
            >
              搜索：{query.search.trim()}
            </FilterTag>
          )}
          {query.sites.map((site) => (
            <FilterTag
              key={site}
              selected
              onSelectedChange={(selected) => !selected && removeSite(site)}
            >
              站点：{site}
            </FilterTag>
          ))}
          {query.computeType !== 'all' && (
            <FilterTag
              selected
              onSelectedChange={(selected) =>
                !selected && removeComputeType()
              }
            >
              {computeTypeLabel(query.computeType)}
            </FilterTag>
          )}
          {query.acceleratorModels.map((model) => (
            <FilterTag
              key={model}
              selected
              onSelectedChange={(selected) =>
                !selected && removeAcceleratorModel(model)
              }
            >
              型号：{model}
            </FilterTag>
          ))}
          {query.acceleratorCounts.map((count) => (
            <FilterTag
              key={count}
              selected
              onSelectedChange={(selected) =>
                !selected && removeAcceleratorCount(count)
              }
            >
              数量：{count} 张
            </FilterTag>
          ))}
          {query.availability !== 'all' && (
            <FilterTag
              selected
              onSelectedChange={(selected) =>
                !selected && removeAvailability()
              }
            >
              {availabilityLabel(query.availability)}
            </FilterTag>
          )}
        </div>
      </div>
    </Container>
  );
}
