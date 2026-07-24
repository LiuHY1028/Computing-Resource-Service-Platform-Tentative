import {
  CardRadio,
  Checkbox,
  FormField,
  Input,
  RadioGroup,
  Select,
} from '../../../components/ui';
import { getPresetStorageSpacesForSite } from '../data/presetStorageSpaces';
import type { CloudPurchaseConfiguration, DataStorageType, PurchaseFieldErrors } from '../types';

type CloudStorageSectionProps = Readonly<{
  site: string;
  value: CloudPurchaseConfiguration;
  errors: PurchaseFieldErrors;
  onChange: (value: CloudPurchaseConfiguration) => void;
}>;

export function CloudStorageSection({ site, value, errors, onChange }: CloudStorageSectionProps) {
  const storageSpaces = getPresetStorageSpacesForSite(site);

  function changeStorageType(storageType: DataStorageType) {
    onChange({
      ...value,
      storageType,
      storageSpaceId: storageType === 'existing' ? value.storageSpaceId : '',
    });
  }

  function changeNewStorageType(newStorageType: 'cloud-disk' | 'shared') {
    onChange({
      ...value,
      newStorageType,
      newStorageSkuId: newStorageType === 'cloud-disk'
        ? 'storage-cloud-standard-gb-month'
        : 'storage-shared-standard-gb-month',
      storageMountPath: newStorageType === 'cloud-disk' ? '/data/disk' : '/data/shared',
    });
  }

  return (
    <div className="purchase-storage-section">
      <RadioGroup id="cloud-storage-type" className="purchase-choice-grid purchase-choice-grid--three" value={value.storageType} onValueChange={(next) => changeStorageType(next as DataStorageType)}>
        <CardRadio value="none" title="暂不挂载" description="仅保留固定的 30 GB 系统盘" />
        <CardRadio value="new" title="购买新存储" description="创建独立云硬盘或共享存储" />
        <CardRadio value="existing" title="选择已有存储" description="挂载当前站点可用存储" />
      </RadioGroup>

      {value.storageType === 'new' && (
        <div className="purchase-conditional-panel" data-tone="cyan">
          <div className="purchase-conditional-panel__heading"><strong>购买新存储</strong><span>统一 GB/月价格</span></div>
          <div className="purchase-field-pair">
            <FormField id="cloud-new-storage-type" label="存储类型" required>
              <Select value={value.newStorageType} options={[{ value: 'cloud-disk', label: '云硬盘' }, { value: 'shared', label: '高性能共享存储' }]} onValueChange={(next) => changeNewStorageType(next as 'cloud-disk' | 'shared')} />
            </FormField>
            <FormField id="cloud-new-storage-tier" label="性能等级" required>
              <Select value={value.newStorageSkuId} options={value.newStorageType === 'cloud-disk' ? [{ value: 'storage-cloud-standard-gb-month', label: '标准型' }, { value: 'storage-cloud-performance-gb-month', label: '性能型' }] : [{ value: 'storage-shared-standard-gb-month', label: '标准型' }, { value: 'storage-shared-performance-gb-month', label: '性能型' }]} onValueChange={(newStorageSkuId) => onChange({ ...value, newStorageSkuId })} />
            </FormField>
            <FormField id="cloud-new-storage-capacity" label="容量（GB）" required error={errors['cloud-new-storage-capacity']}>
              <Input type="number" min={10} value={value.newStorageCapacityGb} onChange={(event) => onChange({ ...value, newStorageCapacityGb: Number(event.target.value) })} />
            </FormField>
            <FormField id="cloud-storage-mount-path" label="挂载路径" required error={errors['cloud-storage-mount-path']}>
              <Input value={value.storageMountPath} placeholder="/data/storage" onChange={(event) => onChange({ ...value, storageMountPath: event.target.value })} />
            </FormField>
          </div>
          <Checkbox checked={value.storageReadOnly} onCheckedChange={(storageReadOnly) => onChange({ ...value, storageReadOnly })}>以只读方式挂载</Checkbox>
        </div>
      )}

      {value.storageType === 'existing' && (
        <div className="purchase-conditional-panel" data-tone="purple">
          <div className="purchase-conditional-panel__heading"><strong>选择已有存储</strong><span>仅显示当前站点可用存储</span></div>
          <div className="purchase-field-pair">
            <FormField id="cloud-storage-space" label="存储" required error={errors['cloud-storage-space']}>
              <Select value={value.storageSpaceId} placeholder="请选择存储" options={storageSpaces.map((space) => ({ value: space.id, label: `${space.name} · ${space.displayCapacity}` }))} onValueChange={(storageSpaceId) => onChange({ ...value, storageSpaceId })} />
            </FormField>
            <FormField id="cloud-storage-mount-path" label="挂载路径" required error={errors['cloud-storage-mount-path']}>
              <Input value={value.storageMountPath} placeholder="/data/storage" onChange={(event) => onChange({ ...value, storageMountPath: event.target.value })} />
            </FormField>
          </div>
          <Checkbox checked={value.storageReadOnly} onCheckedChange={(storageReadOnly) => onChange({ ...value, storageReadOnly })}>以只读方式挂载</Checkbox>
        </div>
      )}
    </div>
  );
}
