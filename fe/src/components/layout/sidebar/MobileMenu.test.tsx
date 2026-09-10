// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MobileMenu } from './MobileMenu';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', isSuperAdmin: true }, hasPermission: () => true }),
}));
vi.mock('@/hooks/useEffectiveMenuKeys', () => ({
  useEffectiveMenuKeys: () => ({ moduleDefs: [], unassignedKeys: [], allEffectiveKeys: [] }),
}));

describe('MobileMenu', () => {
  it('lớp 1 liệt kê phân hệ, chưa hiện mục con', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Kho')).toBeTruthy();
    expect(screen.queryByText('Nhập kho')).toBeNull();
  });

  it('chọn phân hệ thì trượt sang lớp 2, dùng đúng danh sách của panel', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText('Kho'));
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.getByText('Quy trình')).toBeTruthy();
  });

  // Trên điện thoại không có ModulePanel — 4 trang thư viện chung vào qua
  // phân hệ Thư viện ở lớp 1, như mọi phân hệ khác.
  it('lớp 1 có phân hệ Thư viện, mở ra đủ 4 thư viện chung', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText('Thư viện'));
    for (const nhan of ['Quy trình', 'Chính sách', 'Biểu mẫu', 'Hướng dẫn']) {
      expect(screen.getByText(nhan)).toBeTruthy();
    }
  });

  it('nút quay lại đưa về lớp 1', () => {
    render(<MemoryRouter><MobileMenu open onClose={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText('Kho'));
    fireEvent.click(screen.getByLabelText('Quay lại danh sách phân hệ'));
    expect(screen.queryByText('Nhập kho')).toBeNull();
  });
});
