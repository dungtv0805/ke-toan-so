/**
 * Chứng từ chỉ lưu `nguoiTaoId` (ObjectId của identity user), không lưu tên. Trang list
 * phải tự tra tên từ danh sách người dùng của tenant.
 *
 * Không được rút gọn id làm nhãn thay thế: user được seed cùng lúc nên 8 ký tự đầu
 * ObjectId của họ trùng nhau (`6948004b…` cho cả chục tài khoản), rút gọn kiểu đó không
 * phân biệt được ai với ai.
 */

export interface NguoiDungToiThieu {
  id: string;
  hoTen?: string;
  email?: string;
}

export function dungBanDoNguoiDung(
  users: NguoiDungToiThieu[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const u of users) {
    if (!u?.id) continue;
    const ten = u.hoTen?.trim() || u.email?.trim();
    if (ten) map.set(u.id, ten);
  }
  return map;
}

/**
 * Trả về tên người tạo, hoặc chính id khi không tra được (user đã bị gỡ khỏi công ty,
 * hoặc lượt gọi danh sách người dùng lỗi) — thà hiện id đầy đủ còn hơn hiện ô trống.
 */
export function tenNguoiTao(
  id: string | undefined,
  banDo: Map<string, string>,
): string {
  if (!id) return '—';
  return banDo.get(id) ?? id;
}
