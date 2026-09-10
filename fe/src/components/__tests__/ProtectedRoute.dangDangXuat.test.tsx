// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Lỗi 10/09/2026: bấm Đăng xuất thì màn hình NHÁY HAI LẦN.
 *
 * `logout()` dọn state trước rồi mới `await fetch(/api/logout)` mới chuyển trang.
 * Trong khoảng chờ mạng đó `isAuthenticated` đã false nên ProtectedRoute đá sang
 * /login — màn đăng nhập cục bộ loé lên (nháy 1) trước khi trình duyệt kịp sang
 * portal (nháy 2).
 *
 * `initAuth` đã né đúng cách từ trước (giữ màn loading khi sắp điều hướng);
 * test này canh để `logout` cũng vậy.
 */

const auth = {
  user: null as unknown,
  isAuthenticated: false,
  isLoading: false,
  isLoggingOut: false,
  hasPermission: () => true,
};

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => auth }));

import { ProtectedRoute } from '../ProtectedRoute';

const dung = () =>
  render(
    <MemoryRouter initialEntries={['/danh-muc']}>
      <ProtectedRoute>
        <div>nội dung</div>
      </ProtectedRoute>
    </MemoryRouter>,
  );

describe('ProtectedRoute khi đang đăng xuất', () => {
  it('giữ màn chờ, KHÔNG đá sang màn đăng nhập cục bộ', () => {
    auth.isLoggingOut = true;
    dung();
    expect(screen.getByText('Đang đăng xuất…')).toBeTruthy();
    expect(screen.queryByText('nội dung')).toBeNull();
  });

  it('không đăng xuất thì vẫn chặn như cũ', () => {
    auth.isLoggingOut = false;
    dung();
    expect(screen.queryByText('Đang đăng xuất…')).toBeNull();
    expect(screen.queryByText('nội dung')).toBeNull();
  });
});
