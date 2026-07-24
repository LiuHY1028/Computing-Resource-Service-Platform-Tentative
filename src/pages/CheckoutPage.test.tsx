import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { getBillForOrder, resetBillStore } from '../features/bills';
import { failOrderPayment } from '../features/commerce';
import { getMarketplaceProductById } from '../features/marketplace';
import { getOrder, resetOrderStore } from '../features/orders';
import { calculateCloudPrice } from '../features/pricing';
import { createInitialCloudConfiguration } from '../features/purchase/data/initialConfigurations';
import { submitConfiguration } from '../features/purchase/state/purchaseStore';
import { resetResourceStore } from '../features/resources';

const memory = new Map<string, string>();

async function createOrder() {
  const product = getMarketplaceProductById('catalog-cloud-cpu-c8-east');
  if (!product || product.resourceType !== 'cloud-server') {
    throw new Error('Cloud product unavailable.');
  }
  return submitConfiguration(
    'cloud-server',
    product.name,
    [
      { label: '资源名称', value: '收银台资源' },
      { label: '站点', value: product.site },
      { label: '数量', value: '1' },
    ],
    calculateCloudPrice({
      skuId: product.skuId,
      billingMode: 'subscription',
      quantity: 1,
      durationMonths: 1,
      systemDiskGb: 30,
    }),
    product.skuId,
    {
      ...createInitialCloudConfiguration(product),
      instanceName: '收银台资源',
    },
  );
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    memory.clear();
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => memory.get(key) ?? null,
        removeItem: (key: string) => memory.delete(key),
        setItem: (key: string, value: string) => memory.set(key, value),
      },
    });
    resetBillStore();
    resetOrderStore();
    resetResourceStore();
  });

  it('pays one bill and renders the completed resource handoff', async () => {
    const result = await createOrder();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/checkout/${result.orderId}`]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: '收银台' })).toBeInTheDocument();
    expect(screen.getByText(result.orderId)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /账户余额/ })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '确认支付' }));
    expect(await screen.findByRole('heading', { name: '资源已开通' })).toBeInTheDocument();
    expect(getOrder(result.orderId)?.status).toBe('completed');
    expect(getBillForOrder(result.orderId)?.status).toBe('paid');
    expect(screen.getByRole('link', { name: '查看资源' })).toBeInTheDocument();
  });

  it('cancels an unpaid order and its bill from the checkout', async () => {
    const result = await createOrder();
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/checkout/${result.orderId}`]}>
        <App />
      </MemoryRouter>,
    );
    await screen.findByRole('heading', { name: '收银台' });
    await user.click(screen.getByRole('button', { name: '取消订单' }));
    await user.click(screen.getByRole('button', { name: '确认取消' }));
    expect(await screen.findByRole('heading', { name: '订单详情' })).toBeInTheDocument();
    expect(getOrder(result.orderId)?.status).toBe('cancelled');
    expect(getBillForOrder(result.orderId)?.status).toBe('cancelled');
  });

  it('shows a single payment-failed state and supports retry', async () => {
    const result = await createOrder();
    failOrderPayment(result.orderId);
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={[`/checkout/${result.orderId}`]}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByText('支付失败')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('付款未完成');
    await user.click(screen.getByRole('button', { name: '重新支付' }));
    expect(
      await screen.findByRole('heading', { name: '资源已开通' }),
    ).toBeInTheDocument();
    expect(getBillForOrder(result.orderId)?.status).toBe('paid');
  });
});
