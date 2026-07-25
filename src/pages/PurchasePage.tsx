import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PromptModal } from '../components/ui';
import { APP_PATHS, checkoutPath, orderDetailPath } from '../app/routes';
import {
  CloudPurchaseForm,
  ConfigurationSummary,
  PurchaseOrderConfirmation,
  PhysicalPurchaseForm,
  PurchasePageLayout,
  PurchaseStatePanel,
  PurchaseSuccessState,
  SelectedProductSummary,
  buildCloudSummary,
  buildPhysicalSummary,
  clearPurchaseDraft,
  createInitialCloudConfiguration,
  createInitialPhysicalConfiguration,
  isCloudDraft,
  isPhysicalDraft,
  loadPurchaseDraft,
  loadPurchaseProduct,
  savePurchaseDraft,
  submitConfiguration,
  validateCloudConfiguration,
  validatePhysicalConfiguration,
  type CloudPurchaseConfiguration,
  type PurchaseSubmissionResult,
  type PhysicalPurchaseConfiguration,
  type PurchaseFieldErrors,
} from '../features/purchase';
import {
  getDefaultMarketplaceProduct,
  type MarketplaceResourceType,
} from '../features/marketplace';
import {
  calculateCloudPrice,
  calculatePhysicalPrice,
} from '../features/pricing';
import { findStorageSpace } from '../features/storage';
import '../features/purchase/purchase.css';

type PurchasePageProps = Readonly<{
  resourceType: MarketplaceResourceType;
}>;

type PurchasePageContentProps = PurchasePageProps &
  Readonly<{
    productId: string;
  }>;

function marketplaceType(resourceType: MarketplaceResourceType) {
  return resourceType === 'cloud-server' ? 'cloud' : 'physical';
}

function focusFirstInvalid(fieldId?: string) {
  if (!fieldId) return;
  window.requestAnimationFrame(() => {
    const root = document.getElementById(fieldId);
    const target =
      root?.matches('input, button, textarea, [tabindex]')
        ? root
        : root?.querySelector<HTMLElement>('input, button, textarea, [tabindex]');
    (target instanceof HTMLElement ? target : root)?.focus();
    if (root && typeof root.scrollIntoView === 'function') {
      root.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

export function PurchasePage({ resourceType }: PurchasePageProps) {
  const [searchParams] = useSearchParams();
  const productId =
    searchParams.get('product')?.trim() ||
    getDefaultMarketplaceProduct(resourceType)?.id ||
    '';

  return (
    <PurchasePageContent
      key={`${resourceType}:${productId}`}
      productId={productId}
      resourceType={resourceType}
    />
  );
}

function PurchasePageContent({
  productId,
  resourceType,
}: PurchasePageContentProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const product = loadPurchaseProduct(productId);
  const draft =
    product?.resourceType === resourceType && product.configurable
      ? loadPurchaseDraft<
          CloudPurchaseConfiguration | PhysicalPurchaseConfiguration
        >(product.id, resourceType)
      : undefined;
  const [cloudConfiguration, setCloudConfiguration] =
    useState<CloudPurchaseConfiguration | undefined>(() => {
      if (
        product?.resourceType !== 'cloud-server' ||
        resourceType !== 'cloud-server' ||
        !product.configurable
      ) {
        return undefined;
      }
      const initial = createInitialCloudConfiguration(product);
      const restored = draft?.configuration;
      return restored && isCloudDraft(restored)
        ? {
            ...initial,
            ...restored,
            imageId: restored.imageId || null,
            systemDiskGb: product.defaultSystemDiskGb,
            network: { ...initial.network, ...restored.network },
          }
        : initial;
    });
  const [physicalConfiguration, setPhysicalConfiguration] =
    useState<PhysicalPurchaseConfiguration | undefined>(() => {
      if (
        product?.resourceType !== 'physical-machine' ||
        resourceType !== 'physical-machine' ||
        !product.configurable
      ) {
        return undefined;
      }
      const initial = createInitialPhysicalConfiguration();
      const restored = draft?.configuration;
      return restored && isPhysicalDraft(restored)
        ? { ...initial, ...restored, network: { ...initial.network, ...restored.network } }
        : initial;
    });
  const [errors, setErrors] = useState<PurchaseFieldErrors>({});
  const [dirty, setDirty] = useState(
    () => isCloudDraft(draft?.configuration) || isPhysicalDraft(draft?.configuration),
  );
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PurchaseSubmissionResult>();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState(() => {
    if (isCloudDraft(draft?.configuration) || isPhysicalDraft(draft?.configuration)) {
      return '已恢复当前商品在本次浏览会话中的草稿。';
    }
    if (product?.resourceType === 'cloud-server') {
      return '云服务器商品已就绪。';
    }
    if (product?.resourceType === 'physical-machine') {
      return '物理机商品已就绪。';
    }
    return '';
  });
  const requestedStep =
    searchParams.get('step') === 'confirmation' &&
    draft?.step === 'confirmation'
      ? 'confirmation'
      : 'configuration';

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const cloudSummary = useMemo(
    () => product?.resourceType === 'cloud-server' && cloudConfiguration
      ? buildCloudSummary(product, cloudConfiguration)
      : [],
    [cloudConfiguration, product],
  );
  const physicalSummary = useMemo(
    () => product?.resourceType === 'physical-machine' && physicalConfiguration
      ? buildPhysicalSummary(product, physicalConfiguration)
      : [],
    [physicalConfiguration, product],
  );
  const cloudQuote = useMemo(() => {
    if (product?.resourceType !== 'cloud-server' || !cloudConfiguration) {
      return undefined;
    }
    const existingSpace =
      cloudConfiguration.storageType === 'existing'
        ? findStorageSpace(cloudConfiguration.storageSpaceId)
        : undefined;
    return calculateCloudPrice({
      skuId: product.skuId,
      billingMode: cloudConfiguration.billingMode,
      quantity: Number(cloudConfiguration.quantity) || 1,
      durationMonths:
        cloudConfiguration.billingMode === 'subscription'
          ? Number(cloudConfiguration.periodMonths) as 1 | 3 | 6 | 12
          : undefined,
      systemDiskGb: cloudConfiguration.systemDiskGb,
      storage:
        cloudConfiguration.storageType === 'new'
          ? {
              skuId: cloudConfiguration.newStorageSkuId,
              capacityGb: cloudConfiguration.newStorageCapacityGb,
              label: `${cloudConfiguration.newStorageType === 'cloud-disk' ? '新购云硬盘' : '新购高性能共享存储'} · ${cloudConfiguration.newStorageCapacityGb} GB`,
            }
          : existingSpace
            ? {
                skuId: existingSpace.skuId,
                capacityGb: existingSpace.capacityGb,
                label: `${existingSpace.name} · ${existingSpace.capacityGb} GB`,
                included: true,
              }
            : undefined,
      imageId: cloudConfiguration.imageId,
    });
  }, [cloudConfiguration, product]);
  const physicalQuote = useMemo(() => {
    if (product?.resourceType !== 'physical-machine' || !physicalConfiguration) {
      return undefined;
    }
    return calculatePhysicalPrice({
      skuId: product.skuId,
      quantity: Number(physicalConfiguration.quantity) || 1,
      durationMonths: Number(physicalConfiguration.periodMonths) as 1 | 3 | 6 | 12,
    });
  }, [physicalConfiguration, product]);

  function returnToMarketplace() {
    navigate(`${APP_PATHS.marketplace}?type=${marketplaceType(resourceType)}`, {
      state: { restoreMarketplaceContext: true },
    });
  }

  function requestReturn() {
    if (dirty) setLeaveOpen(true);
    else returnToMarketplace();
  }

  function updateCloud(next: CloudPurchaseConfiguration) {
    if (!product || product.resourceType !== 'cloud-server') return;
    setCloudConfiguration(next);
    setDirty(true);
    savePurchaseDraft(product.id, resourceType, next, 'configuration');
    if (Object.keys(errors).length) setErrors(validateCloudConfiguration(next).errors);
    setLiveMessage('配置已更新，并已保存为本次浏览会话的草稿。');
  }

  function updatePhysical(next: PhysicalPurchaseConfiguration) {
    if (!product || product.resourceType !== 'physical-machine') return;
    setPhysicalConfiguration(next);
    setDirty(true);
    savePurchaseDraft(product.id, resourceType, next, 'configuration');
    if (Object.keys(errors).length) setErrors(validatePhysicalConfiguration(next).errors);
    setLiveMessage('配置已更新，并已保存为本次浏览会话的草稿。');
  }

  function validateAndConfirm() {
    if (product?.resourceType === 'cloud-server' && cloudConfiguration) {
      const validation = validateCloudConfiguration(cloudConfiguration);
      setErrors(validation.errors);
      if (validation.firstInvalidFieldId) {
        setLiveMessage(`配置尚未完成：${validation.missingItems.join('、')}。`);
        focusFirstInvalid(validation.firstInvalidFieldId);
        return;
      }
    } else if (product?.resourceType === 'physical-machine' && physicalConfiguration) {
      const validation = validatePhysicalConfiguration(physicalConfiguration);
      setErrors(validation.errors);
      if (validation.firstInvalidFieldId) {
        setLiveMessage(`配置尚未完成：${validation.missingItems.join('、')}。`);
        focusFirstInvalid(validation.firstInvalidFieldId);
        return;
      }
    } else return;
    const configuration =
      product.resourceType === 'cloud-server'
        ? cloudConfiguration!
        : physicalConfiguration!;
    savePurchaseDraft(product.id, resourceType, configuration, 'confirmation');
    const next = new URLSearchParams(searchParams);
    next.set('step', 'confirmation');
    setSearchParams(next);
    setLiveMessage('配置校验通过，请核对订单。');
  }

  async function submitPurchase() {
    if (!product || submitting) return;
    setSubmitting(true);
    setLiveMessage('正在创建订单。');
    try {
      const quote = product.resourceType === 'cloud-server' ? cloudQuote : physicalQuote;
      if (!quote) throw new Error('无法生成当前配置的费用明细。');
      const nextResult = await submitConfiguration(
        resourceType,
        product.name,
        product.resourceType === 'cloud-server' ? cloudSummary : physicalSummary,
        quote,
        product.skuId,
        product.resourceType === 'cloud-server'
          ? cloudConfiguration!
          : physicalConfiguration!,
      );
      setDirty(false);
      setLiveMessage(
        nextResult.orderStatus === 'awaiting-payment'
          ? '订单已创建，请完成支付。'
          : '按量订单已开通。',
      );
      if (nextResult.orderStatus === 'awaiting-payment') {
        navigate(checkoutPath(nextResult.orderId));
        clearPurchaseDraft(product.id);
        return;
      }
      clearPurchaseDraft(product.id);
      setResult(nextResult);
    } finally {
      setSubmitting(false);
    }
  }

  function clearDraft() {
    if (!product) return;
    clearPurchaseDraft(product.id);
    setErrors({});
    setDirty(false);
    if (product.resourceType === 'cloud-server') setCloudConfiguration(createInitialCloudConfiguration(product));
    else setPhysicalConfiguration(createInitialPhysicalConfiguration());
    setLiveMessage('已清除当前商品的草稿并恢复初始配置。');
  }

  if (result) {
    return (
      <PurchaseSuccessState
        result={result}
        onReturn={returnToMarketplace}
        onViewOrder={(orderId) =>
          navigate(orderDetailPath(orderId))
        }
        onPay={(orderId) => navigate(checkoutPath(orderId))}
      />
    );
  }

  if (!productId || !product) {
    return <PurchaseStatePanel tone="missing" title="未找到所选商品" description="URL 中的商品标识不存在或已不在当前资源目录中，请返回商城重新选择。" onReturn={returnToMarketplace} />;
  }
  if (product.resourceType !== resourceType) {
    return <PurchaseStatePanel tone="mismatch" title="商品类型与页面不匹配" description={`“${product.name}”不能在当前配置页面中使用，请返回对应资源类型的商城目录。`} onReturn={returnToMarketplace} />;
  }
  if (!product.configurable) {
    return <PurchaseStatePanel tone="unavailable" title="该商品暂不可配置" description={product.unavailableReason ?? '当前规格暂不可进入配置流程。'} onReturn={returnToMarketplace} />;
  }

  if (product.resourceType === 'cloud-server' && cloudConfiguration && cloudQuote) {
    const validation = validateCloudConfiguration(cloudConfiguration);
    if (requestedStep === 'confirmation' && draft?.step === 'confirmation') {
      return (
        <PurchaseOrderConfirmation
          resourceLabel="云服务器"
          productName={product.name}
          items={cloudSummary}
          quote={cloudQuote}
          submitting={submitting}
          onBack={() => {
            savePurchaseDraft(product.id, resourceType, cloudConfiguration, 'configuration');
            const next = new URLSearchParams(searchParams);
            next.delete('step');
            setSearchParams(next);
          }}
          onSubmit={() => void submitPurchase()}
        />
      );
    }
    return (
      <>
        <PurchasePageLayout
          resourceType="cloud-server"
          title="配置云服务器"
          description="配置镜像、系统盘、数据存储与网络访问，确认价格后创建订单。"
          anchors={[
            { id: 'purchase-selected-product', label: '已选资源' },
            { id: 'purchase-billing', label: '计费配置' },
            { id: 'purchase-basic-information', label: '基础信息' },
            { id: 'purchase-system-disk', label: '系统盘' },
            { id: 'purchase-data-storage', label: '数据盘' },
            { id: 'purchase-image', label: '镜像' },
            { id: 'purchase-network', label: '网络与访问' },
          ]}
          liveMessage={liveMessage}
          currentStep="configuration"
          summary={<ConfigurationSummary title="云服务器配置" items={cloudSummary} quote={cloudQuote} missingItems={validation.missingItems} dirty={dirty} onConfirm={validateAndConfirm} onReturn={requestReturn} onClearDraft={clearDraft} />}
        >
          <SelectedProductSummary product={product} onReturn={requestReturn} onChangeProduct={requestReturn} />
          <CloudPurchaseForm product={product} value={cloudConfiguration} errors={errors} onChange={updateCloud} onConfirm={validateAndConfirm} onReturn={requestReturn} />
        </PurchasePageLayout>
        <PromptModal open={leaveOpen} title="离开当前配置？" description="当前配置尚未确认。离开后仍可在本次浏览会话中恢复草稿。" variant="warning" confirmLabel="确认离开" cancelLabel="继续配置" onClose={() => setLeaveOpen(false)} onConfirm={returnToMarketplace} />
      </>
    );
  }

  if (product.resourceType === 'physical-machine' && physicalConfiguration && physicalQuote) {
    const validation = validatePhysicalConfiguration(physicalConfiguration);
    if (requestedStep === 'confirmation' && draft?.step === 'confirmation') {
      return (
        <PurchaseOrderConfirmation
          resourceLabel="物理机"
          productName={product.name}
          items={physicalSummary}
          quote={physicalQuote}
          submitting={submitting}
          onBack={() => {
            savePurchaseDraft(product.id, resourceType, physicalConfiguration, 'configuration');
            const next = new URLSearchParams(searchParams);
            next.delete('step');
            setSearchParams(next);
          }}
          onSubmit={() => void submitPurchase()}
        />
      );
    }
    return (
      <>
        <PurchasePageLayout
          resourceType="physical-machine"
          title="配置物理机"
          description="确认整机规格、使用周期和访问意向，核对价格后创建订单。"
          anchors={[
            { id: 'purchase-selected-product', label: '已选整机' },
            { id: 'purchase-basic-information', label: '使用信息' },
            { id: 'purchase-delivery', label: '交付说明' },
            { id: 'purchase-network', label: '网络意向' },
          ]}
          liveMessage={liveMessage}
          currentStep="configuration"
          summary={<ConfigurationSummary title="物理机配置" items={physicalSummary} quote={physicalQuote} missingItems={validation.missingItems} dirty={dirty} onConfirm={validateAndConfirm} onReturn={requestReturn} onClearDraft={clearDraft} />}
        >
          <SelectedProductSummary product={product} onReturn={requestReturn} onChangeProduct={requestReturn} />
          <PhysicalPurchaseForm value={physicalConfiguration} errors={errors} onChange={updatePhysical} onConfirm={validateAndConfirm} onReturn={requestReturn} />
        </PurchasePageLayout>
        <PromptModal open={leaveOpen} title="离开当前配置？" description="当前配置尚未确认。离开后仍可在本次浏览会话中恢复草稿。" variant="warning" confirmLabel="确认离开" cancelLabel="继续配置" onClose={() => setLeaveOpen(false)} onConfirm={returnToMarketplace} />
      </>
    );
  }

  return <PurchaseStatePanel title="配置初始化失败" description="无法为当前商品建立配置，请返回商城重新选择。" onReturn={returnToMarketplace} />;
}
