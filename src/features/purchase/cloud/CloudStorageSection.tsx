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
      hostPath: storageType === 'host-path' ? value.hostPath : '',
      hostMountPath: storageType === 'host-path' ? value.hostMountPath : '',
      hostReadOnly: storageType === 'host-path' ? value.hostReadOnly : false,
      storageSpaceId: storageType === 'shared' ? value.storageSpaceId : '',
      sharedMountPath: storageType === 'shared' ? value.sharedMountPath : '',
      sharedReadOnly: storageType === 'shared' ? value.sharedReadOnly : false,
    });
  }

  return (
    <div className="purchase-storage-section">
      <RadioGroup
        id="cloud-storage-type"
        className="purchase-choice-grid purchase-choice-grid--three"
        value={value.storageType}
        onValueChange={(next) => changeStorageType(next as DataStorageType)}
      >
        <CardRadio value="none" title="不挂载数据盘" description="仅保留固定的 30 GB 系统盘" />
        <CardRadio value="host-path" title="本地数据存储" description="HostPath · 与所在主机绑定" />
        <CardRadio value="shared" title="高性能共享存储" description="NFS · 集中管理" />
      </RadioGroup>

      {value.storageType === 'host-path' && (
        <div className="purchase-conditional-panel" data-tone="cyan">
          <div className="purchase-conditional-panel__heading">
            <strong>本地数据存储</strong>
            <span>底层挂载方式：HostPath</span>
          </div>
          <p className="purchase-inline-notice">
            该方式与资源所在主机绑定，适用于依赖本机路径的工作负载。
          </p>
          <div className="purchase-field-pair">
            <FormField id="cloud-host-path" label="主机路径" required error={errors['cloud-host-path']}>
              <Input value={value.hostPath} placeholder="例如：/data/project" onChange={(event) => onChange({ ...value, hostPath: event.target.value })} />
            </FormField>
            <FormField id="cloud-host-mount-path" label="容器挂载路径" required error={errors['cloud-host-mount-path']}>
              <Input value={value.hostMountPath} placeholder="例如：/workspace/data" onChange={(event) => onChange({ ...value, hostMountPath: event.target.value })} />
            </FormField>
          </div>
          <Checkbox checked={value.hostReadOnly} onCheckedChange={(hostReadOnly) => onChange({ ...value, hostReadOnly })}>
            以只读方式挂载
          </Checkbox>
        </div>
      )}

      {value.storageType === 'shared' && (
        <div className="purchase-conditional-panel" data-tone="purple">
          <div className="purchase-conditional-panel__heading">
            <strong>高性能共享存储</strong>
            <span>底层挂载方式：NFS</span>
          </div>
          <p className="purchase-inline-notice">
            请选择与当前站点匹配的共享存储空间。
          </p>
          <div className="purchase-field-pair">
            <FormField id="cloud-storage-space" label="共享存储空间" required error={errors['cloud-storage-space']}>
              <Select
                value={value.storageSpaceId}
                placeholder="请选择共享存储空间"
                options={storageSpaces.map((space) => ({ value: space.id, label: `${space.name} · ${space.displayCapacity}` }))}
                onValueChange={(storageSpaceId) => onChange({ ...value, storageSpaceId })}
              />
            </FormField>
            <FormField id="cloud-shared-mount-path" label="挂载路径" required error={errors['cloud-shared-mount-path']}>
              <Input value={value.sharedMountPath} placeholder="例如：/workspace/shared" onChange={(event) => onChange({ ...value, sharedMountPath: event.target.value })} />
            </FormField>
          </div>
          <Checkbox checked={value.sharedReadOnly} onCheckedChange={(sharedReadOnly) => onChange({ ...value, sharedReadOnly })}>
            以只读方式挂载
          </Checkbox>
        </div>
      )}
    </div>
  );
}
