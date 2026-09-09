// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SidebarRail } from './SidebarRail';
import type { VisibleModule } from '@/hooks/useVisibleMenu';

const modules: VisibleModule[] = [
  {
    module: { id: 'kho', label: 'Kho', railLabel: 'Kho', icon: null },
    leaves: [
      { key: '/kho/nhap-kho', label: 'Nhập kho', module: 'kho', status: 'ok' },
      { key: '/kho/xuat-kho', label: 'Xuất kho', module: 'kho', status: 'ok' },
    ],
  },
  {
    module: { id: 'thue', label: 'Thuế', railLabel: 'Thuế', icon: null },
    leaves: [{ key: '/thue/tong-hop', label: 'Tổng hợp', module: 'thue', status: 'ok' }],
  },
];

describe('SidebarRail', () => {
  it('vẽ một ô cho mỗi phân hệ, dùng nhãn viết tắt', () => {
    render(<SidebarRail modules={modules} activeModule="kho" onPick={() => {}} />);
    expect(screen.getByText('Kho')).toBeTruthy();
    expect(screen.getByText('Thuế')).toBeTruthy();
  });

  it('tooltip ghi tên đầy đủ kèm số mục con', () => {
    render(<SidebarRail modules={modules} activeModule="kho" onPick={() => {}} />);
    const o = screen.getByText('Kho').closest('button')!;
    expect(o.getAttribute('title')).toBe('Kho — 2 mục');
  });

  it('đánh dấu phân hệ đang mở', () => {
    render(<SidebarRail modules={modules} activeModule="kho" onPick={() => {}} />);
    expect(screen.getByText('Kho').closest('button')!.getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('Thuế').closest('button')!.getAttribute('aria-current')).toBeNull();
  });

  it('bấm ô gọi onPick với id phân hệ', () => {
    const onPick = vi.fn();
    render(<SidebarRail modules={modules} activeModule="kho" onPick={onPick} />);
    fireEvent.click(screen.getByText('Thuế'));
    expect(onPick).toHaveBeenCalledWith('thue');
  });
});
