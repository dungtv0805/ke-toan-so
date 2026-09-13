/**
 * Ghép ba báo cáo KẾ HOẠCH – DỰ BÁO – THỰC HIỆN thành một bảng so sánh.
 *
 * Ba cây do BE trả về dùng CÙNG tập khoá ('01', '01:N1', '25:N2:KM01') vì cùng
 * đi qua một hàm dựng — nên ghép theo `key` là đủ, không cần so tên.
 *
 * Bảng giữ nguyên 12 số tháng của từng lớp chứ không gộp sẵn theo một kỳ: cột
 * của bảng là các KỲ (Năm · 6 tháng · quý · tháng, đúng bộ cột của bảng P&L),
 * còn người dùng chọn đang xem LỚP nào. Vì vậy giá trị mỗi ô phải tính tại chỗ
 * từ khoảng tháng của đúng cột đó — xem `giaTriO`.
 *
 * Thuần, không đụng React.
 */

import type {
  Kqkd3LopReport,
  KqkdKeHoachDong,
  KqkdKeHoachReport,
} from "@/services/kqkd3LopService";
import { congKhoang, hoaVonKhoang, so, type NguonHoaVon } from "../../lib/kyCot";

/** Lớp số liệu đang xem — chọn ở thanh công cụ, quyết định nội dung mọi ô. */
export type Lop =
  | "keHoach"
  | "duBao"
  | "thucHien"
  | "chenhLech"
  | "phanTramDat";

export const LOP_OPTIONS: { value: Lop; label: string }[] = [
  { value: "keHoach", label: "Kế hoạch" },
  { value: "duBao", label: "Dự báo" },
  { value: "thucHien", label: "Thực hiện" },
  { value: "chenhLech", label: "Chênh lệch" },
  { value: "phanTramDat", label: "% đạt" },
];

/** Ba lớp mang số tiền; hai lớp còn lại là kết quả so sánh, định dạng khác hẳn. */
export const laLopTien = (lop: Lop): boolean =>
  lop === "keHoach" || lop === "duBao" || lop === "thucHien";

export interface Hang3Lop {
  key: string;
  nhan: string;
  cap: 0 | 1 | 2;
  /** Ba dãy 12 tháng, chỉ số 0 là T1. */
  keHoach: number[];
  duBao: number[];
  thucHien: number[];
  /**
   * Chỉ dòng DOANH THU HÒA VỐN mới có. Hòa vốn là TỶ SỐ nên không cộng dồn từ
   * 12 số tháng được — phải giữ nguyên liệu (định phí / biến phí / doanh thu)
   * để mỗi cột tính lại trong đúng khoảng tháng của nó.
   */
  nguonHoaVon?: Record<"keHoach" | "duBao" | "thucHien", NguonHoaVon>;
  children?: Hang3Lop[];
}

type BangDong = Map<string, KqkdKeHoachDong>;

const lapBang = (ds: KqkdKeHoachDong[] = []): BangDong =>
  new Map(ds.map((d) => [d.key, d]));

const chuanHoa12 = (thang?: number[]): number[] =>
  Array.from({ length: 12 }, (_, i) => so(thang?.[i]));

/**
 * Thứ tự khoá: lấy theo Kế hoạch trước (đó là bộ khung người dùng đã lập), rồi
 * bổ sung khoá chỉ có ở Dự báo và Thực hiện vào cuối.
 *
 * Không bỏ khoá lạ: một nhóm phát sinh thật mà chưa lập kế hoạch vẫn phải hiện,
 * nếu không bảng so sánh sẽ giấu mất đúng phần đáng chú ý nhất.
 */
function thuTuKhoa(...bang: BangDong[]): string[] {
  const thuTu: string[] = [];
  const daCo = new Set<string>();
  for (const b of bang) {
    for (const key of b.keys()) {
      if (daCo.has(key)) continue;
      daCo.add(key);
      thuTu.push(key);
    }
  }
  return thuTu;
}

function ghepMuc(
  keHoach: KqkdKeHoachDong[] = [],
  duBao: KqkdKeHoachDong[] = [],
  thucHien: KqkdKeHoachDong[] = [],
): Hang3Lop[] {
  const bKh = lapBang(keHoach);
  const bDb = lapBang(duBao);
  const bTh = lapBang(thucHien);

  return thuTuKhoa(bKh, bDb, bTh).map((key) => {
    const kh = bKh.get(key);
    const db = bDb.get(key);
    const th = bTh.get(key);
    const mau = kh ?? db ?? th!;

    const con = ghepMuc(kh?.con, db?.con, th?.con);

    return {
      key,
      nhan: mau.soLaMa ? `${mau.soLaMa}. ${mau.ten}` : mau.ten,
      cap: mau.cap,
      keHoach: chuanHoa12(kh?.thang),
      duBao: chuanHoa12(db?.thang),
      thucHien: chuanHoa12(th?.thang),
      // Mảng rỗng vẫn làm antd vẽ nút mở/đóng — bỏ hẳn trường đi.
      ...(con.length > 0 ? { children: con } : {}),
    };
  });
}

const nguonCua = (bc: KqkdKeHoachReport): NguonHoaVon => ({
  doanhThuThuanThang: bc.doanhThuThuanThang,
  dinhPhiThang: bc.dinhPhiThang,
  bienPhiThang: bc.bienPhiThang,
});

/** Dòng cuối bảng, đúng như dòng cuối của bảng P&L một lớp. */
function dungHangHoaVon(bc: Kqkd3LopReport): Hang3Lop {
  const rong = Array(12).fill(0) as number[];
  return {
    key: "HOA_VON",
    nhan: "DOANH THU HÒA VỐN",
    cap: 0,
    // Ba dãy này không được dùng để tính hòa vốn (xem `nguonHoaVon`) — để rỗng
    // cho đúng kiểu dữ liệu.
    keHoach: rong,
    duBao: rong,
    thucHien: rong,
    nguonHoaVon: {
      keHoach: nguonCua(bc.keHoach),
      duBao: nguonCua(bc.duBao),
      thucHien: nguonCua(bc.thucHien),
    },
  };
}

export function ghep3Lop(bc: Kqkd3LopReport): Hang3Lop[] {
  return [
    ...ghepMuc(bc.keHoach.dong, bc.duBao.dong, bc.thucHien.dong),
    dungHangHoaVon(bc),
  ];
}

/** Số tiền của MỘT lớp gốc trong khoảng tháng [tu, den). */
function giaTriLopTien(
  row: Hang3Lop,
  lop: "keHoach" | "duBao" | "thucHien",
  tu: number,
  den: number,
): number {
  return row.nguonHoaVon
    ? hoaVonKhoang(row.nguonHoaVon[lop], tu, den)
    : congKhoang(row[lop], tu, den);
}

/**
 * Giá trị một ô: lớp đang xem, trong khoảng tháng [tu, den) của cột đó.
 *
 * Chênh lệch và % đạt tính TRONG CHÍNH KỲ ĐÓ, không phải lấy số cả năm chia ra
 * — tháng 3 hụt kế hoạch mà cả năm vẫn đạt là chuyện thường, bảng phải chỉ ra
 * được đúng tháng hụt.
 *
 * Trả `null` chỉ ở một trường hợp: % đạt mà kế hoạch kỳ đó bằng 0 (chưa lập kế
 * hoạch thì không có gì để đạt).
 */
export function giaTriO(
  row: Hang3Lop,
  lop: Lop,
  tu: number,
  den: number,
): number | null {
  if (laLopTien(lop)) {
    return giaTriLopTien(row, lop as "keHoach" | "duBao" | "thucHien", tu, den);
  }
  const kh = giaTriLopTien(row, "keHoach", tu, den);
  const th = giaTriLopTien(row, "thucHien", tu, den);
  if (lop === "chenhLech") return th - kh;
  return kh === 0 ? null : th / kh;
}

/**
 * Mẫu số của cột "%": doanh thu thuần cả năm của ĐÚNG lớp đang xem.
 *
 * Chênh lệch và % đạt không phải số tiền của một lớp nào nên không có tỷ lệ
 * trên doanh thu — trả 0 để phía hiển thị ẩn hẳn cột đi.
 */
export function mauSoPhanTram(bc: Kqkd3LopReport, lop: Lop): number {
  if (!laLopTien(lop)) return 0;
  return so(bc[lop as "keHoach" | "duBao" | "thucHien"].doanhThuThuanNam);
}
