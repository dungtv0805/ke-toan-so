import { dieuKienLoaiKeHoach } from './loai-ke-hoach.helper';

describe('dieuKienLoaiKeHoach', () => {
  it('KE_HOACH nhận cả bản ghi chưa có trường loaiKeHoach', () => {
    expect(dieuKienLoaiKeHoach('KE_HOACH')).toEqual({
      $or: [{ loaiKeHoach: 'KE_HOACH' }, { loaiKeHoach: { $exists: false } }],
    });
  });

  it('DU_BAO chỉ nhận đúng bản ghi dự báo', () => {
    expect(dieuKienLoaiKeHoach('DU_BAO')).toEqual({ loaiKeHoach: 'DU_BAO' });
  });

  it('không nhận nhầm bản ghi thiếu trường khi lọc DU_BAO', () => {
    // Nếu nhánh $exists áp cho cả hai loại thì dữ liệu cũ sẽ hiện ở trang Dự báo.
    expect(JSON.stringify(dieuKienLoaiKeHoach('DU_BAO'))).not.toContain(
      '$exists',
    );
  });
});
