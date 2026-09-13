/**
 * Ghép ba báo cáo KẾ HOẠCH – DỰ BÁO – THỰC HIỆN thành một bảng so sánh.
 *
 * Ba cây do BE trả về dùng CÙNG tập khoá ('01', '01:N1', '25:N2:KM01') vì cùng
 * đi qua một hàm dựng — nên ghép theo `key` là đủ, không cần so tên.
 *
 * Bảng giữ nguyên 12 số tháng của từng lớp chứ không gộp sẵn theo một kỳ: cột
 * của bảng là các KỲ (Năm · 6 tháng · quý · tháng, đúng bộ cột của bảng P&L),
 * mỗi kỳ bày đủ năm khối: KẾ HOẠCH · DỰ BÁO · THỰC HIỆN · THỰC HIỆN vs KẾ
 * HOẠCH · THỰC HIỆN vs DỰ BÁO. Giá trị mỗi ô tính tại chỗ từ khoảng tháng của
 * đúng cột đó.
 *
 * Thuần, không đụng React.
 */

import type {
  Kqkd3LopReport,
  KqkdKeHoachDong,
  KqkdKeHoachReport,
} from "@/services/kqkd3LopService";
import {
  congKhoang,
  hoaVonKhoang,
  so,
  tyLeTrenCha,
  tyLeTrenDoanhThu,
  type NguonHoaVon,
} from "../../lib/kyCot";

// Bộ cột kỳ dùng chung với bảng P&L một lớp — xuất lại để nơi gọi cũ khỏi phải
// biết nó đã dọn sang `lib/kyCot`.
export { COT_KY, type CotKy } from "../../lib/kyCot";

/** Ba lớp số liệu gốc. Hai khối "vs" là phép trừ giữa chúng, không phải lớp thứ tư. */
export type LopTien = "keHoach" | "duBao" | "thucHien";

/** Mốc để so THỰC HIỆN với: kế hoạch hoặc dự báo. */
export type Moc = "keHoach" | "duBao";

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
  nguonHoaVon?: Record<LopTien, NguonHoaVon>;
  /**
   * Ba dãy 12 tháng của DÒNG CHA — mẫu số của cột "Tỷ trọng". Giữ bản sao tham
   * chiếu thay vì trỏ ngược lên cả dòng cha: không tạo vòng tham chiếu, và chỉ
   * cần đúng thứ dùng tới.
   */
  cha?: Record<LopTien, number[]>;
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

    const keHoach = chuanHoa12(kh?.thang);
    const duBao = chuanHoa12(db?.thang);
    const thucHien = chuanHoa12(th?.thang);
    const con = ghepMuc(kh?.con, db?.con, th?.con).map((c) => ({
      ...c,
      cha: { keHoach, duBao, thucHien },
    }));

    return {
      key,
      nhan: mau.soLaMa ? `${mau.soLaMa}. ${mau.ten}` : mau.ten,
      cap: mau.cap,
      keHoach,
      duBao,
      thucHien,
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
/**
 * Số tiền của MỘT lớp trong khoảng tháng [tu, den).
 *
 * Dòng hòa vốn là tỷ số nên không cộng dồn được — tính lại từ ba dãy nguyên
 * liệu của chính khoảng đó.
 */
export function giaTri(
  row: Hang3Lop,
  lop: LopTien,
  tu: number,
  den: number,
): number {
  return row.nguonHoaVon
    ? hoaVonKhoang(row.nguonHoaVon[lop], tu, den)
    : congKhoang(row[lop], tu, den);
}
/**
 * Khối "THỰC HIỆN vs KẾ HOẠCH" / "THỰC HIỆN vs DỰ BÁO", cột GIÁ TRỊ.
 *
 * Tính TRONG CHÍNH KỲ ĐÓ, không phải lấy số cả năm chia ra — tháng 3 hụt kế
 * hoạch mà cả năm vẫn đạt là chuyện thường, bảng phải chỉ ra được tháng hụt.
 */
export function chenhLech(
  row: Hang3Lop,
  moc: Moc,
  tu: number,
  den: number,
): number {
  return giaTri(row, "thucHien", tu, den) - giaTri(row, moc, tu, den);
}

/**
 * Cột "Tỷ lệ" của hai khối so sánh: CHÊNH LỆCH chia cho mốc — vượt hay hụt bao
 * nhiêu phần trăm, KHÔNG phải Thực hiện / Kế hoạch.
 *
 * `null` khi mốc bằng 0: chưa lập kế hoạch thì không có gì để so.
 */
export function tyLeChenhLech(
  row: Hang3Lop,
  moc: Moc,
  tu: number,
  den: number,
): number | null {
  const goc = giaTri(row, moc, tu, den);
  if (goc === 0) return null;
  return chenhLech(row, moc, tu, den) / goc;
}

/**
 * Cột "%DS": tỷ lệ trên DOANH THU THUẦN CỦA CHÍNH KỲ ĐÓ, theo lớp đang xem.
 *
 * Khác cột "%" của bảng P&L một lớp (luôn chia cho doanh thu thuần cả năm):
 * ở đây mỗi cột là một kỳ độc lập, chia cho doanh thu cả năm thì tháng nào
 * cũng ra con số bé tí, không so được giữa các tháng.
 *
 * `null` khi kỳ đó chưa có doanh thu — không chia được.
 */
export function phanTramDS(
  bc: Kqkd3LopReport,
  row: Hang3Lop,
  lop: LopTien,
  tu: number,
  den: number,
): number | null {
  return tyLeTrenDoanhThu(
    giaTri(row, lop, tu, den),
    bc[lop].doanhThuThuanThang,
    tu,
    den,
  );
}

/**
 * Cột "Tỷ trọng": tỷ lệ trên DÒNG CHA trong cùng kỳ — các dòng con của một mục
 * cộng lại đúng 100%.
 *
 * Dòng mục La Mã không có cha: nó chính là gốc của nhóm bên dưới nên bằng 100%.
 * Dòng DOANH THU HÒA VỐN đứng ngoài mọi nhóm nên không có tỷ trọng.
 */
export function tyTrong(
  row: Hang3Lop,
  lop: LopTien,
  tu: number,
  den: number,
): number | null {
  // Dòng hòa vốn đứng ngoài mọi nhóm nên không có tỷ trọng.
  if (row.nguonHoaVon) return null;
  return tyLeTrenCha(congKhoang(row[lop], tu, den), row.cha?.[lop], tu, den);
}
