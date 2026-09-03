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

/** Rổ option của một nhóm — đúng dạng optgroup mà antd Select nhận. */
export interface NhomOptionGroup {
  label: string;
  options: OptionNhom[];
}

/** Nhãn rổ chứa các mục danh mục chưa gắn nhóm nào. */
export const NHAN_CHUA_GAN_NHOM = '(Chưa gán nhóm)';

/**
 * Toàn bộ mục danh mục con, gom sẵn theo nhóm để đổ vào MỘT ô select.
 *
 * Bảng kế hoạch từng có hai ô: chọn nhóm rồi mới chọn mục. Bước chọn nhóm là
 * thừa — mỗi mục đã mang sẵn mã nhóm (`MucDanhMuc.nhom`), và chiều Thu/Chi suy
 * tiếp từ nhóm đó (xem `chieuCuaNhom`). Gom theo optgroup thì người dùng vẫn
 * nhìn thấy cây nhóm ngay trong ô, mà chỉ phải chọn một lần.
 *
 * Gom theo MÃ chứ không theo tên: hai nhóm khác nhau có thể trùng tên.
 * Nhóm rỗng không sinh rổ — rổ trống chỉ tổ làm dài danh sách.
 */
export function mucOptionsTheoNhom(
  nhomList: NhomDanhMuc[],
  mucList: MucDanhMuc[],
): NhomOptionGroup[] {
  const nhanNhom = new Map<string, string>();
  for (const n of nhomList) {
    if (n.ma) nhanNhom.set(n.ma, `${n.ma} - ${n.ten}`);
  }

  const theoNhom = new Map<string, OptionNhom[]>();
  for (const m of mucList) {
    const ma = m.nhom || '';
    const cungNhom = theoNhom.get(ma) ?? [];
    cungNhom.push({ value: m.id, label: `${m.ma} - ${m.ten}` });
    theoNhom.set(ma, cungNhom);
  }

  const coNhom = [...theoNhom.entries()].filter(([ma]) => ma !== '');
  const nhom = sapXepTheoNhan(
    coNhom.map(([ma, options]) => ({
      // Chưa khai ở danh mục Nhóm → hiện mã trần, còn hơn dồn vào rổ "chưa gán".
      label: nhanNhom.get(ma) ?? ma,
      options: sapXepTheoNhan(options),
    })),
  );

  // Rổ "chưa gán" luôn xuống cuối: nó là chỗ chứa dữ liệu còn thiếu, không phải
  // một nhóm nghiệp vụ để lẫn vào giữa danh sách.
  const chuaGan = theoNhom.get('');
  return chuaGan
    ? [...nhom, { label: NHAN_CHUA_GAN_NHOM, options: sapXepTheoNhan(chuaGan) }]
    : nhom;
}
