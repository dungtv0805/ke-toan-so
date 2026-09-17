import { readSavedKeys, saveVisibleKeys } from './columnVisibility';
import type { StorageLike } from './tableStorage';

/**
 * Chuyển lựa chọn "Chọn cột" sang khoá mới khi bảng có thêm cột.
 *
 * VÌ SAO CẦN: `useColumnVisibility` lưu danh sách key ĐƯỢC HIỆN. Cột mới thêm
 * vào code không thể có trong danh sách người dùng đã lưu từ trước, nên với bất
 * kỳ ai từng mở bộ chọn cột, cột mới bị lọc mất và KHÔNG BAO GIỜ hiện ra —
 * người dùng không có cách nào biết để tự bật lên.
 *
 * Cách cũ trong repo là đổi `pageKey` (v2 → v3). Nó làm cột mới hiện ra, nhưng
 * đồng thời xoá sạch lựa chọn của mọi người: hơn 40 cột đổ lại hết ra bảng.
 * Hàm này đổi khoá NHƯNG chép lựa chọn cũ sang và chỉ thêm đúng cột mới.
 *
 * Chạy một lần lúc nạp module, trước khi hook đọc khoá mới.
 */
export function diTruCot(
  khoaCu: string,
  khoaMoi: string,
  cotThemMoi: string[],
  storage?: StorageLike,
): void {
  try {
    // Đã có lựa chọn ở khoá mới → người dùng đã tự chỉnh sau khi nâng cấp,
    // ghi đè là cướp mất quyết định của họ (kể cả khi họ vừa tắt cột mới đi).
    if (readSavedKeys(khoaMoi, storage) !== null) return;

    const cu = readSavedKeys(khoaCu, storage);
    // null = chưa từng mở bộ chọn cột, đang ở chế độ "hiện tất cả". Ghi một mảng
    // vào lúc này là tự tay chuyển họ sang "chỉ hiện mấy cột này" và ẩn mất
    // những cột họ vẫn đang xem.
    if (cu === null) return;

    saveVisibleKeys(
      khoaMoi,
      [...cu, ...cotThemMoi.filter((k) => !cu.includes(k))],
      storage,
    );
  } catch {
    // localStorage bị chặn (cửa sổ ẩn danh, chặn cookie) — mất lựa chọn cũ thì
    // người dùng thấy đủ cột, chấp nhận được; ném lỗi ở đây làm trắng cả trang.
  }
}
