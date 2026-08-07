import type { NhatKyChungEntry } from '@app/dto';

/** TK doanh thu đã thực hiện — dòng Có 511* là một lần ghi nhận doanh thu. */
export const TK_DOANH_THU = '511';

/** Khóa gom nhóm cho dòng 511 không gắn đơn hàng. */
export const KHONG_GAN_DON_HANG = '(Không gắn đơn hàng)';

export interface DoanhThuRow {
  /** Số hợp đồng (mã đơn hàng); rỗng với dòng không gắn đơn hàng. */
  soHopDong: string;
  tenDonHang: string;
  khachHang: string;
  sanPham: string;
  /** Giá trị đơn hàng (giaTriSauThue của hợp đồng). */
  doanhSo: number;
  /** Tổng phát sinh Có 511 trong kỳ. */
  doanhThu: number;
  /** 12 phần tử, index 0 = tháng 1. */
  thang: number[];
}

export interface DoanhThuReport {
  rows: DoanhThuRow[];
  tong: DoanhThuRow;
}

const emptyMonths = () => Array<number>(12).fill(0);

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Dòng ghi nhận doanh thu = dòng có TK Có thuộc nhánh 511. */
export function isDoanhThuEntry(entry: NhatKyChungEntry): boolean {
  return Boolean(entry.danhMuc?.taiKhoanCo?.ma?.startsWith(TK_DOANH_THU));
}

/**
 * Pivot các dòng Có 511 thành bảng doanh thu theo đơn hàng × tháng.
 *
 * Tháng lấy theo `ngay` (ngày chứng từ) — thống nhất với mọi báo cáo khác. Các kỳ
 * lọc của hệ thống đều nằm trong một năm nên chỉ cần 12 cột tháng.
 *
 * Dòng 511 không gắn đơn hàng KHÔNG bị loại: gom vào một dòng riêng cuối bảng để
 * tổng báo cáo luôn khớp phát sinh Có 511 trên sổ cái.
 */
export function buildDoanhThuReport(entries: NhatKyChungEntry[]): DoanhThuReport {
  const byHopDong = new Map<string, DoanhThuRow & { sanPhamSet: Set<string> }>();

  for (const entry of entries) {
    if (!isDoanhThuEntry(entry)) continue;

    const dm = entry.danhMuc;
    const hopDong = dm?.hopDong;
    const soHopDong = hopDong?.soHopDong?.trim() ?? '';
    const key = soHopDong || KHONG_GAN_DON_HANG;

    let row = byHopDong.get(key);
    if (!row) {
      row = {
        soHopDong,
        tenDonHang: soHopDong ? (hopDong?.tenCongTrinh ?? '') : KHONG_GAN_DON_HANG,
        khachHang: '',
        sanPham: '',
        doanhSo: 0,
        doanhThu: 0,
        thang: emptyMonths(),
        sanPhamSet: new Set<string>(),
      };
      byHopDong.set(key, row);
    }

    // Đơn hàng bán ra ghi Có 511 → khách hàng nằm ở đối tượng bên Có.
    const khachHang = dm?.doiTuong2?.ten || dm?.doiTuong?.ten || '';
    if (khachHang && !row.khachHang) row.khachHang = khachHang;

    const sanPham = dm?.sanPham?.ten?.trim();
    if (sanPham) row.sanPhamSet.add(sanPham);

    // Giá trị đơn hàng là thuộc tính của hợp đồng, không cộng dồn theo dòng.
    const giaTri = num(hopDong?.giaTriSauThue);
    if (giaTri > row.doanhSo) row.doanhSo = giaTri;

    const soTien = num(entry.soTien);
    row.doanhThu += soTien;
    const thang = new Date(entry.ngay).getMonth();
    if (thang >= 0 && thang <= 11) row.thang[thang] += soTien;
  }

  const rows = [...byHopDong.values()].map(({ sanPhamSet, ...row }) => ({
    ...row,
    sanPham: [...sanPhamSet].join(', '),
  }));

  // Đơn hàng theo mã, dòng không gắn đơn hàng luôn xuống cuối
  rows.sort((a, b) => {
    if (!a.soHopDong) return 1;
    if (!b.soHopDong) return -1;
    return a.soHopDong.localeCompare(b.soHopDong, 'vi');
  });

  const tong: DoanhThuRow = {
    soHopDong: '',
    tenDonHang: 'TỔNG',
    khachHang: '',
    sanPham: '',
    doanhSo: rows.reduce((s, r) => s + r.doanhSo, 0),
    doanhThu: rows.reduce((s, r) => s + r.doanhThu, 0),
    thang: rows.reduce(
      (acc, r) => acc.map((v, i) => v + r.thang[i]),
      emptyMonths(),
    ),
  };

  return { rows, tong };
}
