import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readSavedKeys, saveVisibleKeys } from '@/components/table/columnVisibility';

/**
 * Tái hiện đúng lỗi người dùng gặp ngày 17/09/2026: cấu hình xong luồng duyệt
 * nhưng màn "Thực hiện" không hiện cột Phê duyệt nào.
 *
 * Nguyên nhân: "Chọn cột" lưu danh sách key ĐƯỢC HIỆN. Cột mới thêm vào code
 * không thể có trong danh sách đã lưu từ trước → bị lọc mất, và người dùng
 * không có cách nào tự bật lên.
 */
describe('cột Phê duyệt phải tới được người đã từng chỉnh "Chọn cột"', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('người đã lưu lựa chọn cột từ trước VẪN thấy cột Phê duyệt', async () => {
    // Trạng thái thật của người dùng trước khi nâng cấp: đã tắt bớt vài cột.
    saveVisibleKeys('nkc.entryList.v3', ['ngay', 'dienGiai', 'soTien', 'taiKhoanNo']);

    const { NKC_COT_PAGE_KEY } = await import('./truongTheoCot');

    const dangHien = readSavedKeys(NKC_COT_PAGE_KEY);
    expect(dangHien).not.toBeNull();
    expect(dangHien).toContain('pheDuyet');
  });

  it('giữ nguyên các cột họ đã chọn, không đổ lại toàn bộ bảng', async () => {
    saveVisibleKeys('nkc.entryList.v3', ['ngay', 'soTien']);

    const { NKC_COT_PAGE_KEY } = await import('./truongTheoCot');

    expect(readSavedKeys(NKC_COT_PAGE_KEY)).toEqual(['ngay', 'soTien', 'pheDuyet']);
  });

  it('người chưa từng mở "Chọn cột" thì không bị đụng — họ vẫn đang hiện tất cả', async () => {
    const { NKC_COT_PAGE_KEY } = await import('./truongTheoCot');
    expect(readSavedKeys(NKC_COT_PAGE_KEY)).toBeNull();
  });

  it('khoá đã nâng phiên bản — thiếu bước này là cột mới không bao giờ hiện', async () => {
    const { NKC_COT_PAGE_KEY } = await import('./truongTheoCot');
    expect(NKC_COT_PAGE_KEY).not.toBe('nkc.entryList.v3');
  });
});
