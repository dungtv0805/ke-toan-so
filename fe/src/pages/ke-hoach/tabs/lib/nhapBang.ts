/**
 * Lớp nháp của bảng nhập liệu: trộn dữ liệu đã lưu với những gì đang gõ, để
 * hàng nhóm và hàng TỔNG CỘNG cộng lại NGAY khi gõ chứ không đợi bấm Lưu.
 *
 * Thuần, không đụng React — dùng chung cho cả bảng Bán hàng lẫn bảng Nhân sự.
 */

/** Bản ghi đã lưu, rút gọn còn id và phần giá trị người dùng gõ được. */
export interface DongGoc<V> {
  id: string;
  val: V;
}

/** Dòng mới người dùng vừa thêm, chưa có trên máy chủ. */
export interface DongNhap<V> {
  id: string;
  val: V;
}

export interface DongHienThi<V> {
  id: string;
  val: V;
  /** Giá trị đã lưu — không có ở dòng mới. */
  goc?: V;
  /** Dòng mới, chưa lưu. */
  tam: boolean;
  /** Dòng đã lưu nhưng đang có sửa đổi chưa lưu. */
  doi: boolean;
}

let dem = 0;

/** Khoá tạm cho dòng chưa lưu — tiền tố `tam-` để không lẫn với ObjectId. */
export const tamId = (): string => `tam-${++dem}`;

/**
 * So sâu hai giá trị. Chỉ dùng cho object phẳng chứa số, chuỗi và mảng số —
 * đúng hình dạng của form hai bảng này, nên không cần thư viện so sâu.
 */
export const laKhacNhau = <V>(a: V, b: V): boolean =>
  JSON.stringify(a) !== JSON.stringify(b);

export function gopNhap<V>(
  daLuu: DongGoc<V>[],
  nhap: Record<string, V>,
  dongMoi: DongNhap<V>[],
): DongHienThi<V>[] {
  const tuDaLuu = daLuu.map((d) => {
    const dangGo = nhap[d.id];
    return {
      id: d.id,
      val: dangGo ?? d.val,
      goc: d.val,
      tam: false,
      // Gõ rồi gõ trả lại như cũ thì coi như chưa đổi — khỏi lưu thừa.
      doi: dangGo !== undefined && laKhacNhau(dangGo, d.val),
    };
  });

  const tuDongMoi = dongMoi.map((d) => ({
    id: d.id,
    val: d.val,
    goc: undefined,
    tam: true,
    doi: true,
  }));

  return [...tuDaLuu, ...tuDongMoi];
}

/** Số dòng sẽ được gửi đi khi bấm Lưu. */
export function demThayDoi<V>(
  daLuu: DongGoc<V>[],
  nhap: Record<string, V>,
  dongMoi: DongNhap<V>[],
): number {
  const suaThat = daLuu.filter((d) => {
    const dangGo = nhap[d.id];
    return dangGo !== undefined && laKhacNhau(dangGo, d.val);
  }).length;
  return suaThat + dongMoi.length;
}
