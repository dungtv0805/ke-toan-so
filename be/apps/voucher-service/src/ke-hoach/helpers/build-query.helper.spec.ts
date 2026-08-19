import { buildKeHoachQuery } from './build-query.helper';

describe('buildKeHoachQuery', () => {
  it('lọc theo loại kế hoạch và phiên bản', () => {
    const q = buildKeHoachQuery({ loaiKeHoach: 'DU_BAO', phienBan: 'KH 2026 gốc' });
    expect(q).toMatchObject({ loaiKeHoach: 'DU_BAO', phienBan: 'KH 2026 gốc' });
  });

  it('không có loaiKeHoach thì không ràng buộc trường đó', () => {
    expect(buildKeHoachQuery({})).not.toHaveProperty('loaiKeHoach');
  });

  it('khoảng ngày bao trọn ngày đầu và ngày cuối', () => {
    const q = buildKeHoachQuery({ startDate: '2026-01-01', endDate: '2026-01-31' }) as {
      ngay: { $gte: Date; $lte: Date };
    };
    expect(q.ngay.$gte.getHours()).toBe(0);
    expect(q.ngay.$lte.getHours()).toBe(23);
    expect(q.ngay.$lte.getDate()).toBe(31);
  });

  it('lọc theo các chiều danh mục bằng mã', () => {
    const q = buildKeHoachQuery({ duAn: 'DA01', khoanMuc: 'KM02', doi: 'D3' });
    expect(q).toMatchObject({
      'danhMuc.duAn.ma': 'DA01',
      'danhMuc.khoanMuc.ma': 'KM02',
      'danhMuc.doi.ma': 'D3',
    });
  });

  it('lọc đối tượng khớp cả bên Nợ lẫn bên Có', () => {
    const q = buildKeHoachQuery({ doiTuong: 'KH01' }) as { $or: unknown[] };
    expect(q.$or).toEqual([
      { 'danhMuc.doiTuong.ma': 'KH01' },
      { 'danhMuc.doiTuong2.ma': 'KH01' },
    ]);
  });

  it('tìm kiếm dùng regex đã thoát ký tự đặc biệt', () => {
    const q = buildKeHoachQuery({ search: 'a.b' }) as { $or: { noiDung?: unknown }[] };
    const dieuKienNoiDung = q.$or.find((c) => c.noiDung) as {
      noiDung: { $regex: string };
    };
    expect(dieuKienNoiDung.noiDung.$regex).toBe('a\\.b');
  });

  it('gộp search và đối tượng bằng $and để không ghi đè nhau', () => {
    const q = buildKeHoachQuery({ search: 'abc', doiTuong: 'KH01' }) as {
      $and: unknown[];
      $or?: unknown;
    };
    expect(q.$and).toHaveLength(2);
    expect(q.$or).toBeUndefined();
  });
});
