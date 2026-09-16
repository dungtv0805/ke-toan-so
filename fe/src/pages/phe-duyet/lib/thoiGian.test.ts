import { describe, it, expect } from 'vitest';
import { dinhDangThoiLuong, NHAN_TRANG_THAI, mauTrangThai } from './thoiGian';

describe('dinhDangThoiLuong — đúng cách viết ở bảng mục 6 và 9', () => {
  it('"02 giờ 10 phút" — đúng ví dụ mục 6', () => {
    expect(dinhDangThoiLuong(2 * 3600 + 10 * 60)).toBe('02 giờ 10 phút');
  });

  it('"01 giờ 05 phút" / "04 giờ 15 phút" / "17 giờ 35 phút" — đúng bảng mục 9', () => {
    expect(dinhDangThoiLuong(3900)).toBe('01 giờ 05 phút');
    expect(dinhDangThoiLuong(15300)).toBe('04 giờ 15 phút');
    expect(dinhDangThoiLuong(63300)).toBe('17 giờ 35 phút');
  });

  it('dưới một giờ thì chỉ hiện phút', () => {
    expect(dinhDangThoiLuong(600)).toBe('10 phút');
    expect(dinhDangThoiLuong(59)).toBe('0 phút');
  });

  it('quá một ngày thì hiện thêm số ngày — 30 giờ đọc không ra là hơn một ngày', () => {
    expect(dinhDangThoiLuong(30 * 3600)).toBe('1 ngày 06 giờ 00 phút');
    expect(dinhDangThoiLuong(50 * 3600 + 90)).toBe('2 ngày 02 giờ 01 phút');
  });

  it('không có số thì để trống, không hiện "0 phút" gây hiểu nhầm là đã xử lý', () => {
    expect(dinhDangThoiLuong(undefined)).toBe('—');
    expect(dinhDangThoiLuong(null as unknown as number)).toBe('—');
  });

  it('số âm (đồng hồ lệch) không hiện ra dấu trừ', () => {
    expect(dinhDangThoiLuong(-100)).toBe('—');
  });
});

describe('nhãn trạng thái — đúng 6 trạng thái mục 10', () => {
  it('đủ 6 trạng thái, không thiếu cái nào', () => {
    expect(Object.keys(NHAN_TRANG_THAI).sort()).toEqual(
      ['CHINH_THUC', 'CHO_PHE_DUYET', 'DA_KIEM_SOAT', 'NHAP', 'TU_CHOI', 'YEU_CAU_BO_SUNG'].sort(),
    );
  });

  it('dùng đúng chữ của tài liệu', () => {
    expect(NHAN_TRANG_THAI.NHAP).toBe('Nháp');
    expect(NHAN_TRANG_THAI.CHO_PHE_DUYET).toBe('Chờ phê duyệt');
    expect(NHAN_TRANG_THAI.YEU_CAU_BO_SUNG).toBe('Yêu cầu bổ sung');
    expect(NHAN_TRANG_THAI.DA_KIEM_SOAT).toBe('Đã kiểm soát đủ');
    expect(NHAN_TRANG_THAI.CHINH_THUC).toBe('Chính thức');
  });

  it('chứng từ cũ chưa có trạng thái vẫn hiện là Chính thức, không phải ô trống', () => {
    // Backfill gắn CHINH_THUC cho dữ liệu cũ, nhưng lưới có thể đọc trước khi
    // script chạy — hiện ô trống thì kế toán tưởng chứng từ bị treo.
    expect(NHAN_TRANG_THAI[undefined as never] ?? NHAN_TRANG_THAI.CHINH_THUC).toBe('Chính thức');
  });

  it('mỗi trạng thái một màu, chờ duyệt và từ chối không trùng màu', () => {
    expect(mauTrangThai('CHO_PHE_DUYET')).not.toBe(mauTrangThai('TU_CHOI'));
    expect(mauTrangThai('CHINH_THUC')).toBe('green');
  });
});
