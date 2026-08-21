import type {
  KqkdKeHoachDong,
  KqkdKeHoachReport,
} from "@/services/kqkdKeHoachService";

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

const so = (v?: number) => Number(v) || 0;

const cong = (thang: number[], tu: number, den: number) => {
  let tong = 0;
  for (let i = tu; i < den; i++) tong += so(thang[i]);
  return tong;
};

function dungHang(dong: KqkdKeHoachDong, mauSo: number): HangKqkd {
  const thang = Array.from({ length: 12 }, (_, i) => so(dong.thang?.[i]));
  const nam = cong(thang, 0, 12);
  const con = (dong.con ?? []).map((c) => dungHang(c, mauSo));

  return {
    key: dong.key,
    nhan: dong.soLaMa ? `${dong.soLaMa}. ${dong.ten}` : dong.ten,
    cap: dong.cap,
    thang,
    quy: [0, 1, 2, 3].map((q) => cong(thang, q * 3, q * 3 + 3)),
    sauThangDau: cong(thang, 0, 6),
    sauThangCuoi: cong(thang, 6, 12),
    nam,
    // Cùng một mẫu số cho cả bảng: doanh thu thuần cả năm, đúng cột "% DT thuần"
    // của trang Báo cáo KQKD.
    phanTram: mauSo === 0 ? null : nam / mauSo,
    // Mảng rỗng vẫn làm antd vẽ nút mở/đóng — bỏ hẳn trường đi.
    ...(con.length > 0 ? { children: con } : {}),
  };
}

export function dungBangKqkd(report: KqkdKeHoachReport): HangKqkd[] {
  const mauSo = so(report.doanhThuThuanNam);
  return report.dong.map((d) => dungHang(d, mauSo));
}
