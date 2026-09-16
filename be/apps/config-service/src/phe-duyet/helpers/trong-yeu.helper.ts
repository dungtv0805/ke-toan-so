/**
 * Phát hiện sửa nội dung trọng yếu — mục 11.
 *
 * Tài liệu liệt kê: "số tiền, tài khoản hạch toán, đối tượng, nội dung giao
 * dịch hoặc chứng từ trọng yếu". Ngày nghiệp vụ được tính thêm vì nó quyết
 * định chứng từ rơi vào kỳ báo cáo nào — đổi ngày sau khi giám đốc đã duyệt
 * là chuyển tiền sang kỳ khác mà không ai ký lại.
 *
 * Các trường còn lại (ghi chú, địa chỉ, người giao dịch, ngày ghi sổ) sửa
 * thoải mái, không làm mất hiệu lực phê duyệt.
 */

export const TRUONG_TRONG_YEU = [
  'soTien',
  'danhMuc.taiKhoanNo',
  'danhMuc.taiKhoanCo',
  'danhMuc.doiTuong',
  'noiDung',
  'ngay',
] as const;

export type TruongTrongYeu = (typeof TRUONG_TRONG_YEU)[number];

type BanGhi = Record<string, unknown>;

function docTheoDuongDan(obj: unknown, duongDan: string): unknown {
  return duongDan
    .split('.')
    .reduce<unknown>(
      (acc, khoa) =>
        acc && typeof acc === 'object'
          ? (acc as BanGhi)[khoa]
          : undefined,
      obj,
    );
}

/**
 * Chuẩn hoá giá trị trước khi so.
 *
 * Ba cái bẫy thật trong dữ liệu hiện có:
 * - `soTien` đọc từ Mongo có khi là chuỗi (Decimal128 serialize ra string).
 * - `ngay` khi thì Date, khi thì chuỗi ISO — cùng một thời điểm.
 * - Danh mục là snapshot có cả tên; đổi tên trong danh mục làm snapshot lệch
 *   mà bản chất nghiệp vụ không đổi, nên CHỈ so mã (xem cách gom nhóm theo mã
 *   ở các báo cáo khác).
 */
function chuanHoa(giaTri: unknown): string {
  if (giaTri === null || giaTri === undefined) return '';
  if (giaTri instanceof Date) return giaTri.toISOString();
  if (typeof giaTri === 'object') {
    const o = giaTri as BanGhi;
    // Snapshot hợp đồng không có `ma`, định danh là `soHopDong`.
    const dinhDanh = o.ma ?? o.soHopDong ?? o.id;
    return dinhDanh !== undefined ? String(dinhDanh) : JSON.stringify(giaTri);
  }
  if (typeof giaTri === 'number') return String(giaTri);
  if (typeof giaTri === 'string') {
    const soHoacNgay = giaTri.trim();
    // Chuỗi ngày ISO → chuẩn về cùng dạng với Date.
    if (/^\d{4}-\d{2}-\d{2}T/.test(soHoacNgay)) {
      return new Date(soHoacNgay).toISOString();
    }
    // Chuỗi số → chuẩn về dạng số.
    if (/^-?\d+(\.\d+)?$/.test(soHoacNgay)) return String(Number(soHoacNgay));
    return soHoacNgay;
  }
  return String(giaTri);
}

/** Trả về danh sách trường trọng yếu đã đổi. Rỗng = không phải duyệt lại. */
export function thayDoiTrongYeu(truoc: unknown, sau: unknown): TruongTrongYeu[] {
  return TRUONG_TRONG_YEU.filter(
    (truong) =>
      chuanHoa(docTheoDuongDan(truoc, truong)) !==
      chuanHoa(docTheoDuongDan(sau, truong)),
  );
}
