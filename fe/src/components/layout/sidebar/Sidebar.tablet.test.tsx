// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', isSuperAdmin: true }, hasPermission: () => true }),
}));
vi.mock('@/hooks/useEffectiveMenuKeys', () => ({
  useEffectiveMenuKeys: () => ({ moduleDefs: [], unassignedKeys: [], allEffectiveKeys: [] }),
}));

const datBeRong = (w: number) => {
  Object.defineProperty(window, 'innerWidth', { value: w, writable: true, configurable: true });
  window.dispatchEvent(new Event('resize'));
};
const beRongSidebar = () => document.documentElement.style.getPropertyValue('--sidebar-w');

/**
 * Máy tính bảng (768–1279): chỉ rail 62px chiếm chỗ; panel mở ĐÈ lên nội dung
 * rồi tự đóng — ở 768px mà panel đẩy nội dung thì bảng chỉ còn ~510px.
 */
describe('Sidebar — máy tính bảng', () => {
  beforeEach(() => {
    localStorage.clear();
    datBeRong(900);
  });
  afterEach(() => datBeRong(1440));

  it('mở trang: panel đóng, nội dung chỉ chừa rail 62px', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    expect(screen.queryByText('Xuất kho')).toBeNull();
    expect(beRongSidebar()).toBe('62px');
  });

  it('bấm phân hệ trên rail → panel đè lên, nội dung KHÔNG bị đẩy', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Kho —/));
    expect(screen.getByText('Xuất kho')).toBeTruthy();
    expect(beRongSidebar()).toBe('62px');
  });

  it('bấm ra ngoài (lớp nền) thì đóng panel', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Kho —/));
    fireEvent.click(screen.getByLabelText('Đóng menu'));
    expect(screen.queryByText('Xuất kho')).toBeNull();
  });

  it('chọn một mục thì panel tự đóng', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Kho —/));
    fireEvent.click(screen.getByText('Xuất kho'));
    expect(screen.queryByText('Chuyển kho')).toBeNull();
  });

  it('phím Esc đóng panel', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Kho —/));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Xuất kho')).toBeNull();
  });

  it('không ghi đè lựa chọn thu gọn đã lưu của màn máy tính', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    fireEvent.click(screen.getByTitle(/^Kho —/));
    fireEvent.click(screen.getByLabelText('Đóng menu'));
    expect(localStorage.getItem('sidebar-thu-gon:u1')).toBeNull();
  });

  it('kéo cửa sổ lên khổ máy tính thì về bố cục cũ (panel đẩy nội dung, 258px)', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    act(() => datBeRong(1440));
    expect(screen.getByText('Xuất kho')).toBeTruthy();
    expect(beRongSidebar()).toBe('258px');
  });
});
