import type { NhatKyChungEntry } from '@app/dto';

/**
 * Tập mã TK liên quan: chính nó + mọi TK con cháu (theo tiền tố mã).
 * Đồng nhất quy tắc với buildSoDuTree của FE.
 */
export function computeRelevantCodes(
  accounts: Array<{ ma: string }>,
  maTaiKhoan: string,
): Set<string> {
  const set = new Set<string>();
  for (const a of accounts) {
    if (a.ma === maTaiKhoan || a.ma.startsWith(maTaiKhoan)) {
      set.add(a.ma);
    }
  }
  set.add(maTaiKhoan);
  return set;
}
