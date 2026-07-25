import { useState } from 'react';
import { CardRadio, RadioGroup, UnderlineTabs } from '../../../components/ui';
import { getCompatibleImages, type ImageType, type PlatformImage } from '../../images';
import type { MarketplaceComputeType } from '../../marketplace';
import {
  getImagePrice,
  money,
  pricePolicyLabel,
} from '../../pricing';

type CloudImageSectionProps = Readonly<{
  computeType: MarketplaceComputeType;
  value: string | null;
  onChange: (imageId: string | null) => void;
}>;

const NO_IMAGE_VALUE = 'no-image';

function imageDescription(image: PlatformImage, source: ImageType) {
  const price = getImagePrice(image.id);
  return [
    source === 'public' ? '公共镜像' : '自定义镜像',
    image.operatingSystem,
    image.architecture,
    image.environmentSummary,
    price
      ? pricePolicyLabel(price.policy, money(price.monthlyPriceFen))
      : '价格待确认',
  ].join(' · ');
}

function ImageOptions({
  images,
  source,
  value,
  onChange,
}: Readonly<{
  images: readonly PlatformImage[];
  source: ImageType;
  value: string | null;
  onChange: (image: PlatformImage) => void;
}>) {
  if (images.length === 0) {
    return (
      <div className="purchase-image-empty" role="status">
        <strong>
          {source === 'public'
            ? '当前没有兼容的公共镜像'
            : '当前没有兼容且可用的自定义镜像'}
        </strong>
        <span>
          {source === 'public'
            ? '请更换云服务器规格后重试。'
            : '自定义镜像需处于“可用”状态，并与当前 CPU 或 GPU 规格兼容。'}
        </span>
      </div>
    );
  }

  return (
    <RadioGroup
      className="purchase-image-grid"
      name="cloud-image-selection"
      value={value ?? NO_IMAGE_VALUE}
      aria-label={source === 'public' ? '公共镜像列表' : '自定义镜像列表'}
      onValueChange={(imageId) => {
        const image = images.find((candidate) => candidate.id === imageId);
        if (image) onChange(image);
      }}
    >
      {images.map((image) => (
        <CardRadio
          key={image.id}
          value={image.id}
          title={image.name}
          description={imageDescription(image, source)}
        />
      ))}
    </RadioGroup>
  );
}

export function CloudImageSection({ computeType, value, onChange }: CloudImageSectionProps) {
  const images = getCompatibleImages(computeType);
  const publicImages = images.filter((image) => image.type === 'public');
  const customImages = images.filter((image) => image.type === 'custom');
  const selectedImage = images.find((image) => image.id === value);
  const [source, setSource] = useState<ImageType>(selectedImage?.type ?? 'public');

  return (
    <div className="purchase-image-section">
      <RadioGroup
        className="purchase-image-none"
        name="cloud-image-selection"
        value={value ?? NO_IMAGE_VALUE}
        aria-label="镜像使用方式"
        onValueChange={(imageId) => onChange(imageId === NO_IMAGE_VALUE ? null : imageId)}
      >
        <CardRadio
          value={NO_IMAGE_VALUE}
          title="不选择镜像"
          description="镜像为可选项"
        />
      </RadioGroup>

      <UnderlineTabs
        className="purchase-image-source-tabs"
        aria-label="镜像来源"
        value={source}
        onValueChange={(nextSource) => setSource(nextSource as ImageType)}
        items={[
          {
            value: 'public',
            label: `公共镜像 ${publicImages.length}`,
            panel: (
              <ImageOptions
                images={publicImages}
                source="public"
                value={value}
                onChange={(image) => {
                  setSource(image.type);
                  onChange(image.id);
                }}
              />
            ),
          },
          {
            value: 'custom',
            label: `自定义镜像 ${customImages.length}`,
            panel: (
              <ImageOptions
                images={customImages}
                source="custom"
                value={value}
                onChange={(image) => {
                  setSource(image.type);
                  onChange(image.id);
                }}
              />
            ),
          },
        ]}
      />

      <div className="purchase-image-selection" aria-live="polite">
        <span>当前选择</span>
        <strong>
          {selectedImage
            ? `${selectedImage.type === 'public' ? '公共镜像' : '自定义镜像'} · ${selectedImage.name}`
            : '不选择镜像'}
        </strong>
      </div>
      <p className="purchase-inline-notice">
        仅展示状态为“可用”且与当前 {computeType === 'gpu' ? 'GPU' : 'CPU'} 规格兼容的镜像。
      </p>
    </div>
  );
}
