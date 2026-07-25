import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';

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

  it('uses the marketplace purchase header, fixed system disk, and submits without an image', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();

    const pageTitle = screen.getByRole('heading', { level: 1, name: '配置云服务器' });
    expect(pageTitle.closest('.purchase-page__header')).toBeInTheDocument();
    expect(document.querySelector('.purchase-guide')).toBeNull();
    expect(screen.getByRole('navigation', { name: '购买进度' })).toBeInTheDocument();
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

    await user.click(screen.getAllByRole('button', { name: '确认订单' })[0]!);
    expect(screen.getByText('请输入实例名称。')).toBeInTheDocument();
    expect(screen.queryByText(/请选择一个兼容的镜像/)).not.toBeInTheDocument();
    expect(screen.getByText('还有 1 项必填项待完成')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(/实例名称/)).toHaveFocus());

    await user.type(screen.getByLabelText(/实例名称/), 'cloud-resource-01');
    await user.click(screen.getAllByRole('button', { name: '确认订单' })[0]!);

    const confirmation = screen.getByRole('heading', { level: 1, name: '确认订单' }).closest('section');
    expect(confirmation).toBeInTheDocument();
    expect(within(confirmation as HTMLElement).getByText('未选择（可选）')).toBeInTheDocument();
    const submit = screen.getByRole('button', { name: '创建订单并支付' });
    await user.click(submit);
    expect(await screen.findByRole('heading', { name: '核对订单与付款' }, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByText(/^ORD-\d{8}-\d{4}$/)).toBeInTheDocument();
    expect(screen.getByText('待支付')).toBeInTheDocument();
  });

  it('lets users select public and custom images and switch back to no image', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();

    const noImage = screen.getByRole('radio', { name: /不选择镜像/ });
    expect(screen.getByRole('tab', { name: '公共镜像 2' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: '自定义镜像 1' })).toBeInTheDocument();
    const baseImage = screen.getByRole('radio', { name: /基础 Linux 运行镜像/ });
    expect(noImage).toBeChecked();

    await user.click(baseImage);
    expect(baseImage).toBeChecked();
    expect(screen.getByText('公共镜像 · 基础 Linux 运行镜像')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '云服务器配置' })).toHaveTextContent('基础 Linux 运行镜像');

    await user.click(screen.getByRole('tab', { name: '自定义镜像 1' }));
    const customImage = screen.getByRole('radio', { name: /团队运行环境/ });
    await user.click(customImage);
    expect(customImage).toBeChecked();
    expect(screen.getByText('自定义镜像 · 团队运行环境')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: '云服务器配置' })).toHaveTextContent('团队运行环境');

    await user.click(noImage);
    expect(noImage).toBeChecked();
    expect(screen.getByRole('complementary', { name: '云服务器配置' })).toHaveTextContent('未选择（可选）');
  });

  it('explains when a GPU product has no compatible custom image', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-gpu-g1-east');
    await waitForCloud();

    expect(screen.getByRole('tab', { name: '公共镜像 3' })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '自定义镜像 0' }));
    const customPanel = screen.getByRole('tabpanel');
    expect(within(customPanel).getByRole('status')).toHaveTextContent('当前没有兼容且可用的自定义镜像');
    expect(within(customPanel).getByRole('status')).toHaveTextContent('需处于“可用”状态');
  });

  it('updates the quote for billing mode, duration, quantity and image price', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();
    const summary = screen.getByRole('complementary', { name: '云服务器配置' });
    expect(summary).toHaveTextContent('预计总费用¥680');
    expect(summary).toHaveTextContent('30 GB 系统盘已包含');

    const quantity = screen.getByLabelText(/实例数量/);
    await user.clear(quantity);
    await user.type(quantity, '2');
    expect(summary).toHaveTextContent('预计总费用¥1,360');

    await user.click(screen.getByLabelText(/购买时长/));
    await user.click(screen.getByRole('option', { name: '3 个月' }));
    expect(summary).toHaveTextContent('预计总费用¥4,080');

    await user.click(screen.getByRole('radio', { name: /开发工具链镜像/ }));
    expect(summary).toHaveTextContent('预计总费用¥5,160');

    await user.click(screen.getByRole('radio', { name: /按量/ }));
    expect(screen.queryByLabelText(/购买时长/)).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: /自动续费/ })).not.toBeInTheDocument();
    expect(summary).toHaveTextContent('预计每小时费用¥2.70');
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

  it('switches between new, existing and no independent storage', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();

    await user.click(screen.getByRole('radio', { name: /购买新存储/ }));
    expect(screen.getByRole('combobox', { name: /存储类型/ })).toHaveTextContent('云硬盘');
    expect(screen.getByLabelText(/容量/)).toHaveValue(100);
    await user.clear(screen.getByLabelText(/挂载路径/));
    await user.type(screen.getByLabelText(/挂载路径/), '/workspace/data');
    expect(screen.getByText('统一 GB/月价格')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /选择已有存储/ }));
    expect(screen.queryByLabelText(/容量/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('combobox', { name: /^存储/ }));
    await user.click(screen.getByRole('option', { name: /研发共享存储/ }));
    expect(screen.getByRole('combobox', { name: /^存储/ })).toHaveTextContent('研发共享存储');

    await user.click(screen.getByRole('radio', { name: /暂不挂载/ }));
    expect(screen.queryByRole('combobox', { name: /^存储/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^挂载路径/)).not.toBeInTheDocument();
  });

  it('validates SSH source and supports add, edit, and confirmed deletion of port rules', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-gpu-g1-east');
    await waitForCloud();

    await user.click(screen.getByRole('checkbox', { name: '启用 SSH 访问' }));
    await user.type(screen.getByLabelText(/SSH 允许来源/), '999.1.1.1');
    await user.click(screen.getAllByRole('button', { name: '确认订单' })[0]!);
    expect(screen.getByText(/有效的 IPv4 地址或 CIDR/)).toBeInTheDocument();
    await user.clear(screen.getByLabelText(/SSH 允许来源/));
    await user.type(screen.getByLabelText(/SSH 允许来源/), '192.0.2.0/24');

    await user.click(screen.getByRole('button', { name: '新增访问规则' }));
    const dialog = screen.getByRole('dialog', { name: '新增访问规则' });
    await user.click(within(dialog).getByRole('button', { name: /自定义/ }));
    await user.click(within(dialog).getByRole('button', { name: '添加规则' }));
    expect(within(dialog).getAllByText(/访问端口必须是 1 至 65535/).length).toBeGreaterThan(0);
    fireEvent.change(within(dialog).getByLabelText(/访问端口/), {
      target: { value: '8080' },
    });
    fireEvent.change(within(dialog).getByLabelText('说明'), {
      target: { value: '端口服务' },
    });
    expect(within(dialog).getByLabelText(/访问端口/)).toHaveValue('8080');
    expect(within(dialog).getByLabelText('CIDR')).toHaveValue('10.0.0.0/8');
    await user.click(within(dialog).getByRole('button', { name: '添加规则' }));
    await waitFor(() => expect(screen.getByRole('table', { name: '访问规则' })).toHaveTextContent('8080'));

    await user.click(screen.getByRole('button', { name: '编辑' }));
    const editDialog = screen.getByRole('dialog', { name: '编辑访问规则' });
    fireEvent.change(within(editDialog).getByLabelText(/访问端口/), {
      target: { value: '8081' },
    });
    await user.click(within(editDialog).getByRole('button', { name: '保存修改' }));
    expect(screen.getByRole('table', { name: '访问规则' })).toHaveTextContent('8081');

    await user.click(screen.getByRole('button', { name: '删除' }));
    expect(screen.getByRole('alertdialog', { name: '删除访问规则' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(screen.getByText('暂无其他访问规则')).toBeInTheDocument();
  }, 10_000);

  it('keeps the physical-machine flow distinct and submits without cloud storage or images', async () => {
    const user = renderPurchase('/marketplace/physical-machine/purchase?product=catalog-physical-cpu-p1-east');
    await waitForPhysical();

    const pageTitle = screen.getByRole('heading', { level: 1, name: '配置物理机' });
    expect(pageTitle.closest('.purchase-page__header')).toBeInTheDocument();
    expect(document.querySelector('.purchase-guide')).toBeNull();
    expect(screen.getByRole('heading', { name: '交付方式' })).toBeInTheDocument();
    expect(screen.getByText('支付完成后进入资源准备和基础初始化')).toBeInTheDocument();
    expect(screen.getByText(/资源交付完成后，可在“我的资源”中查看服务器连接信息/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '交付信息' })).toBeInTheDocument();
    expect(screen.getByText(/资源名称、资源 ID、资源状态、所属站点/)).toBeInTheDocument();
    expect(screen.getByText(/内网 IP、公网 IP（按网络策略分配/)).toBeInTheDocument();
    expect(screen.getByText(/开通时间、到期时间/)).toBeInTheDocument();
    expect(screen.getByText(/连接凭据与 BMC\/IPMI 管理信息必须由真实基础设施安全交付/)).toBeInTheDocument();
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
    expect(summary).toHaveTextContent('开通方式支付后进入资源准备与基础初始化');
    expect(summary).toHaveTextContent('认证方式SSH 密钥');
    expect(summary).toHaveTextContent('连接信息资源交付完成后在“我的资源”提供');

    await user.type(screen.getByLabelText(/资源名称/), 'physical-resource-01');
    await user.click(screen.getByRole('checkbox', { name: '记录 SSH 访问意向' }));
    await user.type(screen.getByLabelText(/SSH 允许来源/), '192.0.2.0/24');
    await user.click(screen.getAllByRole('button', { name: '确认订单' })[0]!);
    const confirmation = screen.getByRole('heading', { level: 1, name: '确认订单' }).closest('section');
    expect(confirmation).toHaveTextContent('开通方式支付后进入资源准备与基础初始化');
    expect(confirmation).toHaveTextContent('认证方式SSH 密钥');
    expect(confirmation).toHaveTextContent('连接信息资源交付完成后在“我的资源”提供');
    await user.click(screen.getByRole('button', { name: '创建订单并支付' }));
    expect(await screen.findByText(/^ORD-\d{8}-\d{4}$/, {}, { timeout: 2000 })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '核对订单与付款' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认支付' })).toBeInTheDocument();
  });

  it.each([
    ['/marketplace/cloud-server/purchase?product=missing-catalog-product', '未找到所选商品'],
    ['/marketplace/physical-machine/purchase?product=catalog-cloud-cpu-c8-east', '商品类型与页面不匹配'],
    ['/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c16-west', '该商品暂不可配置'],
  ])('covers product state %s', async (path, title) => {
    renderPurchase(path);
    expect(await screen.findByRole('heading', { name: title })).toBeInTheDocument();
  });

  it.each([
    ['/marketplace/cloud-server/purchase', '配置云服务器'],
    ['/marketplace/physical-machine/purchase', '配置物理机'],
  ])('opens the default configurable product at %s', async (path, title) => {
    renderPurchase(path);
    expect(
      await screen.findByRole('heading', { name: title }),
    ).toBeInTheDocument();
  });

  it('shows a leave confirmation for modified drafts and keeps the form when cancelled', async () => {
    const user = renderPurchase('/marketplace/cloud-server/purchase?product=catalog-cloud-cpu-c8-east');
    await waitForCloud();
    const instanceName = screen.getByLabelText(/实例名称/);
    await user.clear(instanceName);
    await user.type(instanceName, 'draft-name');
    await user.click(screen.getAllByRole('button', { name: '返回资源商城' })[0]!);
    expect(screen.getByRole('alertdialog', { name: '离开当前配置？' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '继续配置' }));
    expect(screen.getByLabelText(/实例名称/)).toHaveValue('draft-name');
    expect(window.sessionStorage.getItem('purchase-draft:v2:catalog-cloud-cpu-c8-east')).toContain('draft-name');
  });
});
