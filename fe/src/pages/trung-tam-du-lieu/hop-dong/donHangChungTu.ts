import type {
  DanhMuc,
  DoiTuong,
  DoiTuongSnapshot,
  HopDong,
  HopDongSnapshot,
  TaiKhoan,
} from '@/types';
import { hopDongService } from '@/services/hopDongService';
import { doiTuongService } from '@/services/doiTuongService';
import { buildDoiTuongSnapshot, buildHopDongSnapshot } from '@/utils/snapshotBuilder';

export interface DonHangSnapshots {
  hopDong: HopDongSnapshot;
  /** Khách hàng của đơn hàng; undefined nếu đơn chưa gắn đối tượng. */
  khachHang?: DoiTuongSnapshot;
}

/**
 * Snapshot đơn hàng + khách hàng lấy từ bản ghi gốc, để chứng từ sinh tự động
 * mang đủ thông tin như khi kế toán tự chọn trên Nhật ký chung.
 */
export async function loadDonHangSnapshots(
  hopDongId: string,
  doiTuongId?: string,
): Promise<DonHangSnapshots> {
  const [hd, dt] = await Promise.all([
    hopDongService.getById(hopDongId),
    doiTuongId ? doiTuongService.getById(doiTuongId).catch(() => undefined) : undefined,
  ]);
  return {
    hopDong: buildHopDongSnapshot(hd as HopDong),
    khachHang: dt ? buildDoiTuongSnapshot(dt as DoiTuong) : undefined,
  };
}

/** Snapshot tài khoản theo mã; TK không có trong danh mục vẫn giữ mã để không mất dòng. */
export function taiKhoanSnapshot(
  list: TaiKhoan[],
  ma: string,
): NonNullable<DanhMuc['taiKhoanNo']> {
  const found = list.find((tk) => tk.ma === ma);
  return { ma, ten: found?.ten ?? '', loai: found?.loai ?? '', nhom: found?.nhom ?? '' };
}

/**
 * TK mặc định cho các bút toán sinh từ đơn hàng: khớp chính xác mã chuẩn, không có
 * thì lấy TK con đầu tiên (công ty dùng 33871 / 5113 / 1121 vẫn ra đúng).
 */
export function defaultTaiKhoan(list: TaiKhoan[], prefix: string): string | undefined {
  return (
    list.find((tk) => tk.ma === prefix)?.ma ?? list.find((tk) => tk.ma.startsWith(prefix))?.ma
  );
}
