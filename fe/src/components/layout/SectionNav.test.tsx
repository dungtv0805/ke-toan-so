// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SectionNav } from './SectionNav';

/**
 * Bộ quyền thay đổi được giữa các ca: ca "ẩn mục không có quyền" cần đúng MỘT
 * mục qua được bộ lọc, còn ca "đánh dấu mục đang mở" cần HAI mục cùng qua —
 * chỉ có một nút thì `active` đúng và `active` luôn true trông y hệt nhau.
 */
const trangThai = vi.hoisted(() => ({ quyen: ['/kho/nhap-kho:xem'] }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { isSuperAdmin: false },
    hasPermission: (p: string) => trangThai.quyen.includes(p),
  }),
}));

const LOP_ACTIVE = 'bg-[hsl(var(--primary))]';

describe('SectionNav', () => {
  const items = [
    { label: 'Nhập kho', path: '/kho/nhap-kho' },
    { label: 'Xuất kho', path: '/kho/xuat-kho' },
  ];

  const nut = (nhan: string) => screen.getByText(nhan).closest('button')!;

  it('ẩn mục không có quyền', () => {
    trangThai.quyen = ['/kho/nhap-kho:xem'];
    render(<MemoryRouter><SectionNav items={items} /></MemoryRouter>);
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.queryByText('Xuất kho')).toBeNull();
  });

  it('đánh dấu mục đang mở và CHỈ mục đó', () => {
    trangThai.quyen = ['/kho/nhap-kho:xem', '/kho/xuat-kho:xem'];
    render(
      <MemoryRouter initialEntries={['/kho/nhap-kho']}>
        <SectionNav items={items} />
      </MemoryRouter>,
    );
    expect(nut('Nhập kho').className).toContain(LOP_ACTIVE);
    expect(nut('Xuất kho').className).not.toContain(LOP_ACTIVE);
  });
});
