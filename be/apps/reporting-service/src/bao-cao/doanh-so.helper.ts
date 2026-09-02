import type { NhatKyChungEntry } from '@app/dto';
import { maChieu, nhanChieu, type GiaTriChieu } from './bao-cao.helper';

export type GroupBy = 'ngay' | 'thang' | 'quy' | 'nam';

export interface DoanhSoChieuRow {
  ten: string;
  soTien: number;
}

/** Một kỳ trên trục thời gian: khoá sắp xếp/ghép cặp + nhãn hiển thị + số tiền. */
export interface DoanhSoKyRow {
  /** Khoá so sánh được: `YYYY-MM-DD` | `YYYY-MM` | `YYYY-Qn` | `YYYY`. */
  khoa: string;
  /** Nhãn trục X, ví dụ `T3/2026`. */
  nhan: string;
  soTien: number;
}

const hai = (n: number): string => String(n).padStart(2, '0');

/** Nhãn kỳ của một ngày, dùng làm nhãn trục X. */
export function nhanKy(ngay: Date, groupBy: GroupBy): string {
  const y = ngay.getUTCFullYear();
  const m = ngay.getUTCMonth() + 1;
  switch (groupBy) {
    case 'ngay':
      return `${hai(ngay.getUTCDate())}/${hai(m)}/${y}`;
    case 'quy':
      return `Q${Math.ceil(m / 3)}/${y}`;
    case 'nam':
      return `${y}`;
    default:
      return `T${m}/${y}`;
  }
}

/**
 * Khoá kỳ SẮP XẾP ĐƯỢC (so sánh chuỗi = so sánh thời gian). Khác `nhanKy` ở chỗ
 * `T3/2026` sắp xếp sau `T12/2025` theo chuỗi nhưng lại trước theo thời gian.
 */
export function khoaKy(ngay: Date, groupBy: GroupBy): string {
  const y = ngay.getUTCFullYear();
  const m = ngay.getUTCMonth() + 1;
  switch (groupBy) {
    case 'ngay':
      return `${y}-${hai(m)}-${hai(ngay.getUTCDate())}`;
    case 'quy':
      return `${y}-Q${Math.ceil(m / 3)}`;
    case 'nam':
      return `${y}`;
    default:
      return `${y}-${hai(m)}`;
  }
}

/**
 * Khoá của kỳ TƯƠNG ỨNG năm trước (`2026-03` → `2025-03`). Dùng để ghép cột
 * "cùng kỳ năm trước" theo đúng kỳ, không theo vị trí trong mảng — năm trước
 * thiếu một kỳ ở giữa là cả chuỗi lệch một bậc mà không có dấu hiệu gì.
 */
export function khoaKyNamTruoc(khoa: string): string {
  return `${Number(khoa.slice(0, 4)) - 1}${khoa.slice(4)}`;
}

/**
 * Cùng mốc thời gian của năm trước, kẹp về ngày hợp lệ cuối cùng của tháng.
 * `setFullYear(y - 1)` trên 29/2 nhảy sang 1/3 của năm không nhuận, làm cửa sổ
 * năm trước dài thêm một ngày và sinh thêm bucket lạc.
 */
export function luiMotNam(d: Date): Date {
  const nam = d.getUTCFullYear() - 1;
  const thang = d.getUTCMonth();
  const ngayCuoiThang = new Date(Date.UTC(nam, thang + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      nam,
      thang,
      Math.min(d.getUTCDate(), ngayCuoiThang),
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
}

/** Doanh số = phát sinh Có TK 511. Chấp nhận cả trường legacy ở cấp gốc bút toán. */
export function laDoanhThu(v: NhatKyChungEntry): boolean {
  const maTK = v.danhMuc?.taiKhoanCo?.ma ?? v.taiKhoanCo;
  return !!maTK?.startsWith('511');
}

/**
 * Gom doanh số theo kỳ, LUÔN trả về theo thứ tự thời gian tăng dần.
 * Không dựa vào thứ tự bút toán đến — `getNhatKyChung` sắp xếp `ngay: -1`, nên
 * gom theo thứ tự Map sẽ vẽ biểu đồ ngược (T12 bên trái, T1 bên phải).
 */
export function gomTheoThoiGian(
  vouchers: NhatKyChungEntry[],
  groupBy: GroupBy,
): DoanhSoKyRow[] {
  const out = new Map<string, DoanhSoKyRow>();
  for (const v of vouchers) {
    if (!laDoanhThu(v)) continue;
    const ngay = new Date(v.ngay);
    const khoa = khoaKy(ngay, groupBy);
    const e = out.get(khoa) ?? { khoa, nhan: nhanKy(ngay, groupBy), soTien: 0 };
    e.soTien += v.soTien;
    out.set(khoa, e);
  }
  return Array.from(out.values()).sort((a, b) => a.khoa.localeCompare(b.khoa));
}

/**
 * Ghép chuỗi kỳ này với chuỗi năm trước theo KỲ TƯƠNG ỨNG (T3/2026 ↔ T3/2025).
 * Kỳ nào năm trước không có thì `cungKy: 0`.
 */
export function ghepCungKy(
  kyNay: DoanhSoKyRow[],
  kyTruoc: DoanhSoKyRow[],
): { ky: string; kyNay: number; cungKy: number }[] {
  const truocTheoKhoa = new Map(kyTruoc.map((r) => [r.khoa, r.soTien]));
  return kyNay.map((r) => ({
    ky: r.nhan,
    kyNay: r.soTien,
    cungKy: truocTheoKhoa.get(khoaKyNamTruoc(r.khoa)) ?? 0,
  }));
}

/**
 * Gom doanh số theo chiều phân tích, khoá gom nhóm là MÃ (`maChieu`), không phải nhãn
 * hiển thị — hai đối tượng khác nhau có thể trùng tên, một đối tượng có thể bị ghi tên
 * lệch giữa các kỳ. Bút toán không gắn chiều (không có mã nào) vẫn được gom vào nhóm
 * "Không xác định" thay vì loại bỏ, để tổng các nhóm luôn khớp tổng doanh số hiển thị
 * trên thẻ KPI cùng tab.
 */
export function gomTheoChieu(
  vouchers: NhatKyChungEntry[],
  field: string,
): DoanhSoChieuRow[] {
  const out = new Map<string, { ten: string; soTien: number }>();
  for (const v of vouchers) {
    if (!laDoanhThu(v)) continue;
    const dm = v.danhMuc as unknown as Record<string, GiaTriChieu | undefined>;
    const dim = dm?.[field];
    const khoa = maChieu(dim) ?? '';
    const e = out.get(khoa) ?? { ten: nhanChieu(dim), soTien: 0 };
    e.soTien += v.soTien;
    out.set(khoa, e);
  }
  return Array.from(out.values()).sort((a, b) => b.soTien - a.soTien);
}

/** Danh mục Sản phẩm rút gọn — `nhom` có thể là MÃ nhóm hoặc (dữ liệu cũ) id nhóm. */
export interface SanPhamCoNhom {
  ma: string;
  nhom?: string;
}

/** Danh mục Nhóm sản phẩm rút gọn. */
export interface NhomSanPhamMuc {
  id?: string;
  _id?: string;
  ma: string;
  ten: string;
}

/** Dòng gom cho sản phẩm chưa xác định được nhóm. */
export const CHUA_PHAN_NHOM = 'Chưa phân nhóm';

/**
 * Giá trị `dimension` của chiều Nhóm sản phẩm. Không nằm trong
 * `DIMENSION_FIELD_MAP` vì nó KHÔNG map thẳng vào một trường của `danhMuc` —
 * phải tra danh mục mới ra nhóm.
 */
export const CHIEU_NHOM_SAN_PHAM = 'nhom-san-pham';

/**
 * Gom doanh số theo NHÓM SẢN PHẨM.
 *
 * Phải viết riêng chứ không dùng `gomTheoChieu` được: snapshot `danhMuc.sanPham`
 * trong bút toán chỉ giữ `{ma, ten, donVi, giaBan}`, KHÔNG có nhóm. Nhóm chỉ tra
 * ngược được từ danh mục Sản phẩm, nên hàm này nhận thêm hai danh mục.
 *
 * Khoá gom luôn là MÃ nhóm, không phải tên: hai nhóm khác nhau có thể trùng tên,
 * gom theo tên là cộng nhầm hai nhóm vào một dòng.
 */
export function gomTheoNhomSanPham(
  vouchers: NhatKyChungEntry[],
  sanPhamList: SanPhamCoNhom[],
  nhomList: NhomSanPhamMuc[],
): DoanhSoChieuRow[] {
  // Danh mục Sản phẩm lưu `nhom` bằng mã, nhưng bản ghi cũ lưu bằng id — tra
  // được cả hai, nếu không những sản phẩm đó rơi hết vào "Chưa phân nhóm".
  const nhomTheoKhoa = new Map<string, NhomSanPhamMuc>();
  for (const n of nhomList) {
    if (n.ma) nhomTheoKhoa.set(n.ma, n);
    if (n.id) nhomTheoKhoa.set(n.id, n);
    if (n._id) nhomTheoKhoa.set(n._id, n);
  }

  const nhomCuaSanPham = new Map<string, string>();
  for (const sp of sanPhamList) {
    if (sp.ma && sp.nhom) nhomCuaSanPham.set(sp.ma, sp.nhom);
  }

  const out = new Map<string, { ten: string; soTien: number }>();
  for (const v of vouchers) {
    if (!laDoanhThu(v)) continue;
    const dm = v.danhMuc as unknown as Record<string, GiaTriChieu | undefined>;
    const maSanPham = maChieu(dm?.sanPham);
    const khoaNhomTho = maSanPham ? nhomCuaSanPham.get(maSanPham) : undefined;
    const nhom = khoaNhomTho ? nhomTheoKhoa.get(khoaNhomTho) : undefined;

    // Khoá gom là MÃ nhóm (đã chuẩn hoá từ id nếu cần), không phải tên.
    const khoa = nhom?.ma ?? khoaNhomTho ?? '';
    const ten = nhom?.ten || khoaNhomTho || CHUA_PHAN_NHOM;

    const e = out.get(khoa) ?? { ten, soTien: 0 };
    e.soTien += v.soTien;
    out.set(khoa, e);
  }
  return Array.from(out.values()).sort((a, b) => b.soTien - a.soTien);
}
