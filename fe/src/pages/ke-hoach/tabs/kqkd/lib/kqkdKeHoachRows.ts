import type {
  KqkdKeHoachDong,
  KqkdKeHoachReport,
} from "@/services/kqkdKeHoachService";
// Phép cộng theo kỳ và công thức hòa vốn dùng chung với bảng P&L so sánh ba lớp.
import { congKhoang, hoaVonKhoang, KHOANG_QUY, so } from "../../lib/kyCot";

/** Một hàng của bảng KQKD kế hoạch. BE chỉ trả 12 tháng, phần còn lại tính ở đây. */
export interface HangKqkd {
  key: string;
  /** Chuỗi hiện ở cột Chỉ tiêu — cấp 0 ghép số La Mã, cấp dưới giữ nguyên tên. */
  nhan: string;
  cap: 0 | 1 | 2;
  thang: number[];
  /** Bốn quý, mỗi quý là tổng ba tháng. */
  quy: number[];
  sauThangDau: number;
  sauThangCuoi: number;
  nam: number;
  /** Tỷ lệ trên doanh thu thuần cả năm; `null` khi mẫu số bằng 0. */
  phanTram: number | null;
  children?: HangKqkd[];
}

function dungHang(dong: KqkdKeHoachDong, mauSo: number): HangKqkd {
  const thang = Array.from({ length: 12 }, (_, i) => so(dong.thang?.[i]));
  const nam = congKhoang(thang, 0, 12);
  const con = (dong.con ?? []).map((c) => dungHang(c, mauSo));

  return {
    key: dong.key,
    nhan: dong.soLaMa ? `${dong.soLaMa}. ${dong.ten}` : dong.ten,
    cap: dong.cap,
    thang,
    quy: KHOANG_QUY.map(([tu, den]) => congKhoang(thang, tu, den)),
    sauThangDau: congKhoang(thang, 0, 6),
    sauThangCuoi: congKhoang(thang, 6, 12),
    nam,
    // Cùng một mẫu số cho cả bảng: doanh thu thuần cả năm, đúng cột "% DT thuần"
    // của trang Báo cáo KQKD.
    phanTram: mauSo === 0 ? null : nam / mauSo,
    // Mảng rỗng vẫn làm antd vẽ nút mở/đóng — bỏ hẳn trường đi.
    ...(con.length > 0 ? { children: con } : {}),
  };
}

/**
 * Dòng cuối bảng. Mỗi cột tính riêng từ ba dãy 12 tháng BE trả về, cùng phạm vi
 * tháng với cột tương ứng của các dòng trên.
 */
function dungHangHoaVon(report: KqkdKeHoachReport, mauSo: number): HangKqkd {
  const tinh = (tu: number, den: number) => hoaVonKhoang(report, tu, den);

  const nam = tinh(0, 12);
  return {
    key: "HOA_VON",
    nhan: "DOANH THU HÒA VỐN",
    cap: 0,
    thang: Array.from({ length: 12 }, (_, i) => tinh(i, i + 1)),
    quy: KHOANG_QUY.map(([tu, den]) => tinh(tu, den)),
    sauThangDau: tinh(0, 6),
    sauThangCuoi: tinh(6, 12),
    nam,
    phanTram: mauSo === 0 ? null : nam / mauSo,
  };
}

export function dungBangKqkd(report: KqkdKeHoachReport): HangKqkd[] {
  const mauSo = so(report.doanhThuThuanNam);
  return [
    ...report.dong.map((d) => dungHang(d, mauSo)),
    dungHangHoaVon(report, mauSo),
  ];
}
