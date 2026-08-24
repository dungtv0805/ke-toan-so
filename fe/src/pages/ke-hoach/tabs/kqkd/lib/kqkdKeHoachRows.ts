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

/**
 * Doanh thu hòa vốn = tổng định phí / (1 − tổng biến phí / doanh thu thuần).
 *
 * Tính cho MỘT kỳ (một khoảng tháng), không cộng dồn được từ các kỳ nhỏ hơn:
 * nó là tỷ số nên hòa vốn cả năm khác tổng hòa vốn 12 tháng.
 *
 * Trả 0 khi không xác định được — doanh thu bằng 0, hoặc biến phí đã ăn hết
 * doanh thu (tỷ lệ số dư đảm phí ≤ 0, bán bao nhiêu cũng không hòa vốn). Cột
 * hiển thị vẽ số 0 thành dấu gạch ngang, đúng ý "chưa có số".
 */
const hoaVon = (dinhPhi: number, bienPhi: number, doanhThu: number): number => {
  if (doanhThu <= 0) return 0;
  const tyLeSoDuDamPhi = 1 - bienPhi / doanhThu;
  if (tyLeSoDuDamPhi <= 0) return 0;
  return dinhPhi / tyLeSoDuDamPhi;
};

/**
 * Dòng cuối bảng. Mỗi cột tính riêng từ ba dãy 12 tháng BE trả về, cùng phạm vi
 * tháng với cột tương ứng của các dòng trên.
 */
function dungHangHoaVon(report: KqkdKeHoachReport, mauSo: number): HangKqkd {
  const dinhPhi = report.dinhPhiThang;
  const bienPhi = report.bienPhiThang;
  const doanhThu = report.doanhThuThuanThang;
  const tinh = (tu: number, den: number) =>
    hoaVon(cong(dinhPhi, tu, den), cong(bienPhi, tu, den), cong(doanhThu, tu, den));

  const nam = tinh(0, 12);
  return {
    key: "HOA_VON",
    nhan: "DOANH THU HÒA VỐN",
    cap: 0,
    thang: Array.from({ length: 12 }, (_, i) => tinh(i, i + 1)),
    quy: [0, 1, 2, 3].map((q) => tinh(q * 3, q * 3 + 3)),
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
