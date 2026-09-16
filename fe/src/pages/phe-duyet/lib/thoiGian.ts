import type { TrangThaiPheDuyet } from '@/services/pheDuyetService';

/**
 * Hiển thị thời lượng xử lý — bảng mục 6 và mục 9 của tài liệu phê duyệt viết
 * dạng "02 giờ 10 phút" (giờ và phút đệm 0 cho thẳng cột).
 */
export function dinhDangThoiLuong(giay?: number | null): string {
  if (giay === undefined || giay === null || giay < 0) return '—';

  const phutTong = Math.floor(giay / 60);
  const ngay = Math.floor(phutTong / (24 * 60));
  const gio = Math.floor((phutTong % (24 * 60)) / 60);
  const phut = phutTong % 60;

  const dem = (n: number) => String(n).padStart(2, '0');

  if (ngay > 0) return `${ngay} ngày ${dem(gio)} giờ ${dem(phut)} phút`;
  if (gio > 0) return `${dem(gio)} giờ ${dem(phut)} phút`;
  return `${phut} phút`;
}

/** Sáu trạng thái mục 10 — dùng đúng chữ của tài liệu. */
export const NHAN_TRANG_THAI: Record<TrangThaiPheDuyet, string> = {
  NHAP: 'Nháp',
  CHO_PHE_DUYET: 'Chờ phê duyệt',
  YEU_CAU_BO_SUNG: 'Yêu cầu bổ sung',
  TU_CHOI: 'Từ chối',
  DA_KIEM_SOAT: 'Đã kiểm soát đủ',
  CHINH_THUC: 'Chính thức',
};

const MAU: Record<TrangThaiPheDuyet, string> = {
  NHAP: 'default',
  CHO_PHE_DUYET: 'processing',
  YEU_CAU_BO_SUNG: 'orange',
  TU_CHOI: 'red',
  DA_KIEM_SOAT: 'cyan',
  CHINH_THUC: 'green',
};

export const mauTrangThai = (tt?: TrangThaiPheDuyet): string =>
  MAU[tt ?? 'CHINH_THUC'] ?? 'default';

export const nhanTrangThai = (tt?: TrangThaiPheDuyet): string =>
  NHAN_TRANG_THAI[tt ?? 'CHINH_THUC'] ?? 'Chính thức';

/** Nhãn trạng thái của một BƯỚC — mục 7: đã duyệt / đang chờ / chưa đến lượt. */
export const NHAN_BUOC: Record<string, string> = {
  CHUA_DEN_LUOT: 'Chưa đến lượt',
  DANG_CHO: 'Đang chờ',
  DA_DUYET: 'Đã duyệt',
  TRA_LAI: 'Đã trả lại',
  TU_CHOI: 'Đã từ chối',
};

export const MAU_BUOC: Record<string, string> = {
  CHUA_DEN_LUOT: 'default',
  DANG_CHO: 'processing',
  DA_DUYET: 'green',
  TRA_LAI: 'orange',
  TU_CHOI: 'red',
};
