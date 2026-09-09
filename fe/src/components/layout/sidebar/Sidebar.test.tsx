// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', isSuperAdmin: true }, hasPermission: () => true }),
}));
vi.mock('@/hooks/useEffectiveMenuKeys', () => ({
  useEffectiveMenuKeys: () => ({ moduleDefs: [], unassignedKeys: [], allEffectiveKeys: [] }),
}));

describe('Sidebar', () => {
  it('rail hiện 12 phân hệ với SuperAdmin', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(12);
  });

  it('panel mở đúng phân hệ của trang đang xem', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.getByText('Xuất kho')).toBeTruthy();
  });

  it('bấm lại phân hệ đang mở thì thu gọn panel', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Kho —/));
    expect(screen.queryByText('Xuất kho')).toBeNull();
  });
});
