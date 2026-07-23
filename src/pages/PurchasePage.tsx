import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PromptModal } from '../components/ui';
import {
  CloudPurchaseForm,
  ConfigurationSummary,
  ConfirmationModal,
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
  type PurchaseProduct,
} from '../features/purchase';
import type { MarketplaceResourceType } from '../features/marketplace';
import '../features/purchase/purchase.css';

type LoadState =
  | Readonly<{ status: 'error'; message: string }>
  | Readonly<{ status: 'success'; product?: PurchaseProduct }>;

type PurchasePageProps = Readonly<{
  resourceType: MarketplaceResourceType;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product')?.trim() ?? '';
  const viewState = searchParams.get('viewState');
  const [retryAttempt, setRetryAttempt] = useState(0);
  const requestKey = `${resourceType}:${productId}:${viewState ?? 'normal'}:${retryAttempt}`;
  const [settledLoad, setSettledLoad] = useState<Readonly<{ requestKey: string; state: LoadState }>>();
  const [cloudConfiguration, setCloudConfiguration] = useState<CloudPurchaseConfiguration>();
  const [physicalConfiguration, setPhysicalConfiguration] = useState<PhysicalPurchaseConfiguration>();
  const [errors, setErrors] = useState<PurchaseFieldErrors>({});
  const [dirty, setDirty] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PurchaseSubmissionResult>();
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [liveMessage, setLiveMessage] = useState('');

  useEffect(() => {
    if (viewState === 'loading') {
      return undefined;
    }
    const controller = new AbortController();
    loadPurchaseProduct(productId, {
      signal: controller.signal,
      simulateError: viewState === 'error' && retryAttempt === 0,
    })
      .then((product) => {
        setSettledLoad({ requestKey, state: { status: 'success', product } });
        setErrors({});
        setResult(undefined);
        if (product?.resourceType === 'cloud-server' && resourceType === 'cloud-server' && product.configurable) {
          const initial = createInitialCloudConfiguration(product);
          const draft = loadPurchaseDraft<CloudPurchaseConfiguration>(product.id, resourceType);
          const restored = draft && isCloudDraft(draft)
            ? { ...initial, ...draft, imageId: draft.imageId || null, systemDiskGb: product.defaultSystemDiskGb, network: { ...initial.network, ...draft.network } }
            : initial;
          setCloudConfiguration(restored);
          setPhysicalConfiguration(undefined);
          setDirty(Boolean(draft));
          setLiveMessage(draft ? '已恢复当前商品在本次浏览会话中的草稿。' : '云服务器商品已加载。');
        } else if (product?.resourceType === 'physical-machine' && resourceType === 'physical-machine' && product.configurable) {
          const initial = createInitialPhysicalConfiguration();
          const draft = loadPurchaseDraft<PhysicalPurchaseConfiguration>(product.id, resourceType);
          const restored = draft && isPhysicalDraft(draft)
            ? { ...initial, ...draft, network: { ...initial.network, ...draft.network } }
            : initial;
          setPhysicalConfiguration(restored);
          setCloudConfiguration(undefined);
          setDirty(Boolean(draft));
          setLiveMessage(draft ? '已恢复当前商品在本次浏览会话中的草稿。' : '物理机商品已加载。');
        }
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSettledLoad({
          requestKey,
          state: {
            status: 'error',
            message: error instanceof Error ? error.message : '商品读取失败，请重试。',
          },
        });
      });
    return () => controller.abort();
  }, [productId, requestKey, resourceType, retryAttempt, viewState]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  const loadState =
    viewState === 'loading' || settledLoad?.requestKey !== requestKey
      ? undefined
      : settledLoad.state;
  const product = loadState?.status === 'success' ? loadState.product : undefined;
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

  function returnToMarketplace() {
    navigate(`/marketplace?type=${marketplaceType(resourceType)}`, {
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
    savePurchaseDraft(product.id, resourceType, next);
    if (Object.keys(errors).length) setErrors(validateCloudConfiguration(next).errors);
    setLiveMessage('配置已更新，并已保存为本次浏览会话的草稿。');
  }

  function updatePhysical(next: PhysicalPurchaseConfiguration) {
    if (!product || product.resourceType !== 'physical-machine') return;
    setPhysicalConfiguration(next);
    setDirty(true);
    savePurchaseDraft(product.id, resourceType, next);
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
    setConfirmationOpen(true);
    setLiveMessage('配置校验通过，已打开确认弹窗。');
  }

  async function submitPurchase() {
    if (!product || submitting) return;
    setSubmitting(true);
    setLiveMessage('正在提交配置。');
    try {
      const nextResult = await submitConfiguration(
        resourceType,
        product.name,
        product.resourceType === 'cloud-server' ? cloudSummary : physicalSummary,
      );
      clearPurchaseDraft(product.id);
      setDirty(false);
      setConfirmationOpen(false);
      setResult(nextResult);
      setLiveMessage('配置已提交。');
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
          navigate(`/orders/${encodeURIComponent(orderId)}`)
        }
      />
    );
  }

  if (!loadState) {
    return <PurchaseStatePanel tone="loading" title="正在读取所选商品" description="正在从资源商城加载所选规格…" onReturn={returnToMarketplace} />;
  }
  if (loadState.status === 'error') {
    return <PurchaseStatePanel tone="error" title="商品读取失败" description={loadState.message} onRetry={() => setRetryAttempt((value) => value + 1)} onReturn={returnToMarketplace} />;
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

  if (product.resourceType === 'cloud-server' && cloudConfiguration) {
    const validation = validateCloudConfiguration(cloudConfiguration);
    return (
      <>
        <PurchasePageLayout
          resourceType="cloud-server"
          title="配置云服务器"
          description="配置镜像、系统盘、数据存储与网络访问，并核对提交信息。"
          anchors={[
            { id: 'purchase-selected-product', label: '已选资源' },
            { id: 'purchase-basic-information', label: '基础信息' },
            { id: 'purchase-system-disk', label: '系统盘' },
            { id: 'purchase-data-storage', label: '数据盘' },
            { id: 'purchase-image', label: '镜像' },
            { id: 'purchase-network', label: '网络与访问' },
          ]}
          liveMessage={liveMessage}
          summary={<ConfigurationSummary title="云服务器配置" items={cloudSummary} missingItems={validation.missingItems} dirty={dirty} onConfirm={validateAndConfirm} onReturn={requestReturn} onClearDraft={clearDraft} />}
        >
          <SelectedProductSummary product={product} onReturn={requestReturn} onChangeProduct={requestReturn} />
          <CloudPurchaseForm product={product} value={cloudConfiguration} errors={errors} onChange={updateCloud} onConfirm={validateAndConfirm} onReturn={requestReturn} />
        </PurchasePageLayout>
        <ConfirmationModal open={confirmationOpen} resourceLabel="云服务器" productName={product.name} items={cloudSummary} submitting={submitting} onClose={() => setConfirmationOpen(false)} onSubmit={submitPurchase} />
        <PromptModal open={leaveOpen} title="离开当前配置？" description="当前配置尚未确认。离开后仍可在本次浏览会话中恢复草稿。" variant="warning" confirmLabel="确认离开" cancelLabel="继续配置" onClose={() => setLeaveOpen(false)} onConfirm={returnToMarketplace} />
      </>
    );
  }

  if (product.resourceType === 'physical-machine' && physicalConfiguration) {
    const validation = validatePhysicalConfiguration(physicalConfiguration);
    return (
      <>
        <PurchasePageLayout
          resourceType="physical-machine"
          title="配置物理机"
          description="确认整机规格、用途、交付流程和访问意向。操作系统配置以交付确认结果为准。"
          anchors={[
            { id: 'purchase-selected-product', label: '已选整机' },
            { id: 'purchase-basic-information', label: '使用信息' },
            { id: 'purchase-delivery', label: '交付说明' },
            { id: 'purchase-network', label: '网络意向' },
          ]}
          liveMessage={liveMessage}
          summary={<ConfigurationSummary title="物理机配置" items={physicalSummary} missingItems={validation.missingItems} dirty={dirty} onConfirm={validateAndConfirm} onReturn={requestReturn} onClearDraft={clearDraft} />}
        >
          <SelectedProductSummary product={product} onReturn={requestReturn} onChangeProduct={requestReturn} />
          <PhysicalPurchaseForm value={physicalConfiguration} errors={errors} onChange={updatePhysical} onConfirm={validateAndConfirm} onReturn={requestReturn} />
        </PurchasePageLayout>
        <ConfirmationModal open={confirmationOpen} resourceLabel="物理机" productName={product.name} items={physicalSummary} submitting={submitting} onClose={() => setConfirmationOpen(false)} onSubmit={submitPurchase} />
        <PromptModal open={leaveOpen} title="离开当前配置？" description="当前配置尚未确认。离开后仍可在本次浏览会话中恢复草稿。" variant="warning" confirmLabel="确认离开" cancelLabel="继续配置" onClose={() => setLeaveOpen(false)} onConfirm={returnToMarketplace} />
      </>
    );
  }

  return <PurchaseStatePanel title="配置初始化失败" description="无法为当前商品建立配置，请返回商城重新选择。" onReturn={returnToMarketplace} />;
}
