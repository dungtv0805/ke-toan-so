// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from './StatusPill';

describe('StatusPill', () => {
  it('vẽ nội dung được truyền vào', () => {
    render(<StatusPill tone="ok">Đã duyệt</StatusPill>);
    expect(screen.getByText('Đã duyệt')).toBeTruthy();
  });

  it('mỗi tông một bộ màu riêng', () => {
    const { container: a } = render(<StatusPill tone="ok">A</StatusPill>);
    const { container: b } = render(<StatusPill tone="tu-choi">B</StatusPill>);
    expect(a.firstElementChild!.className).not.toBe(b.firstElementChild!.className);
  });

  it('tông lạ rơi về trung tính thay vì vỡ', () => {
    // @ts-expect-error kiểm tra phòng thủ khi dữ liệu từ API lệch
    render(<StatusPill tone="khong-co">C</StatusPill>);
    expect(screen.getByText('C')).toBeTruthy();
  });
});
