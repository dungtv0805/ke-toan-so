import type { HoaDonBanRa } from '@/types';

/**
 * Gom số hóa đơn của Sổ hóa đơn bán ra theo hợp đồng — hợp đồng KHÔNG có trường số
 * hóa đơn riêng, cột "Số hóa đơn" ở danh mục đọc từ đây nên số liệu luôn khớp sổ.
 *
 * Khóa map là `hopDongId` (không phải số HĐ): số hợp đồng có thể trùng giữa các bản
 * ghi cũ, gom theo số sẽ dồn hóa đơn của hai hợp đồng khác nhau vào một dòng.
 */
export function gomSoHoaDonTheoHopDong(
  list: HoaDonBanRa[],
): Record<string, string[]> {
  const map: Record<string, string[]> = {};

  for (const hd of list) {
    const hopDongId = hd.hopDongId?.trim();
    const so = hd.soHoaDon?.trim();
    if (!hopDongId || !so) continue;

    const da = map[hopDongId] ?? (map[hopDongId] = []);
    if (!da.includes(so)) da.push(so);
  }

  return map;
}
