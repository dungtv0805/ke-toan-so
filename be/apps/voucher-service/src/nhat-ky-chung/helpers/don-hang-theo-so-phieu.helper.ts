/** Số phiếu tối đa một lần tra — một trang bảng kê thuế tối đa 100 dòng. */
const TOI_DA_SO_PHIEU = 200;

/**
 * Tách tham số `soPhieu=a,b,c`. Số phiếu có thể chứa "/" nên phải đi qua
 * query string chứ không phải path (gateway giải mã %2F thành "/" → 404).
 */
export function tachDanhSachSoPhieu(raw: string | undefined): string[] {
  if (!raw) return [];
  const ds = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set(ds)].slice(0, TOI_DA_SO_PHIEU);
}

export interface DongDonHang {
  soPhieu: string;
  soHopDong?: string | null;
  tenCongTrinh?: string | null;
}

export interface DonHangCuaPhieu {
  soHopDong: string;
  tenCongTrinh?: string;
}

/**
 * Đơn hàng (= hợp đồng, định danh `soHopDong`) của từng chứng từ. Một chứng từ
 * nhiều bút toán thì lấy bút toán ĐẦU TIÊN có đơn hàng — thứ tự do truy vấn
 * quyết định (sắp theo số phiếu rồi thứ tự tạo). Chứng từ không có đơn hàng
 * thì vắng mặt trong kết quả.
 */
export function donHangTheoSoPhieu(dong: DongDonHang[]): Record<string, DonHangCuaPhieu> {
  const kq: Record<string, DonHangCuaPhieu> = {};
  for (const d of dong) {
    if (!d.soHopDong || kq[d.soPhieu]) continue;
    kq[d.soPhieu] = {
      soHopDong: d.soHopDong,
      ...(d.tenCongTrinh ? { tenCongTrinh: d.tenCongTrinh } : {}),
    };
  }
  return kq;
}
