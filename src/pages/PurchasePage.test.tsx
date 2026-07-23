import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app/App';

vi.mock('../features/purchase/services/purchaseRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/purchase/services/purchaseRepository')>();
  return {
    ...actual,
    loadPurchaseProduct: (
      productId: string,
      options: Parameters<typeof actual.loadPurchaseProduct>[1] = {},
    ) => actual.loadPurchaseProduct(productId, { ...options, delayMs: 0 }),
  };
});

function renderPurchase(path: string) {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
  return user;
}

async function waitForCloud() {
  await screen.findByRole('heading', { level: 1, name: '配置云服务器' });
  await screen.findByRole('button', { name: '返回商城' });
}

async function waitForPhysical() {
  await screen.findByRole('heading', { level: 1, name: '配置物理机' });
  await screen.findByRole('button', { name: '返回商城' });
}

describe('PurchasePage', () => {
  beforeEach(() => window.sessionStorage.clear());

  it('uses the standard title bar, fixed system disk, and submits without an image', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();

    const pageTitle = screen.getByRole('heading', { level: 1, name: '配置云服务器' });
    expect(pageTitle.closest('.page-title-bar')).toBeInTheDocument();
    expect(document.querySelector('.purchase-guide')).toBeNull();
    expect(screen.getByLabelText('配置说明')).toBeInTheDocument();
    expect(screen.getAllByText('30 GB').length).toBeGreaterThan(0);
    expect(screen.getByText('当前系统盘容量不可修改')).toBeInTheDocument();
    expect(screen.getByText(/该值表示存储容量，不是内存/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '数据盘' })).toBeInTheDocument();
    const systemDiskSection = screen.getByRole('heading', { name: '系统盘' }).closest('section');
    expect(systemDiskSection).not.toBeNull();
    expect(within(systemDiskSection as HTMLElement).queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: /GPU 计算运行镜像/ })).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /不选择镜像/ })).toBeChecked();
    expect(screen.getByText('未选择（可选）')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '确认配置' })[0]!);
    expect(screen.getByText('请输入实例名称。')).toBeInTheDocument();
    expect(screen.queryByText(/请选择一个兼容的镜像/)).not.toBeInTheDocument();
    expect(screen.getByText('还有 1 项必填项待完成')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/实例名称/)).toHaveFocus());

    await user.type(screen.getByLabelText(/实例名称/), 'cloud-resource-01');
    await user.click(screen.getAllByRole('button', { name: '确认配置' })[0]!);

    const confirmation = screen.getByRole('dialog', { name: '确认配置' });
    expect(confirmation).toBeInTheDocument();
    expect(within(confirmation).getByText('未选择（可选）')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: '提交配置' });
    await user.click(submit);
    expect(submit).toBeDisabled();
    expect(await screen.findByRole('heading', { name: '配置已提交' }, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText(/^REQ-\d{8}-\d{4}$/)).toBeInTheDocument();
    expect(screen.getByText('等待资源准备')).toBeInTheDocument();
    expect(screen.getByText('连接信息将在资源就绪后生成。')).toBeInTheDocument();
  });

  it('lets users select an image and switch back to no image', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();

    const noImage = screen.getByRole('radio', { name: /不选择镜像/ });
    const baseImage = screen.getByRole('radio', { name: /基础 Linux 运行镜像/ });
    expect(noImage).toBeChecked();

    await user.click(baseImage);
    expect(baseImage).toBeChecked();
    expect(screen.getByRole('complementary', { name: '云服务器配置' })).toHaveTextContent('基础 Linux 运行镜像');

    await user.click(noImage);
    expect(noImage).toBeChecked();
    expect(screen.getByRole('complementary', { name: '云服务器配置' })).toHaveTextContent('未选择（可选）');
  });

  it('uses a compact shared summary without internal scrolling', async () => {
    renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();

    const summary = screen.getByRole('complementary', { name: '云服务器配置' });
    expect(within(summary).getByRole('heading', { name: '商品摘要' })).toBeInTheDocument();
    expect(within(summary).getByRole('heading', { name: '配置摘要' })).toBeInTheDocument();
    expect(summary).toHaveTextContent('商品名称通用计算 C8');
    expect(summary).toHaveTextContent('系统盘30 GB');
    expect(summary).toHaveTextContent('数据盘未挂载');
    expect(summary).toHaveTextContent('网络访问SSH未启用 · 0条端口规则');
    expect(summary).toHaveTextContent('使用说明未填写（可选）');
    expect(['auto', 'scroll']).not.toContain(getComputedStyle(summary).overflowY);

    const rail = document.querySelector<HTMLElement>('.purchase-sticky-rail');
    expect(rail).not.toBeNull();
    expect(['auto', 'scroll']).not.toContain(getComputedStyle(rail as HTMLElement).overflowY);
    expect(getComputedStyle(rail as HTMLElement).maxHeight).not.toMatch(/\d/);
  });

  it('switches cloud data-storage types and clears hidden values', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();

    await user.click(screen.getByRole('radio', { name: /本地数据存储/ }));
    await user.type(screen.getByLabelText(/主机路径/), '/data/project');
    await user.type(screen.getByLabelText(/容器挂载路径/), '/workspace/data');
    expect(screen.getByText(/底层挂载方式：HostPath/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /高性能共享存储/ }));
    expect(screen.queryByLabelText(/主机路径/)).not.toBeInTheDocument();
    expect(screen.getByText(/底层挂载方式：NFS/)).toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /共享存储空间/ }));
    await user.click(screen.getByRole('option', { name: /研发共享存储/ }));
    await user.type(screen.getByLabelText(/^挂载路径/), '/workspace/shared');
    expect(screen.getAllByText(/高性能共享存储/).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('radio', { name: /本地数据存储/ }));
    expect(screen.getByLabelText(/主机路径/)).toHaveValue('');
    expect(screen.getByLabelText(/容器挂载路径/)).toHaveValue('');
    await user.click(screen.getByRole('radio', { name: /不挂载数据盘/ }));
    expect(screen.queryByLabelText(/主机路径/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^挂载路径/)).not.toBeInTheDocument();
  });

  it('validates SSH source and supports add, edit, and confirmed deletion of port rules', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-gpu-g1-east');
    await waitForCloud();

    await user.click(screen.getByRole('checkbox', { name: '启用 SSH 访问' }));
    await user.type(screen.getByLabelText(/SSH 允许来源/), '999.1.1.1');
    await user.click(screen.getAllByRole('button', { name: '确认配置' })[0]!);
    expect(screen.getByText(/有效的 IPv4 地址或 CIDR/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/SSH 允许来源/));
    await user.type(screen.getByLabelText(/SSH 允许来源/), '192.0.2.0/24');

    await user.click(screen.getByRole('button', { name: '新增端口规则' }));
    const dialog = screen.getByRole('dialog', { name: '新增端口规则' });
    await user.click(within(dialog).getByRole('button', { name: '添加规则' }));
    expect(within(dialog).getAllByText(/服务端口必须是 1 至 65535/).length).toBeGreaterThan(0);
    await waitFor(() => expect(within(dialog).getByLabelText(/服务端口/)).toHaveFocus());
    await user.type(within(dialog).getByLabelText(/服务端口/), '8080');
    await user.type(within(dialog).getByLabelText(/映射端口/), '80');
    await user.type(within(dialog).getByLabelText(/^允许来源/), '192.0.2.0/24');
    await user.type(within(dialog).getByLabelText('说明'), '端口服务');
    expect(within(dialog).getByLabelText(/服务端口/)).toHaveValue('8080');
    expect(within(dialog).getByLabelText(/映射端口/)).toHaveValue('80');
    expect(within(dialog).getByLabelText(/^允许来源/)).toHaveValue('192.0.2.0/24');
    await user.click(within(dialog).getByRole('button', { name: '添加规则' }));
    await waitFor(() => expect(screen.getByRole('table', { name: '端口规则' })).toHaveTextContent('8080'));

    await user.click(screen.getByRole('button', { name: '编辑' }));
    const editDialog = screen.getByRole('dialog', { name: '编辑端口规则' });
    await user.clear(within(editDialog).getByLabelText(/服务端口/));
    await user.type(within(editDialog).getByLabelText(/服务端口/), '8081');
    await user.click(within(editDialog).getByRole('button', { name: '保存修改' }));
    expect(screen.getByRole('table', { name: '端口规则' })).toHaveTextContent('8081');

    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(screen.getByRole('alertdialog', { name: '删除端口规则' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(screen.getByText('暂无端口规则')).toBeInTheDocument();
  });

  it('keeps the physical-machine flow distinct and submits without cloud storage or images', async () => {
    const user = renderPurchase('/marketplace/physical-machine/purchase?product=catalog-physical-cpu-p1-east');
    await waitForPhysical();

    const pageTitle = screen.getByRole('heading', { level: 1, name: '配置物理机' });
    expect(pageTitle.closest('.page-title-bar')).toBeInTheDocument();
    expect(document.querySelector('.purchase-guide')).toBeNull();
    expect(screen.getByRole('heading', { name: '交付方式' })).toBeInTheDocument();
    expect(screen.getByText('申请受理后进入资源准备和基础初始化')).toBeInTheDocument();
    expect(screen.getByText(/资源交付完成后，可在“我的资源”中查看服务器连接信息/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '交付信息' })).toBeInTheDocument();
    expect(screen.getByText(/资源名称、资源 ID、资源状态、所属站点/)).toBeInTheDocument();
    expect(screen.getByText(/内网 IP、公网 IP（按网络策略分配/)).toBeInTheDocument();
    expect(screen.getByText(/开通时间、到期时间/)).toBeInTheDocument();
    expect(screen.getByText(/BMC\/IPMI 管理地址仅向具备权限的用户展示/)).toBeInTheDocument();
    expect(screen.queryByText(/交付方式仍待规则确认/)).not.toBeInTheDocument();
    expect(screen.queryByText(/待确认事项：OQ-015/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '系统盘' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '数据盘' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '镜像' })).not.toBeInTheDocument();
    expect(screen.queryByText('HostPath')).not.toBeInTheDocument();
    expect(screen.queryByText('NFS')).not.toBeInTheDocument();
    const summary = screen.getByRole('complementary', { name: '物理机配置' });
    expect(within(summary).getByRole('heading', { name: '商品摘要' })).toBeInTheDocument();
    expect(within(summary).getByRole('heading', { name: '配置摘要' })).toBeInTheDocument();
    expect(['auto', 'scroll']).not.toContain(getComputedStyle(summary).overflowY);
    expect(summary).toHaveTextContent('交付方式申请受理后进入资源准备与基础初始化');
    expect(summary).toHaveTextContent('认证方式SSH 密钥');
    expect(summary).toHaveTextContent('连接信息资源交付完成后在“我的资源”提供');

    await user.type(screen.getByLabelText(/资源名称/), 'physical-resource-01');
    await user.click(screen.getByRole('checkbox', { name: '记录 SSH 访问意向' }));
    await user.type(screen.getByLabelText(/SSH 允许来源/), '192.0.2.0/24');
    await user.click(screen.getAllByRole('button', { name: '确认配置' })[0]!);
    const confirmation = screen.getByRole('dialog', { name: '确认配置' });
    expect(confirmation).toHaveTextContent('交付方式申请受理后进入资源准备与基础初始化');
    expect(confirmation).toHaveTextContent('认证方式SSH 密钥');
    expect(confirmation).toHaveTextContent('连接信息资源交付完成后在“我的资源”提供');
    await user.click(screen.getByRole('button', { name: '提交配置' }));
    expect(await screen.findByText(/^REQ-\d{8}-\d{4}$/, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '交付流程' })).toBeInTheDocument();
    expect(screen.getByText('申请受理后进入资源准备')).toBeInTheDocument();
    expect(screen.getByText('部署完成后将在“我的资源”中提供连接信息。')).toBeInTheDocument();
    expect(screen.getAllByText('等待资源交付').length).toBeGreaterThan(0);
    expect(screen.getByText('按网络策略分配')).toBeInTheDocument();
    expect(screen.getAllByText('资源就绪后生成').length).toBeGreaterThan(0);
  });

  it.each([
    ['/marketplace/cloud-server/purchase?product=missing-catalog-product', '未找到所选商品'],
    ['/marketplace/physical-machine/purchase?product=catalog-cloud-cpu-c8-east', '商品类型与页面不匹配'],
    ['/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c16-west', '该商品暂不可配置'],
  ])('covers product state %s', async (path, title) => {
    renderPurchase(path);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  });

  it('keeps loading persistent and turns the error into a retryable success', async () => {
    const { unmount } = render(<MemoryRouter initialEntries={['/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east&viewState=loading']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: '正在读取所选商品' })).toBeInTheDocument();
    unmount();

    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east&viewState=error');
    expect(await screen.findByRole('heading', { name: '商品读取失败' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重试' }));
    await waitForCloud();
  });

  it('shows a leave confirmation for modified drafts and keeps the form when cancelled', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();
    await user.type(screen.getByLabelText(/实例名称/), 'draft-name');
    await user.click(screen.getAllByRole('button', { name: '返回资源商城' })[0]!);
    expect(screen.getByRole('alertdialog', { name: '离开当前配置？' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '继续配置' }));
    expect(screen.getByLabelText(/实例名称/)).toHaveValue('draft-name');
    expect(window.sessionStorage.getItem('purchase-draft:v1:catalog-cloud-cpu-c8-east')).toContain('draft-name');
  });
});
