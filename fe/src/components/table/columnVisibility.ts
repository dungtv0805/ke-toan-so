const STORAGE_PREFIX = 'tblcols:';

const storageKey = (pageKey: string) => `${STORAGE_PREFIX}${pageKey}`;

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const browserStorage = (): StorageLike | undefined =>
  typeof localStorage !== 'undefined' ? localStorage : undefined;

/**
 * Đọc lựa chọn cột đã lưu cho 1 bảng (theo pageKey).
 * - Trả `null` khi CHƯA có preference (hoặc dữ liệu hỏng) → caller hiểu là "hiện tất cả".
 *   Quan trọng với bảng dựng cột động: lúc đầu chưa có cột, không được mặc định ẩn hết.
 * - Trả mảng key (kể cả rỗng = người dùng cố ý ẩn hết) khi đã lưu hợp lệ.
 */
export function readSavedKeys(
  pageKey: string,
  storage: StorageLike | undefined = browserStorage(),
): string[] | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(storageKey(pageKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((k) => typeof k !== 'string')) {
      return null;
    }
    return parsed as string[];
  } catch {
    return null;
  }
}

export function saveVisibleKeys(
  pageKey: string,
  keys: string[],
  storage: StorageLike | undefined = browserStorage(),
): void {
  if (!storage) return;
  try {
    storage.setItem(storageKey(pageKey), JSON.stringify(keys));
  } catch {
    /* ignore quota / private mode */
  }
}
