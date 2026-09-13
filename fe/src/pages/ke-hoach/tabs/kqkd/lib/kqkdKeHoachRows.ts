import type {
  KqkdKeHoachDong,
  KqkdKeHoachReport,
} from "@/services/kqkdKeHoachService";
import {
  congKhoang,
  hoaVonKhoang,
  so,
  tyLeTrenCha,
  tyLeTrenDoanhThu,
  type NguonHoaVon,
} from "../../lib/kyCot";

/**
 * Một hàng của bảng P&L. BE chỉ trả 12 số tháng; mọi kỳ khác (quý, 6 tháng, cả
 * năm) đều cộng tại chỗ từ 12 số đó — xem `giaTri`.
 *
 * Cố ý KHÔNG gộp sẵn theo kỳ: cột của bảng là các kỳ, mỗi kỳ lại có ba ô
 * (Số tiền · %DS · Tỷ trọng) cần mẫu số riêng, nên giữ nguyên liệu gọn hơn
 * nhiều so với dựng sẵn ba con số cho mười chín kỳ.
 */
export interface HangKqkd {
  key: string;
  /** Chuỗi hiện ở cột Chỉ tiêu — cấp 0 ghép số La Mã, cấp dưới giữ nguyên tên. */
  nhan: string;
  cap: 0 | 1 | 2;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  /** 12 tháng của DÒNG CHA — mẫu số của cột "Tỷ trọng". */
  cha?: number[];
  /**
   * Chỉ dòng DOANH THU HÒA VỐN mới có. Hòa vốn là TỶ SỐ nên không cộng dồn từ
   * 12 số tháng được — phải giữ nguyên liệu để mỗi kỳ tính lại.
   */
  nguonHoaVon?: NguonHoaVon;
  children?: HangKqkd[];
}

const chuanHoa12 = (thang?: number[]): number[] =>
  Array.from({ length: 12 }, (_, i) => so(thang?.[i]));

function dungHang(dong: KqkdKeHoachDong): HangKqkd {
  const thang = chuanHoa12(dong.thang);
  const con = (dong.con ?? []).map((c) => ({ ...dungHang(c), cha: thang }));

  return {
    key: dong.key,
    nhan: dong.soLaMa ? `${dong.soLaMa}. ${dong.ten}` : dong.ten,
    cap: dong.cap,
    thang,
    // Mảng rỗng vẫn làm antd vẽ nút mở/đóng — bỏ hẳn trường đi.
    ...(con.length > 0 ? { children: con } : {}),
  };
}

/** Dòng cuối bảng. Mỗi cột tính riêng từ ba dãy 12 tháng BE trả về. */
function dungHangHoaVon(report: KqkdKeHoachReport): HangKqkd {
  return {
    key: "HOA_VON",
    nhan: "DOANH THU HÒA VỐN",
    cap: 0,
    // Dãy này không dùng để tính hòa vốn (xem `nguonHoaVon`) — để rỗng cho đúng
    // kiểu dữ liệu.
    thang: Array(12).fill(0),
    nguonHoaVon: {
      doanhThuThuanThang: report.doanhThuThuanThang,
      dinhPhiThang: report.dinhPhiThang,
      bienPhiThang: report.bienPhiThang,
    },
  };
}

export function dungBangKqkd(report: KqkdKeHoachReport): HangKqkd[] {
  return [...report.dong.map(dungHang), dungHangHoaVon(report)];
}

/** Cột "Số tiền" của một kỳ: tổng khoảng tháng [tu, den). */
export function giaTri(row: HangKqkd, tu: number, den: number): number {
  return row.nguonHoaVon
    ? hoaVonKhoang(row.nguonHoaVon, tu, den)
    : congKhoang(row.thang, tu, den);
}

/** Cột "%DS": tỷ lệ trên doanh thu thuần của chính kỳ đó. */
export function phanTramDS(
  report: KqkdKeHoachReport,
  row: HangKqkd,
  tu: number,
  den: number,
): number | null {
  return tyLeTrenDoanhThu(
    giaTri(row, tu, den),
    report.doanhThuThuanThang,
    tu,
    den,
  );
}

/** Cột "Tỷ trọng": tỷ lệ trên dòng cha trong cùng kỳ. */
export function tyTrong(
  row: HangKqkd,
  tu: number,
  den: number,
): number | null {
  // Dòng hòa vốn đứng ngoài mọi nhóm nên không có tỷ trọng.
  if (row.nguonHoaVon) return null;
  return tyLeTrenCha(congKhoang(row.thang, tu, den), row.cha, tu, den);
}
