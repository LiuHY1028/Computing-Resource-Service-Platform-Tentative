import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { resetBillStore } from '../features/bills';
import { resetOperationsStore } from '../features/operations';
import { resetOrderStore } from '../features/orders';
import { resetResourceStore } from '../features/resources';
import { resetSoftwareStore } from '../features/software';
import { resetStorageStore } from '../features/storage';

function renderPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function expectAtMostOneStatusPerRow() {
  const rows = [...document.querySelectorAll('.ui-table tbody tr')];
  expect(rows.length).toBeGreaterThan(0);
  rows.forEach((row) => {
    expect(row.querySelectorAll('.ui-status-badge').length).toBeLessThanOrEqual(1);
  });
}

describe('single visible status', () => {
  beforeEach(() => {
    resetBillStore();
    resetOperationsStore();
    resetOrderStore();
    resetResourceStore();
    resetSoftwareStore();
    resetStorageStore();
  });
  afterEach(cleanup);

  it.each([
    ['/console/resources/cloud-servers', '云服务器列表'],
    ['/console/resources/physical-machines', '物理机列表'],
    ['/console/storage', '存储列表'],
    ['/console/orders', '订单列表'],
    ['/console/bills', '账单列表'],
    ['/console/operation-records', '操作记录列表'],
  ])('renders no more than one status badge per object row at %s', async (path, tableName) => {
    renderPath(path);
    await screen.findByRole('table', { name: tableName });
    expectAtMostOneStatusPerRow();
  });

  it('keeps health and expiry as ordinary detail facts beneath one resource header status', async () => {
    renderPath('/console/resources/cloud-servers/cs-east-001');
    await screen.findByRole('heading', { name: '研发计算节点-01' });
    expect(
      document.querySelectorAll('.resource-detail-header .ui-status-badge'),
    ).toHaveLength(1);
    expect(
      document.querySelectorAll('.resource-detail-stack .ui-status-badge'),
    ).toHaveLength(0);
    expect(screen.getByText('实例健康')).toBeInTheDocument();
    expect(screen.getByText('到期状态')).toBeInTheDocument();
  });

  it('uses compatibility text rather than a second status badge on software cards', async () => {
    renderPath('/software');
    await screen.findByRole('heading', { name: '软件目录' });
    const cards = [...document.querySelectorAll('.software-card')];
    expect(cards.length).toBeGreaterThan(0);
    cards.forEach((card) => {
      expect(card.querySelectorAll('.ui-status-badge')).toHaveLength(1);
      expect(card.querySelector('.software-card__compatibility')).not.toBeNull();
    });
  });
});
