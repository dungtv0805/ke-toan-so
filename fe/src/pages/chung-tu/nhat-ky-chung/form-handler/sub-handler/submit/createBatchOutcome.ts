import { ChungTuHeader } from "../init/init.state";

/**
 * Quyết định phải làm gì với form NGAY SAU KHI `createBatch` trả về, TRƯỚC khi
 * đụng tới bước ghi hóa đơn (có thể hỏng và khiến `submitForm` return sớm để
 * giữ người dùng ở lại form).
 *
 * Bug hồi quy đã sửa: nếu `createBatch` thành công (có số phiếu mới) nhưng
 * bước ghi hóa đơn sau đó hỏng, form phải chuyển sang chế độ SỬA của đúng
 * chứng từ vừa tạo (`header.soPhieu` + `isEditing = true`) NGAY LẬP TỨC — tách
 * riêng khỏi kết quả ghi hóa đơn — để lần bấm "Lưu" kế tiếp đi vào nhánh
 * `updateBatch` thay vì lặp lại `createBatch` và sinh chứng từ trùng.
 *
 * Trường hợp `createBatch` thành công nhưng KHÔNG lấy được số phiếu (mảng
 * rỗng / thiếu `soPhieu`) thì không có gì để chuyển sang chế độ sửa — không
 * được khuyên "bấm Lưu lần nữa" (lại rơi vào đúng bẫy cũ), phải khuyên mở lại
 * chứng từ từ danh sách.
 */
export type CreateBatchOutcome =
  | { kind: "editMode"; soPhieu: string; header: ChungTuHeader; isEditing: true }
  | { kind: "hoaDonKhongXacDinhDuocSoPhieu"; message: string }
  | { kind: "khongCanGanHoaDon" };

export function resolveCreateBatchOutcome(
  created: Array<{ soPhieu?: string }>,
  header: ChungTuHeader,
): CreateBatchOutcome {
  const soPhieuMoi = created[0]?.soPhieu;

  if (soPhieuMoi) {
    return {
      kind: "editMode",
      soPhieu: soPhieuMoi,
      header: { ...header, soPhieu: soPhieuMoi },
      isEditing: true,
    };
  }

  if ((header.hoaDon || []).length > 0) {
    return {
      kind: "hoaDonKhongXacDinhDuocSoPhieu",
      message:
        "Chứng từ đã tạo, nhưng không xác định được số phiếu nên chưa gắn được hóa đơn. Mở lại chứng từ từ danh sách để gắn hóa đơn.",
    };
  }

  return { kind: "khongCanGanHoaDon" };
}
