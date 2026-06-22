import type { DanhMuc, LoaiChungTu, PhanLoaiChungTu } from '@app/entities';

/** Map phân loại của Loại chứng từ → loai của chứng từ (phân hệ). */
export const PHAN_LOAI_TO_LOAI: Record<PhanLoaiChungTu, LoaiChungTu> = {
  THU: 'PHIEU_THU',
  CHI: 'PHIEU_CHI',
  KHAC: 'KHAC',
};

/**
 * Suy ra `loai` (PHIEU_THU/PHIEU_CHI/KHAC) cho một chứng từ dựa trên cấu hình:
 *   danhMuc.loaiGiaoDich.ma → loaiGiaoDich.loaiChungTuMa → loaiChungTu.phanLoai → loai
 *
 * Thuần, không I/O — nhận sẵn 2 map cấu hình để dễ test và cache.
 * Bất kỳ mắt xích nào thiếu (không chọn loại giao dịch, chưa cấu hình) → trả `fallbackLoai`
 * để giữ tương thích với hành vi cũ (loai theo điểm nhập).
 */
export function resolveLoaiFromConfig(
  danhMuc: DanhMuc | undefined | null,
  fallbackLoai: LoaiChungTu,
  loaiGiaoDichToLoaiChungTu: Map<string, string>,
  loaiChungTuToPhanLoai: Map<string, PhanLoaiChungTu>,
): LoaiChungTu {
  const lgdMa = danhMuc?.loaiGiaoDich?.ma;
  if (!lgdMa) return fallbackLoai;

  const lctMa = loaiGiaoDichToLoaiChungTu.get(lgdMa);
  if (!lctMa) return fallbackLoai;

  const phanLoai = loaiChungTuToPhanLoai.get(lctMa);
  if (!phanLoai) return fallbackLoai;

  return PHAN_LOAI_TO_LOAI[phanLoai] ?? fallbackLoai;
}
