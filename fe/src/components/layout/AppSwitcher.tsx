import { Button } from 'antd';
import { urlManChonUngDung } from '@/services/identitySession';
import { getCurrentTenant } from '@/services/base/service-base';
import { IconLuoiApp } from '@/components/icons/IconLuoiApp';

/**
 * Lưới 9 chấm trên header — đưa người dùng VỀ màn chọn ứng dụng của Master CEO
 * (portal identity), không dựng lại danh sách app tại chỗ.
 *
 * Trước 16/09/2026 chỗ này mở modal `ManChonUngDung` tự vẽ danh sách app từ
 * `GET /me/apps`. Hai nơi cùng vẽ một danh sách thì mỗi lần portal thêm app là
 * một lần app con hiện thiếu (thẻ "Điều hành" là ví dụ). Portal `/` vào thẳng
 * màn chọn app nên chỉ cần một đường link.
 *
 * Dev chưa cấu hình VITE_IDENTITY_URL (đăng nhập cục bộ): không có portal để
 * về, ẩn luôn nút thay vì để một lối cụt.
 */
export function AppSwitcher() {
  // Đổi công ty trong app là reload trang, nên đọc lúc vẽ là đủ tươi.
  const url = urlManChonUngDung(getCurrentTenant()?.tenantId);
  if (!url) return null;

  return (
    <Button
      type="text"
      href={url}
      aria-label="Chọn ứng dụng"
      title="Chọn ứng dụng"
      className="!flex items-center !text-foreground"
    >
      <IconLuoiApp size={18} />
    </Button>
  );
}

export default AppSwitcher;
