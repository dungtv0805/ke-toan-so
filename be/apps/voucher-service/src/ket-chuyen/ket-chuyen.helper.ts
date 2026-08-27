import type { ChungTu } from '@app/entities';

export interface LoKetChuyen {
  soPhieu: string;
  ngay: Date;
  dienGiai: string;
  tongTien: number;
  soDong: number;
  /** Dương = lãi, âm = lỗ. */
  laiLo: number;
  nguoiTaoId?: string;
}

interface DongToiThieu {
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  soTien: number;
}

const LA_TAI_KHOAN_KQKD = (ma?: string) =>
  !!ma && ['5', '6', '7', '8', '9'].some((t) => ma.startsWith(t));

/**
 * Dựng cửa sổ kết chuyển `[đầu năm của ngày chốt, cuối ngày chốt]`.
 *
 * Chuẩn hoá về cuối ngày rồi mới lấy năm — cùng quy ước với
 * `nhat-ky-chung/helpers/build-query.helper.ts` và `so-chi-tiet.service.ts`. Nếu không,
 * chứng từ đúng ngày chốt nhưng có giờ khác 00:00 sẽ bị loại, và `dauNam` dựng theo cơ
 * sở khác `ngayKetThuc` có thể lệch năm ở biên 31/12.
 *
 * Dùng CHUNG cho `preview` (lấy số dư) và `create` (kiểm ngày hạch toán) để hai chỗ
 * không bao giờ lệch mốc nhau.
 */
export function dungCuaSoKetChuyen(denNgay: string): {
  dauNam: Date;
  ngayKetThuc: Date;
} {
  const ngayKetThuc = new Date(denNgay);
  ngayKetThuc.setHours(23, 59, 59, 999);
  const dauNam = new Date(ngayKetThuc.getFullYear(), 0, 1);
  return { dauNam, ngayKetThuc };
}

/**
 * Bút toán chốt lãi/lỗ là dòng có 911 ở một bên và bên kia KHÔNG phải tài khoản
 * kết quả kinh doanh (thường là 421x). Nhận diện theo hình dạng bút toán nên không
 * cần lưu thêm cờ vào chứng từ.
 *
 * Khi danh mục thiếu dòng `911 → 421x` (danh mục bắt đầu trống, banner cảnh báo không
 * chặn Lưu) thì lô đã ghi không có bút toán chốt. Lúc đó rơi về net của 911 trong cả
 * lô — Có 911 trừ Nợ 911 — để màn danh sách và form preview cho cùng một con số.
 */
export function tinhLaiLoTuDong(dong: DongToiThieu[], taiKhoan911 = '911'): number {
  for (const d of dong) {
    const no = d.taiKhoanNo;
    const co = d.taiKhoanCo;

    if (no?.startsWith(taiKhoan911) && !LA_TAI_KHOAN_KQKD(co)) {
      return d.soTien;
    }
    if (co?.startsWith(taiKhoan911) && !LA_TAI_KHOAN_KQKD(no)) {
      return -d.soTien;
    }
  }

  // Không có bút toán chốt → đo lãi/lỗ bằng net của 911. Giữ đúng quy ước của
  // `KetQuaKetChuyen.laiLo`: dương = lãi, âm = lỗ.
  let tongNo = 0;
  let tongCo = 0;
  for (const d of dong) {
    if (d.taiKhoanNo?.startsWith(taiKhoan911)) tongNo += d.soTien;
    if (d.taiKhoanCo?.startsWith(taiKhoan911)) tongCo += d.soTien;
  }

  // `|| 0` để chuẩn hoá -0 về 0: Object.is(-0, 0) là false nên nếu để lọt -0 ra
  // API/FE sẽ gây so sánh sai.
  return tongCo - tongNo || 0;
}

export function gomLoKetChuyen(rows: ChungTu[]): LoKetChuyen[] {
  const theoSoPhieu = new Map<string, ChungTu[]>();

  for (const r of rows) {
    const arr = theoSoPhieu.get(r.soPhieu) ?? [];
    arr.push(r);
    theoSoPhieu.set(r.soPhieu, arr);
  }

  const lo: LoKetChuyen[] = [];

  for (const [soPhieu, dong] of theoSoPhieu) {
    const dauTien = dong[0];
    lo.push({
      soPhieu,
      ngay: dauTien.ngay,
      dienGiai: dauTien.ghiChu || dauTien.noiDung,
      tongTien: dong.reduce((t, d) => t + (Number(d.soTien) || 0), 0),
      soDong: dong.length,
      laiLo: tinhLaiLoTuDong(
        dong.map((d) => ({
          taiKhoanNo: d.danhMuc?.taiKhoanNo?.ma,
          taiKhoanCo: d.danhMuc?.taiKhoanCo?.ma,
          soTien: Number(d.soTien) || 0,
        })),
      ),
      nguoiTaoId: dauTien.nguoiTaoId,
    });
  }

  return lo.sort((a, b) => new Date(b.ngay).getTime() - new Date(a.ngay).getTime());
}

/** Khoá tra quy chuẩn: một cặp TK Nợ/Có chỉ ứng với một nghiệp vụ. */
export function khoaCapTaiKhoan(taiKhoanNo: string, taiKhoanCo: string): string {
  return `${taiKhoanNo}|${taiKhoanCo}`;
}

/**
 * Nghiệp vụ cho một dòng kết chuyển.
 *
 * Ưu tiên danh mục Quy chuẩn — đó là nguồn nghiệp vụ của mọi chứng từ thường, dùng
 * chung thì bộ lọc "Nghiệp vụ" ở Nhật ký chung mới gom đúng một giá trị. Cặp TK chưa
 * khai quy chuẩn thì lấy diễn giải của dòng danh mục Tài khoản kết chuyển ("Kết chuyển
 * giá vốn hàng bán"...) để báo cáo không bỏ trống, thay vì bắt công ty khai đủ quy
 * chuẩn mới tổng hợp được.
 *
 * Trả `undefined` khi không có nguồn nào — chứng từ không gắn `nghiepVu`, đúng như
 * trước, chứ không gắn chuỗi rỗng.
 */
export function chonNghiepVu(
  nghiepVuTheoCapTaiKhoan: Map<string, string>,
  taiKhoanNo: string,
  taiKhoanCo: string,
  dienGiaiDanhMuc?: string,
): string | undefined {
  const tuQuyChuan = nghiepVuTheoCapTaiKhoan.get(
    khoaCapTaiKhoan(taiKhoanNo, taiKhoanCo),
  );
  if (tuQuyChuan?.trim()) return tuQuyChuan.trim();

  const tuDanhMuc = dienGiaiDanhMuc?.trim();
  return tuDanhMuc || undefined;
}
