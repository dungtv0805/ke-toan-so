// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SectionNav } from './SectionNav';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { isSuperAdmin: false },
    hasPermission: (p: string) => p === '/kho/nhap-kho:xem',
  }),
}));

describe('SectionNav', () => {
  const items = [
    { label: 'Nhập kho', path: '/kho/nhap-kho' },
    { label: 'Xuất kho', path: '/kho/xuat-kho' },
  ];

  it('ẩn mục không có quyền', () => {
    render(<MemoryRouter><SectionNav items={items} /></MemoryRouter>);
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.queryByText('Xuất kho')).toBeNull();
  });

  it('đánh dấu mục đang mở', () => {
    render(
      <MemoryRouter initialEntries={['/kho/nhap-kho']}>
        <SectionNav items={items} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Nhập kho').closest('button')!.className)
      .toContain('bg-[hsl(var(--primary))]');
  });
});
