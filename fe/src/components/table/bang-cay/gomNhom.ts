/** Một mục trong danh mục nhóm — dùng để lấy tên và màu cho dòng cấp 1. */
export interface MucNhom {
  ma: string;
  ten: string;
  color?: string;
}

/** Tiền tố khoá dòng nhóm — không bao giờ đụng id thật của bản ghi. */
export const NHOM_KEY_PREFIX = "nhom:";

export const laKhoaNhom = (key: React.Key | string): boolean =>
  String(key).startsWith(NHOM_KEY_PREFIX);

/** Dòng cấp 1 — một nhóm, ôm các bản ghi thuộc nhóm đó. */
export interface NhomRow<T> {
  id: string;
  laNhom: true;
  ma: string;
  ten: string;
  color: string;
  soLuong: number;
  children: T[];
}

export type HangCay<T> = T | NhomRow<T>;

export const laDongNhom = <T>(row: HangCay<T>): row is NhomRow<T> =>
  (row as NhomRow<T>).laNhom === true;

interface TuyChon<T> {
  /** Mã nhóm của một bản ghi. */
  layMa: (item: T) => string | undefined | null;
  /** Danh mục nhóm — quyết định TÊN, MÀU và THỨ TỰ các nhóm. */
  danhMuc: readonly MucNhom[];
  /** Nhãn cho bản ghi chưa gán nhóm. */
  nhanTrong?: string;
}

/**
 * Gom danh sách thành cây 2 cấp: cấp 1 nhóm, cấp 2 bản ghi.
 *
 * Thứ tự nhóm bám theo danh mục chứ không sắp A-Z: đó là thứ tự nghiệp vụ người
 * dùng đã quen. Mã có trong dữ liệu nhưng KHÔNG có trong danh mục vẫn phải hiện
 * — xếp cuối, lấy chính mã làm nhãn. Thà xấu còn hơn nuốt mất bản ghi: dữ liệu
 * cũ (nhóm gõ tay) sống ở đây cho tới khi người dùng gán lại.
 *
 * Chỉ gom trong phạm vi mảng truyền vào — trang nào còn phân trang phía server
 * thì một nhóm có thể trải qua hai trang.
 */
export function gomTheoNhom<T>(
  list: readonly T[],
  { layMa, danhMuc, nhanTrong = "(Chưa phân nhóm)" }: TuyChon<T>
): NhomRow<T>[] {
  const theoMa = new Map<string, T[]>();
  for (const item of list) {
    const ma = layMa(item) || "";
    const cu = theoMa.get(ma);
    if (cu) cu.push(item);
    else theoMa.set(ma, [item]);
  }

  const thuTu = danhMuc.map((m) => m.ma);
  const laVo = [...theoMa.keys()].filter((ma) => !thuTu.includes(ma));
  const nhan = new Map(danhMuc.map((m) => [m.ma, m]));

  return [...thuTu, ...laVo]
    .filter((ma) => theoMa.has(ma))
    .map((ma) => {
      const con = theoMa.get(ma) as T[];
      const muc = nhan.get(ma);
      return {
        id: `${NHOM_KEY_PREFIX}${ma}`,
        laNhom: true as const,
        ma,
        ten: muc?.ten || ma || nhanTrong,
        color: muc?.color || "default",
        soLuong: con.length,
        children: con,
      };
    });
}
