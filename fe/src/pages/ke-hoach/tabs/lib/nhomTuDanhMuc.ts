import { sapXepTheoNhan } from "@/lib/sapXep";

/** Một dòng của danh mục NHÓM (Nhóm dòng tiền, Nhóm sản phẩm…). */
export interface NhomDanhMuc {
  ma: string;
  ten: string;
}

/** Một dòng của danh mục CON — mang mã nhóm ở trường `nhom`, không phải id. */
export interface MucDanhMuc {
  id: string;
  ma: string;
  ten: string;
  nhom?: string;
}

export interface OptionNhom {
  value: string;
  label: string;
}

/**
 * Danh sách nhóm để đổ vào ô "Chọn nhóm" của bảng kế hoạch.
 *
 * Không đọc mỗi danh mục Nhóm: nhiều công ty chưa từng nhập danh mục đó, nên ô
 * "Chọn nhóm" hiện Trống và người dùng tắc hẳn — dù danh mục con (Dòng tiền,
 * Sản phẩm) vẫn đầy đủ và mỗi dòng đã mang sẵn mã nhóm. Ở đây gộp thêm các mã
 * nhóm CÓ THẬT trên danh mục con để ô luôn chọn được.
 *
 * Khoá gộp là MÃ, không phải tên: hai nhóm khác nhau hoàn toàn có thể trùng
 * tên, gộp theo tên là nuốt mất một nhóm.
 */
export function nhomOptions(
  nhomList: NhomDanhMuc[],
  mucList: MucDanhMuc[],
): OptionNhom[] {
  const theoMa = new Map<string, string>();

  // Danh mục Nhóm đi trước để tên chính thức thắng mã trần suy ra bên dưới.
  for (const n of nhomList) {
    if (!n.ma) continue;
    theoMa.set(n.ma, `${n.ma} - ${n.ten}`);
  }

  for (const m of mucList) {
    const ma = m.nhom;
    if (!ma) continue;
    if (theoMa.has(ma)) continue;
    // Chưa khai trong danh mục Nhóm → hiện trần mã, còn hơn là không chọn được.
    theoMa.set(ma, ma);
  }

  return sapXepTheoNhan(
    [...theoMa.entries()].map(([value, label]) => ({ value, label })),
  );
}

/**
 * Mã nhóm của một mục danh mục — dùng để tự điền ô Nhóm khi người dùng chọn
 * thẳng ở ô tên, khỏi phải chọn hai lần.
 */
export function nhomCuaMuc(mucList: MucDanhMuc[], id: string): string {
  return mucList.find((m) => m.id === id)?.nhom ?? "";
}
