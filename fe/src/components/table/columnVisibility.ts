const STORAGE_PREFIX = 'tblcols:';

// Khoá lưu công ty hiện tại (service-base/setCurrentTenant). Đọc trực tiếp từ
// cùng storage để module này không phụ thuộc service-base mà vẫn test được.
const TENANT_STORAGE_KEY = 'current_tenant';
// Scope dùng khi chưa chọn công ty (vd chưa đăng nhập) — tách khỏi data theo cty.
const NO_TENANT_SCOPE = '_';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

const browserStorage = (): StorageLike | undefined =>
  typeof localStorage !== 'undefined' ? localStorage : undefined;

/** ID công ty đang chọn, lấy từ chính storage (key `current_tenant`). */
const currentTenantScope = (storage: StorageLike | undefined): string => {
  if (!storage) return NO_TENANT_SCOPE;
  try {
    const raw = storage.getItem(TENANT_STORAGE_KEY);
    if (!raw) return NO_TENANT_SCOPE;
    const tenantId = (JSON.parse(raw) as { tenantId?: unknown } | null)?.tenantId;
    return typeof tenantId === 'string' && tenantId !== '' ? tenantId : NO_TENANT_SCOPE;
  } catch {
    return NO_TENANT_SCOPE;
  }
};

// Khoá lưu tách theo công ty: `tblcols:{tenantId}:{pageKey}` → mỗi cty một bộ cột.
const storageKey = (pageKey: string, storage: StorageLike | undefined) =>
  `${STORAGE_PREFIX}${currentTenantScope(storage)}:${pageKey}`;

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
    const raw = storage.getItem(storageKey(pageKey, storage));
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
    storage.setItem(storageKey(pageKey, storage), JSON.stringify(keys));
  } catch {
    /* ignore quota / private mode */
  }
}
