/**
 * % thay đổi so với cùng kỳ. Trả null khi cùng kỳ bằng 0 — chia cho 0 không có
 * nghĩa và hiển thị "—" rõ hơn là "∞%".
 */
export function tyLeSoCungKy(kyNay: number, cungKy: number): number | null {
  if (!cungKy) return null;
  return ((kyNay - cungKy) / Math.abs(cungKy)) * 100;
}
