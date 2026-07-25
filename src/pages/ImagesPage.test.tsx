import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { resetImageStore } from '../features/images';
import { resetOperationsStore } from '../features/operations';

beforeEach(() => {
  resetImageStore();
  resetOperationsStore();
});

describe('ImagesPage', () => {
  it('shows only public and custom categories with source-specific actions', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/console/images?type=custom']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('tab', { name: '公共镜像' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '自定义镜像' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: '平台镜像' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '从云服务器制作' }));
    expect(screen.getByRole('dialog', { name: '从云服务器制作镜像' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '取消' }));

    await user.click(screen.getByRole('button', { name: '导入镜像文件' }));
    expect(screen.getByRole('dialog', { name: '导入镜像文件' })).toBeInTheDocument();
  });
});
