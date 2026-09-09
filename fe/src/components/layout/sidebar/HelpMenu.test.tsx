// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HelpMenu, locMucTroGiup, MUC_TRO_GIUP } from './HelpMenu';
import { isCommonKey } from '@/config/modules';

const auth = {
  user: { id: 'u1', isSuperAdmin: false },
  hasPermission: (_perm: string) => true,
};
let effectiveKeys: string[] = [];

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('@/hooks/useEffectiveMenuKeys', () => ({
  useEffectiveMenuKeys: () => ({
    moduleDefs: [], unassignedKeys: [], allEffectiveKeys: effectiveKeys,
  }),
}));

const KHOA = MUC_TRO_GIUP.map((m) => m.key);

describe('locMucTroGiup', () => {
  beforeEach(() => {
    auth.user = { id: 'u1', isSuperAdmin: false };
    auth.hasPermission = () => true;
    effectiveKeys = [];
  });

  it('SuperAdmin thấy đủ 4 trang, không cần quyền lẫn lĩnh vực', () => {
    expect(locMucTroGiup([], () => false, true).map((m) => m.key)).toEqual(KHOA);
  });

  it('user thường chỉ thấy trang có khoá <path>:xem', () => {
    const co = new Set(['/quy-trinh:xem', '/huong-dan:xem']);
    const ra = locMucTroGiup([], (p) => co.has(p), false);
    expect(ra.map((m) => m.key)).toEqual(['/quy-trinh', '/huong-dan']);
  });

  it('không quyền nào thì rỗng', () => {
    expect(locMucTroGiup([], () => false, false)).toEqual([]);
  });

  /**
   * Cả 4 key hiện nằm trong COMMON_MENU_KEYS nên tầng lĩnh vực luôn cho qua.
   * Test này ghim CHỦ Ý đó: nếu ai gỡ một key khỏi COMMON mà quên rằng
   * HelpMenu lọc lĩnh vực bằng keyMatches, test đổi màu để họ biết.
   */
  it('4 trang thư viện là menu COMMON — lĩnh vực rỗng vẫn thấy đủ', () => {
    expect(KHOA.every(isCommonKey)).toBe(true);
    expect(locMucTroGiup([], () => true, false).map((m) => m.key)).toEqual(KHOA);
  });
});

describe('HelpMenu', () => {
  beforeEach(() => {
    auth.user = { id: 'u1', isSuperAdmin: false };
    auth.hasPermission = () => true;
    effectiveKeys = [];
  });

  it('hiện nút khi còn ít nhất một trang xem được', () => {
    render(<HelpMenu onSelect={() => {}} />);
    expect(screen.getByLabelText('Trợ giúp & phản hồi')).toBeTruthy();
  });

  it('ẩn hẳn nút khi không còn trang nào xem được', () => {
    auth.hasPermission = () => false;
    const { container } = render(<HelpMenu onSelect={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('biến thể rail chỉ có icon — không vẽ nhãn chữ', () => {
    render(<HelpMenu onSelect={() => {}} bienThe="rail" />);
    const nut = screen.getByLabelText('Trợ giúp & phản hồi');
    expect(nut.getAttribute('title')).toBe('Trợ giúp & phản hồi');
    expect(screen.queryByText('Trợ giúp & phản hồi')).toBeNull();
  });

  it('biến thể panel giữ nhãn chữ như cũ', () => {
    render(<HelpMenu onSelect={() => {}} />);
    expect(screen.getByText('Trợ giúp & phản hồi')).toBeTruthy();
  });
});
