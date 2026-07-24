import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { resetImageStore } from '../features/images';
import { resetOperationsStore } from '../features/operations';

function renderImages() {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={['/console/images?type=custom']}>
      <App />
    </MemoryRouter>,
  );
  return user;
}

beforeEach(() => {
  resetImageStore();
  resetOperationsStore();
});

describe('ImagesPage modal transitions', () => {
  it('closes image editing without opening the delete confirmation', async () => {
    const user = renderImages();
    await user.click(screen.getByRole('button', { name: '编辑' }));
    expect(screen.getByRole('dialog', { name: '编辑自定义镜像' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '查看详情' }));
    const detail = screen.getByRole('dialog', { name: '镜像详情' });
    await user.click(within(detail).getByRole('button', { name: '编辑信息' }));
    await user.click(screen.getByRole('button', { name: '关闭弹窗' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
