import type { ManHinh } from '@/config/manHinh';

/**
 * Kích thước / mật độ biểu đồ theo loại màn hình.
 *
 * Máy tính và máy tính bảng: trả lại ĐÚNG giá trị gốc — bố cục ≥ 768px không đổi.
 * Chỉ điện thoại (< 768px, vùng vẽ còn ~330px) mới thu nhỏ.
 */

/**
 * Trên điện thoại, quá số điểm này thì bỏ nhãn số vẽ thẳng trên cột/đường:
 * 12 tháng × 3 chuỗi nhãn trong 330px chồng lên nhau thành một vệt chữ. Chạm
 * vào cột vẫn hiện tooltip đủ số. Kỳ ngắn (quý = 3 tháng, tháng = 4–5 tuần)
 * vẫn giữ nhãn vì đủ chỗ.
 */
export const SO_DIEM_TOI_DA_CO_NHAN_DIEN_THOAI = 6;

export const hienNhanSo = (manHinh: ManHinh, soDiem: number): boolean =>
  manHinh !== 'mobile' || soDiem <= SO_DIEM_TOI_DA_CO_NHAN_DIEN_THOAI;

/**
 * Bán kính biểu đồ tròn. Nhãn "45% · 1.234 tr" nằm NGOÀI vành (~85px chữ): ở
 * màn 390px, vành ngoài 82px đẩy nhãn bên trái ra khỏi khung vẽ và bị cắt mất.
 * Thu 3/4 là đủ chỗ cho nhãn cả hai bên.
 */
export const banKinhDonut = (
  manHinh: ManHinh,
  trong: number,
  ngoai: number,
): { innerRadius: number; outerRadius: number } =>
  manHinh === 'mobile'
    ? { innerRadius: Math.round(trong * 0.75), outerRadius: Math.round(ngoai * 0.75) }
    : { innerRadius: trong, outerRadius: ngoai };

/**
 * Bề rộng trục tên (biểu đồ thanh ngang). 150px tên trong vùng vẽ 330px thì
 * thanh dài nhất chỉ còn ~100px — tên dài tự cắt, tooltip vẫn đủ tên.
 */
export const RONG_TRUC_TEN_DIEN_THOAI = 96;

export const rongTrucTen = (manHinh: ManHinh, rong: number): number =>
  manHinh === 'mobile' ? Math.min(rong, RONG_TRUC_TEN_DIEN_THOAI) : rong;
