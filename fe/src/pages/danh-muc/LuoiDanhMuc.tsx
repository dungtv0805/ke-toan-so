import { Link } from 'react-router-dom';
import { ChevronRight, type LucideIcon } from 'lucide-react';

export interface MucDanhMuc {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NhomDanhMuc {
  title: string;
  icon: LucideIcon;
  /** Màu nhấn của nhóm. */
  mau: string;
  links: MucDanhMuc[];
}

/**
 * Lưới thẻ của trang Danh mục — CHỈ hiển thị, không tự lọc quyền hay lấy dữ liệu.
 *
 * Tách khỏi `DanhMucIndexPage` để dựng được ở trang nghiệm thu
 * (/bang-du-lieu.harness.html) mà không cần đăng nhập, và để test bố cục mà
 * không phải giả lập AuthContext lẫn TermContext.
 *
 * Dựng theo bản vẽ Pencil 10/09/2026, khác bản vẽ ở hai chỗ có chủ đích:
 *   - nền dải đầu thẻ pha loãng chính màu nhấn (bản vẽ dùng pastel cứng, chói ở
 *     chế độ tối);
 *   - hàng nền màu trong bản vẽ hiểu là trạng thái DI CHUỘT, không phải mục
 *     đang chọn.
 */
export function LuoiDanhMuc({ nhom }: { nhom: NhomDanhMuc[] }) {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {nhom.map((g) => {
        const IconNhom = g.icon;
        return (
          <div
            key={g.title}
            className="flex flex-col overflow-hidden rounded-[9px] border"
            style={{
              background: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              ['--mau' as string]: g.mau,
            }}
          >
            <div
              className="flex items-center gap-2 border-b px-3 py-2.5"
              style={{ background: `${g.mau}1F`, borderColor: 'hsl(var(--border))' }}
            >
              <IconNhom size={15} className="mau-nhom" aria-hidden />
              <span className="flex-1 text-[13px] font-bold text-foreground">{g.title}</span>
              <span
                className="mau-nhom rounded-full px-[7px] py-[1.5px] text-[10px] font-bold"
                style={{ background: 'hsl(var(--card) / 0.7)' }}
              >
                {g.links.length} mục
              </span>
            </div>

            <div className="flex flex-col gap-px p-[7px]">
              {g.links.map((l) => {
                const IconMuc = l.icon;
                return (
                  <Link
                    key={l.path}
                    to={l.path}
                    className="flex items-center gap-2.5 rounded-[7px] px-2 py-1.5 transition-colors hover:bg-[var(--nen-hover)]"
                    style={{ ['--nen-hover' as string]: `${g.mau}14` }}
                  >
                    <IconMuc
                      size={13}
                      className="shrink-0 text-muted-foreground transition-colors"
                      aria-hidden
                    />
                    <span className="flex-1 text-xs font-medium text-foreground">{l.label}</span>
                    <ChevronRight
                      size={12}
                      className="shrink-0 text-muted-foreground/50 transition-colors"
                      aria-hidden
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default LuoiDanhMuc;
