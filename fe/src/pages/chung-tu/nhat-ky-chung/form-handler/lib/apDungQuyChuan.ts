import type { DongTien, KhoanMuc, QuyChuan } from "@/types";
import {
  buildDongTienSnapshot,
  buildKhoanMucSnapshot,
} from "@/utils/snapshotBuilder";

/**
 * Chép thiết lập từ Quy chuẩn hạch toán sang một dòng hạch toán.
 *
 * Trước đây chỉ chép TK Nợ / TK Có / mô tả, nên Dòng tiền và Khoản mục khai ở
 * quy chuẩn không bao giờ sang tới chứng từ — kế toán phải chọn tay lại từng
 * dòng dù đã khai sẵn.
 *
 * KHÔNG gán thẳng được: quy chuẩn lưu theo MÃ (`dongTien: "T10"`), còn dòng
 * hạch toán định danh theo ID kèm snapshot (`dongTienId` + `dongTienSnapshot`)
 * — báo cáo đọc mã từ snapshot chứ không join lại danh mục. Nên phải tra bảng.
 */

export interface DanhMucTra {
  dongTienList: DongTien[];
  khoanMucList: KhoanMuc[];
}

/**
 * Chỉ khai những trường hàm này ĐỌC hoặc GHI. Snapshot để `unknown` vì kiểu
 * thật ở dòng hạch toán là `Record<string, unknown>` còn `buildXSnapshot` trả
 * về kiểu cụ thể — ràng chặt ở đây chỉ tạo ra ép kiểu vô ích.
 */
type DongToiThieu = {
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  noiDung?: string;
  dongTienId?: string;
  dongTienSnapshot?: unknown;
  khoanMucId?: string;
  khoanMucSnapshot?: unknown;
};

export function apDungQuyChuan<T extends DongToiThieu>(
  dong: T,
  quyChuan: QuyChuan | undefined,
  danhMuc: DanhMucTra,
): T {
  if (!quyChuan) return dong;

  const ra: T = {
    ...dong,
    taiKhoanNo: quyChuan.taiKhoanNo || dong.taiKhoanNo,
    taiKhoanCo: quyChuan.taiKhoanCo || dong.taiKhoanCo,
    noiDung: quyChuan.moTa || dong.noiDung,
  };

  // Mã không còn trong danh mục (đã xoá/đổi mã) thì GIỮ NGUYÊN lựa chọn hiện
  // có. Làm trống ô là vừa mất dữ liệu người dùng vừa không nói vì sao.
  const dongTien = quyChuan.dongTien
    ? danhMuc.dongTienList.find((d) => d.ma === quyChuan.dongTien)
    : undefined;
  if (dongTien) {
    ra.dongTienId = dongTien.id;
    ra.dongTienSnapshot = buildDongTienSnapshot(dongTien);
  }

  const khoanMuc = quyChuan.khoanMuc
    ? danhMuc.khoanMucList.find((k) => k.ma === quyChuan.khoanMuc)
    : undefined;
  if (khoanMuc) {
    ra.khoanMucId = khoanMuc.id;
    ra.khoanMucSnapshot = buildKhoanMucSnapshot(khoanMuc);
  }

  return ra;
}
