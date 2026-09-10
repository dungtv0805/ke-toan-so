// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Users, Building2, BookOpen, List } from 'lucide-react';
import { LuoiDanhMuc, type NhomDanhMuc } from '../LuoiDanhMuc';
import { DANH_MUC_GROUPS } from '@/config/danhMucCatalog';

const NHOM: NhomDanhMuc[] = [
  {
    title: 'Đối tượng',
    icon: Users,
    mau: '#2F6FED',
    links: [
      { label: 'Đối tượng', path: '/danh-muc/doi-tuong', icon: Users },
      { label: 'Chủ đầu tư', path: '/danh-muc/chu-dau-tu', icon: Building2 },
    ],
  },
  {
    title: 'Tài khoản',
    icon: BookOpen,
    mau: '#1F7769',
    links: [{ label: 'Hệ thống tài khoản', path: '/danh-muc/tai-khoan', icon: List }],
  },
];

const dung = (nhom: NhomDanhMuc[]) =>
  render(
    <MemoryRouter>
      <LuoiDanhMuc nhom={nhom} />
    </MemoryRouter>,
  );

describe('LuoiDanhMuc', () => {
  it('mỗi mục là một liên kết trỏ đúng route', () => {
    dung(NHOM);
    expect(screen.getByText('Chủ đầu tư').closest('a')).toHaveProperty(
      'pathname',
      '/danh-muc/chu-dau-tu',
    );
  });

  it('huy hiệu đếm theo SỐ MỤC CÒN LẠI sau khi lọc, không phải tổng cố định', () => {
    dung([{ ...NHOM[0], links: [NHOM[0].links[0]] }]);
    expect(screen.getByText('1 mục')).toBeTruthy();
  });

  it('không hiện số bản ghi nào — đợt này cố ý bỏ phần đếm', () => {
    const { container } = dung(NHOM);
    // Chỉ được có chữ "N mục" của huy hiệu; không có số lẻ đứng riêng kiểu 128 / 286.
    expect(container.textContent).not.toMatch(/\b\d{2,}\b(?!\s*mục)/);
  });

  it('nền dải đầu thẻ pha từ màu nhóm, KHÔNG dùng pastel cứng của bản vẽ', () => {
    const { container } = dung(NHOM);
    // Dải đầu thẻ phải lấy NỀN từ màu nhóm ở dạng pha loãng (#2F6FED1F →
    // rgba(47,111,237,0.12)), không phải một mã pastel cứng như #EDF2FE.
    const dai = [...container.querySelectorAll<HTMLElement>('[style]')].find((e) =>
      (e.style.background || '').startsWith('rgba(47, 111, 237'),
    );
    expect(dai, 'không tìm thấy dải đầu thẻ pha từ màu nhóm').toBeTruthy();
    expect(container.innerHTML).not.toContain('#EDF2FE');
  });
});

describe('danhMucCatalog', () => {
  it('mọi nhóm và mọi mục đều đã khai icon — thiếu là vỡ bố cục thẻ', () => {
    for (const g of DANH_MUC_GROUPS) {
      expect(g.icon, `nhóm ${g.title} thiếu icon`).toBeTruthy();
      expect(g.mau, `nhóm ${g.title} thiếu màu`).toMatch(/^#[0-9A-F]{6}$/i);
      for (const l of g.links) {
        expect(l.icon, `mục ${l.path} thiếu icon`).toBeTruthy();
      }
    }
  });
});
