/**
 * Ghép ba báo cáo KẾ HOẠCH – DỰ BÁO – THỰC HIỆN thành một bảng so sánh.
 *
 * Ba cây do BE trả về dùng CÙNG tập khoá ('01', '01:N1', '25:N2:KM01') vì cùng
 * đi qua một hàm dựng — nên ghép theo `key` là đủ, không cần so tên.
 *
 * Thuần, không đụng React.
 */

import type {
  Kqkd3LopReport,
  KqkdKeHoachDong,
} from "@/services/kqkd3LopService";

/** Kỳ xem: cả năm, một quý, hoặc một tháng. */
export type Ky =
  | "NAM"
  | "Q1"
  | "Q2"
  | "Q3"
  | "Q4"
  | `T${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;

export const KY_OPTIONS: { value: Ky; label: string }[] = [
  { value: "NAM", label: "Cả năm" },
  ...([1, 2, 3, 4] as const).map((q) => ({
    value: `Q${q}` as Ky,
    label: `Quý ${q}`,
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    value: `T${i + 1}` as Ky,
    label: `Tháng ${i + 1}`,
  })),
];

const so = (v?: number) => Number(v) || 0;

/** Giá trị của một dãy 12 tháng trong kỳ đang xem. */
export function giaTriKy(thang: number[], ky: Ky): number {
  if (ky === "NAM") {
    return thang.reduce((t, v) => t + so(v), 0);
  }
  if (ky.startsWith("Q")) {
    const q = Number(ky.slice(1)) - 1;
    return so(thang[q * 3]) + so(thang[q * 3 + 1]) + so(thang[q * 3 + 2]);
  }
  return so(thang[Number(ky.slice(1)) - 1]);
}

export interface Hang3Lop {
  key: string;
  nhan: string;
  cap: 0 | 1 | 2;
  keHoach: number;
  duBao: number;
  thucHien: number;
  /** Thực hiện − Kế hoạch. */
  chenhLech: number;
  /** Thực hiện / Kế hoạch; `null` khi kế hoạch bằng 0 (không chia được). */
  phanTramDat: number | null;
  children?: Hang3Lop[];
}

type BangDong = Map<string, KqkdKeHoachDong>;

const lapBang = (ds: KqkdKeHoachDong[] = []): BangDong =>
  new Map(ds.map((d) => [d.key, d]));

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
  ky: Ky,
): Hang3Lop[] {
  const bKh = lapBang(keHoach);
  const bDb = lapBang(duBao);
  const bTh = lapBang(thucHien);

  return thuTuKhoa(bKh, bDb, bTh).map((key) => {
    const kh = bKh.get(key);
    const db = bDb.get(key);
    const th = bTh.get(key);
    const mau = kh ?? db ?? th!;

    const vKh = kh ? giaTriKy(kh.thang, ky) : 0;
    const vDb = db ? giaTriKy(db.thang, ky) : 0;
    const vTh = th ? giaTriKy(th.thang, ky) : 0;

    const con = ghepMuc(kh?.con, db?.con, th?.con, ky);

    return {
      key,
      nhan: mau.soLaMa ? `${mau.soLaMa}. ${mau.ten}` : mau.ten,
      cap: mau.cap,
      keHoach: vKh,
      duBao: vDb,
      thucHien: vTh,
      chenhLech: vTh - vKh,
      phanTramDat: vKh === 0 ? null : vTh / vKh,
      // Mảng rỗng vẫn làm antd vẽ nút mở/đóng — bỏ hẳn trường đi.
      ...(con.length > 0 ? { children: con } : {}),
    };
  });
}

export function ghep3Lop(bc: Kqkd3LopReport, ky: Ky): Hang3Lop[] {
  return ghepMuc(bc.keHoach.dong, bc.duBao.dong, bc.thucHien.dong, ky);
}
