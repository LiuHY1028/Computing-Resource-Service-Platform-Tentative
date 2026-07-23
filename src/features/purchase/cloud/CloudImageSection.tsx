import { CardRadio, RadioGroup } from '../../../components/ui';
import type { MarketplaceComputeType } from '../../marketplace';
import { getCompatiblePresetImages } from '../data/presetImages';

type CloudImageSectionProps = Readonly<{
  computeType: MarketplaceComputeType;
  value: string | null;
  onChange: (imageId: string | null) => void;
}>;

const NO_IMAGE_VALUE = 'no-image';

export function CloudImageSection({ computeType, value, onChange }: CloudImageSectionProps) {
  const images = getCompatiblePresetImages(computeType);
  return (
    <div className="purchase-image-section">
      <RadioGroup
        id="cloud-image-selection"
        className="purchase-image-grid"
        value={value ?? NO_IMAGE_VALUE}
        onValueChange={(imageId) => onChange(imageId === NO_IMAGE_VALUE ? null : imageId)}
      >
        <CardRadio
          value={NO_IMAGE_VALUE}
          title="不选择镜像"
          description="镜像为可选项"
        />
        {images.map((image) => (
          <CardRadio
            key={image.id}
            value={image.id}
            title={image.name}
            description={`${image.category} · ${image.operatingSystem} · ${image.environmentSummary}`}
          />
        ))}
      </RadioGroup>
      <p className="purchase-inline-notice">
        镜像为可选项；选择列表仅展示与当前 {computeType === 'gpu' ? 'GPU' : 'CPU'} 规格兼容的镜像。
      </p>
    </div>
  );
}
