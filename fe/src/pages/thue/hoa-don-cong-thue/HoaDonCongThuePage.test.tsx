// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/**
 * Tái hiện sự cố "bấm Hóa đơn là màn hình trắng tinh".
 *
 * Trang này gọi API thật nên phải thay bằng bản giả — mục tiêu là dựng đúng
 * cây giao diện với dữ liệu giống hệt máy chủ trả về, để lỗi render lộ ra ngay
 * trong test thay vì phải mò trên production.
 */

const { congTy, hoaDon, luotFile } = vi.hoisted(() => ({
  congTy: [
  {
    id: '1',
    mst: '0108334262',
    tenCongTy: 'Thanh Long',
    tenDangNhap: '0108334262',
    kyKeKhai: 'thang',
    coLuuMatKhau: true,
    tuDongTai: false,
    gioChay: '07:00',
    soNgayKeoLai: 7,
    lanChayCuoi: null,
  },
  {
    id: '2',
    mst: '0110084115',
    tenCongTy: '',
    tenDangNhap: '0110084115',
    kyKeKhai: 'thang',
    coLuuMatKhau: true,
    tuDongTai: false,
    gioChay: '07:00',
    soNgayKeoLai: 7,
    lanChayCuoi: null,
  },
  ],

  // Lượt tải file khôi phục khi mở lại trang.
  luotFile: {
    id: 1,
    mst: '0108334262',
    tuNgay: '2026-09-01',
    denNgay: '2026-09-15',
    trangThai: 'xong',
    tong: 2, daXuLy: 2, loNay: 2, daTai: 2, boQua: 0, bytes: 633844, conLai: 0,
    loi: [],
    muc: [
      { soHoaDon: '171', kyHieu: 'C26TVT', mstNguoiBan: '0106769148',
        ngayLap: '2026-09-09', trangThai: 'xong', bytes: 316771, ghiChu: null },
    ],
  },

  // Nguyên văn một bản ghi máy chủ trả về (đã kiểm chứng bằng cách gọi API thật).
  hoaDon: [
  {
    _id: '6aa90cf18b1701fdda256a71',
    mst: '0108334262',
    chieu: 'mua-vao',
    nhom: 'thuong',
    mstNguoiBan: '0106769148',
    tenNguoiBan: 'CÔNG TY CỔ PHẦN DỊCH VỤ KỸ THUẬT NĂNG LƯỢNG VIỆT NAM',
    kyHieu: 'C26TVT',
    soHoaDon: '171',
    ngayLap: '2026-09-08T17:00:00.000Z',
    giaTriChuaThue: 92592593,
    tienThue: 7407407,
    tongThanhToan: 100000000,
    trangThai: '1',
    coFileGoc: true,
    coPdf: true,
    kichThuocFileGoc: 316771,
  },
  // Bản ghi "xấu": thiếu tên, ngày rỗng, số dạng chuỗi, chưa có file.
  {
    _id: '6aa90cf18b1701fdda256a72',
    mst: '0108334262',
    chieu: 'mua-vao',
    nhom: 'thuong',
    mstNguoiBan: '2300976621',
    tenNguoiBan: null,
    kyHieu: 'C26TYY',
    soHoaDon: 176,
    ngayLap: null,
    giaTriChuaThue: null,
    tienThue: undefined,
    tongThanhToan: '7407407',
    trangThai: null,
    coFileGoc: false,
    coPdf: false,
  },
  ],
}));

vi.mock('@/services/hoaDonCongThueService', async () => {
  const that = await vi.importActual<typeof import('@/services/hoaDonCongThueService')>(
    '@/services/hoaDonCongThueService',
  );
  return {
    ...that,
    hoaDonCongThueService: {
      danhSachCongTy: vi.fn().mockResolvedValue(congTy),
      trangThaiPhien: vi.fn().mockResolvedValue([
        { mst: '0108334262', tenCongTy: 'Thanh Long', daDangNhap: true, coLuuMatKhau: true },
      ]),
      luotGanNhat: vi.fn().mockResolvedValue(null),
      luotTaiFileGanNhat: vi.fn().mockResolvedValue(luotFile),
      luotTaoPdfGanNhat: vi.fn().mockResolvedValue(null),
      hoaDon: vi.fn().mockResolvedValue(hoaDon),
    },
  };
});

vi.mock('@/hooks/useManHinh', () => ({ useManHinh: () => 'desktop' }));

import HoaDonCongThuePage from './HoaDonCongThuePage';

describe('HoaDonCongThuePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // antd Table dùng ResizeObserver, jsdom không có.
    (globalThis as any).ResizeObserver ||= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    (window as any).matchMedia ||= () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    });
  });

  it('dựng được trang và hiện công ty đã khai báo', async () => {
    render(
      <MemoryRouter>
        <HoaDonCongThuePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Thanh Long')).toBeTruthy();
  });

  it('bấm "Hóa đơn" thì hiện danh sách chứ KHÔNG đổ cả trang', async () => {
    render(
      <MemoryRouter>
        <HoaDonCongThuePage />
      </MemoryRouter>,
    );
    // Mỗi công ty một nút; bấm nút của công ty đầu tiên.
    const nut = (await screen.findAllByRole('button', { name: /Hóa đơn/ }))[0];
    fireEvent.click(nut);

    // Số hóa đơn phải hiện ra; nếu render đổ thì câu này ném lỗi.
    expect(await screen.findByText('171')).toBeTruthy();
    // Ký hiệu xuất hiện ở cả bảng lượt chạy lẫn danh sách nên phải dùng getAll.
    await waitFor(() => expect(screen.getAllByText('C26TVT').length).toBeGreaterThan(0));
    // Bản ghi dữ liệu xấu (thiếu tên, ngày rỗng, số dạng chuỗi) cũng phải hiện.
    expect(screen.getByText('176')).toBeTruthy();
  });
});
