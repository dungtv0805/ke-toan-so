// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MenuItemList } from './MenuItemList';
import type { MenuLeaf } from '@/config/menuCatalog';

const leaves: MenuLeaf[] = [
  { key: '/kho/nhap-kho', label: 'Nhập kho', module: 'kho', status: 'ok' },
  { key: '/kho/tinh-gia-xuat', label: 'Tính giá xuất kho', module: 'kho', status: 'soon' },
  { key: '/trung-tam-du-lieu/hang-hoa', label: 'Hàng hóa', module: 'kho', cluster: 'NHÓM HÀNG', status: 'ok' },
];

describe('MenuItemList', () => {
  it('vẽ đủ mục, kể cả mục chưa có trang', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    expect(screen.getByText('Nhập kho')).toBeTruthy();
    expect(screen.getByText('Tính giá xuất kho')).toBeTruthy();
  });

  it('mục soon có chấm cam và class làm mờ', () => {
    const { container } = render(
      <MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />,
    );
    const nut = screen.getByText('Tính giá xuất kho').closest('button')!;
    expect(nut.className).toContain('menu-item-coming-soon');
    expect(container.querySelectorAll('.coming-soon-dot')).toHaveLength(1);
  });

  it('hiện caption cụm một lần, ngay trước mục đầu của cụm', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    expect(screen.getAllByText('NHÓM HÀNG')).toHaveLength(1);
  });

  it('đánh dấu mục đang mở bằng aria-current', () => {
    render(<MenuItemList leaves={leaves} activePath="/kho/nhap-kho" onSelect={() => {}} />);
    const nut = screen.getByText('Nhập kho').closest('button')!;
    expect(nut.getAttribute('aria-current')).toBe('page');
  });

  it('bấm mục thì gọi onSelect với key đầy đủ, giữ nguyên query string', () => {
    const onSelect = vi.fn();
    const ds: MenuLeaf[] = [
      { key: '/trung-tam-du-lieu/ke-hoach?tab=ban-hang', permKey: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch bán hàng', module: 'ban-hang', status: 'ok' },
    ];
    render(<MenuItemList leaves={ds} activePath="/" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Kế hoạch bán hàng'));
    expect(onSelect).toHaveBeenCalledWith('/trung-tam-du-lieu/ke-hoach?tab=ban-hang');
  });
});
