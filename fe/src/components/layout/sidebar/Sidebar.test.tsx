// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', isSuperAdmin: true }, hasPermission: () => true }),
}));
vi.mock('@/hooks/useEffectiveMenuKeys', () => ({
  useEffectiveMenuKeys: () => ({ moduleDefs: [], unassignedKeys: [], allEffectiveKeys: [] }),
}));

describe('Sidebar', () => {
  // Mọi test dùng chung userId mock ('u1') → chung khoá localStorage
  // `sidebar-thu-gon:u1`. Test "thu gọn panel" ghi `true` vào đó; nếu không
  // dọn, giá trị rò sang các test render sau (thuGon=true ngay từ đầu),
  // khiến panel không mở được dù ở phân hệ Kho — phát hiện khi thêm test
  // mới chạy SAU test thu gọn trong review Task 8.
  beforeEach(() => {
    localStorage.clear();
  });

  it('rail hiện đúng 15 phân hệ theo thứ tự sheet "Menu tài chính" với SuperAdmin', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    // Scope vào đúng thanh rail — panel Kho tự render thêm ~11 nút mục con,
    // đếm getAllByRole('button') trên toàn cây sẽ luôn lớn hơn bất kể rail
    // đúng hay sai (review Task 8, Important 2).
    const rail = screen.getByRole('navigation', { name: 'Phân hệ' });
    expect(within(rail).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual([
      'Tổng quan', 'Phân tích', 'Tổng hợp', 'Vốn & dòng tiền', 'Mua hàng', 'Bán hàng',
      'Tiền lương', 'Kho', 'Tài sản', 'Công cụ dụng cụ', 'Thuế',
      'Cổng yêu cầu thanh toán', 'Cổng yêu cầu xuất hóa đơn', 'Thư viện', 'Danh mục',
    ]);
  });

  it('Thư viện là một phân hệ trên rail, mở panel 4 thư viện chung', () => {
    render(<MemoryRouter initialEntries={['/chinh-sach']}><Sidebar /></MemoryRouter>);
    for (const nhan of ['Quy trình', 'Chính sách', 'Biểu mẫu', 'Hướng dẫn']) {
      expect(screen.getByText(nhan)).toBeTruthy();
    }
  });

  /**
   * Sáu mục Kế hoạch/Dự báo cùng một pathname, chỉ khác `?tab=`. Khớp theo
   * pathname thì mục khai đầu tiên (Phân tích) luôn thắng → vào Kế hoạch từ
   * Bán hàng mà panel nhảy sang Phân tích.
   */
  it('Kế hoạch mở từ Bán hàng thì panel ở lại Bán hàng, không nhảy sang Phân tích', () => {
    render(
      <MemoryRouter initialEntries={['/trung-tam-du-lieu/ke-hoach?tab=ban-hang']}>
        <Sidebar />
      </MemoryRouter>,
    );
    expect(screen.getByText('Hợp đồng bán')).toBeTruthy();
    expect(screen.queryByText('P&L Kế hoạch')).toBeNull();
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

  it('phân hệ có route (Tổng quan) không mở panel', () => {
    render(<MemoryRouter initialEntries={['/']}><Sidebar /></MemoryRouter>);
    // Không dò bằng text "Tổng quan" — rail cũng hiện railLabel y hệt chữ
    // đó, nên có mặt/vắng mặt panel đều làm getByText/queryByText gặp 1-2
    // phần tử trùng tên và không phân biệt được (queryByText ném lỗi khi có
    // ≥2 khớp thay vì trả về phần tử đầu). Nút "Thu gọn menu" chỉ nằm trong
    // ModulePanel → vắng mặt nghĩa là panel không render.
    expect(screen.queryByLabelText('Thu gọn menu')).toBeNull();
  });

  it('bấm rail vào phân hệ có route (Danh mục) thì điều hướng, panel không đổi sang Danh mục', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    expect(screen.getByText('Nhập kho')).toBeTruthy();

    fireEvent.click(screen.getByTitle(/^Danh mục —/));

    // current chuyển sang phân hệ 'danh-muc' (có route) → điều kiện render
    // panel tự ẩn. Không panel nào bung ra — không phải Kho cũ (đã điều
    // hướng khỏi trang Kho), càng không phải một panel "Danh mục" rỗng
    // nghĩa.
    expect(screen.queryByLabelText('Thu gọn menu')).toBeNull();
    expect(screen.queryByText('Nhập kho')).toBeNull();
  });

  it('panel bám theo URL khi điều hướng không qua rail (Tìm nhanh) — không kẹt ở lựa chọn cũ', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    expect(screen.getByText('Nhập kho')).toBeTruthy();

    // Mô phỏng đúng lỗi Critical 2: chọn một mục ở phân hệ KHÁC qua Tìm
    // nhanh (không đi qua bamRail/onPick của rail) — URL đổi, panel phải đi
    // theo chứ không kẹt lại ở phân hệ Kho.
    fireEvent.change(screen.getByPlaceholderText('Tìm nhanh'), { target: { value: 'Thu tiền' } });
    fireEvent.click(screen.getByText('Thu tiền'));

    expect(screen.getByText('Thu tiền')).toBeTruthy();
    expect(screen.queryByText('Nhập kho')).toBeNull();
    expect(screen.queryByText('Xuất kho')).toBeNull();
  });

  /**
   * Cờ `focusTick` chỉ tăng, không bao giờ về 0. Sau một lần ⌘K, mở lại panel
   * bằng chuột làm SidebarSearch mount lại và effect [tick] chạy với giá trị
   * còn khác 0 → ô tìm cướp con trỏ dù người dùng chỉ bấm icon rail.
   */
  it('bấm rail mở lại panel KHÔNG cướp con trỏ, dù trước đó đã bấm ⌘K', () => {
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(document.activeElement).toBe(screen.getByPlaceholderText('Tìm nhanh'));

    fireEvent.click(screen.getByTitle(/^Kho —/)); // thu gọn
    fireEvent.click(screen.getByTitle(/^Kho —/)); // mở lại bằng chuột

    expect(document.activeElement).not.toBe(screen.getByPlaceholderText('Tìm nhanh'));
  });

  it('⌘K mở panel khi sidebar đang thu gọn', () => {
    localStorage.setItem('sidebar-thu-gon:u1', 'true');
    render(<MemoryRouter initialEntries={['/kho/nhap-kho']}><Sidebar /></MemoryRouter>);
    expect(screen.queryByText('Nhập kho')).toBeNull();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    expect(screen.getByText('Nhập kho')).toBeTruthy();
  });
});
