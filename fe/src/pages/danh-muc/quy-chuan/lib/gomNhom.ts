import type { QuyChuan, LoaiGiaoDich } from "@/types";

/** Tiền tố khoá dòng nhóm — khoá nghiệp vụ thật là id quy chuẩn, không bao giờ đụng nhau. */
export const NHOM_KEY_PREFIX = "lgd:";

export const laKhoaNhom = (key: React.Key | string): boolean =>
  String(key).startsWith(NHOM_KEY_PREFIX);

/** Dòng cấp 1 — một loại giao dịch, ôm các quy chuẩn thuộc loại đó. */
export interface NhomRow {
  id: string;
  laNhom: true;
  ma: string;
  ten: string;
  color: string;
  soLuong: number;
  children: QuyChuan[];
}

export type QuyChuanRow = QuyChuan | NhomRow;

export const laDongNhom = (row: QuyChuanRow): row is NhomRow =>
  (row as NhomRow).laNhom === true;

/**
 * Gom danh sách quy chuẩn thành cây 2 cấp: cấp 1 loại giao dịch, cấp 2 quy chuẩn.
 *
 * Thứ tự nhóm bám theo danh mục Loại giao dịch (Phiếu thu → Phiếu chi → …) chứ
 * không sắp A-Z: đó là thứ tự nghiệp vụ người dùng đã quen trên tab cũ. Loại
 * giao dịch có trong dữ liệu nhưng KHÔNG có trong danh mục vẫn phải hiện —
 * xếp cuối và lấy chính mã làm nhãn, thà xấu còn hơn nuốt mất bản ghi.
 *
 * Chỉ gom trong phạm vi mảng truyền vào (đúng một trang) — bảng vẫn phân trang
 * phía server, nên một loại giao dịch có thể trải qua hai trang.
 */
export function gomTheoLoaiGiaoDich(
  list: QuyChuan[],
  danhMuc: LoaiGiaoDich[]
): QuyChuanRow[] {
  const theoMa = new Map<string, QuyChuan[]>();
  for (const qc of list) {
    const ma = qc.loaiGiaoDich || "";
    const cu = theoMa.get(ma);
    if (cu) cu.push(qc);
    else theoMa.set(ma, [qc]);
  }

  const thuTu = danhMuc.map((l) => l.ma);
  const laVo = [...theoMa.keys()].filter((ma) => !thuTu.includes(ma));
  const nhan = new Map(danhMuc.map((l) => [l.ma, l]));

  return [...thuTu, ...laVo]
    .filter((ma) => theoMa.has(ma))
    .map((ma) => {
      const con = theoMa.get(ma) as QuyChuan[];
      const lgd = nhan.get(ma);
      return {
        id: `${NHOM_KEY_PREFIX}${ma}`,
        laNhom: true as const,
        ma,
        ten: lgd?.ten || ma || "(Chưa gán loại giao dịch)",
        color: lgd?.color || "default",
        soLuong: con.length,
        children: con,
      };
    });
}
