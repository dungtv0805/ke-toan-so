import { KeHoachService } from './ke-hoach.service';

type Repo = {
  aggregate: jest.Mock;
  countDocuments: jest.Mock;
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  deleteOne: jest.Mock;
  deleteMany: jest.Mock;
};

const repo = (rows: unknown[] = []): Repo => ({
  aggregate: jest.fn(() => ({ toArray: () => Promise.resolve(rows) })),
  countDocuments: jest.fn(() => Promise.resolve(rows.length)),
  create: jest.fn((v) => v),
  save: jest.fn((v) => Promise.resolve(v)),
  findOne: jest.fn(() => Promise.resolve(null)),
  deleteOne: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
  deleteMany: jest.fn(() => Promise.resolve({ deletedCount: 2 })),
});

const dungService = (keHoach: Repo, chungTu: Repo, tenantId = 't1') =>
  new KeHoachService(
    keHoach as never,
    chungTu as never,
    { getCurrentTenantId: () => tenantId } as never,
  );

/** $match luôn là stage đầu tiên của mọi pipeline trong service này. */
const matchDauTien = (repoMock: Repo, lanGoi = 0) =>
  (repoMock.aggregate.mock.calls[lanGoi][0] as { $match: Record<string, unknown> }[])[0]
    .$match;

describe('KeHoachService.soSanh', () => {
  it('gom kế hoạch từ ke_hoach và thực hiện từ chung_tu bằng cùng một chiều', async () => {
    const keHoach = repo([{ key: 'DA01', ten: 'Dự án A', doanhThu: 100, chiPhi: 0, tong: 100, soLuong: 1 }]);
    const chungTu = repo([{ key: 'DA01', ten: 'Dự án A', doanhThu: 60, chiPhi: 0, tong: 60, soLuong: 1 }]);

    const res = await dungService(keHoach, chungTu).soSanh('project', 'doanhThu', {
      loaiKeHoach: 'KE_HOACH',
    });

    expect(res.data.rows[0]).toMatchObject({
      key: 'DA01',
      keHoach: 100,
      thucHien: 60,
      chenhLech: -40,
      tyLeDat: 60,
    });
  });

  it('không áp loaiKeHoach/phienBan lên chứng từ thực tế', async () => {
    const keHoach = repo();
    const chungTu = repo();

    await dungService(keHoach, chungTu).soSanh('team', 'tong', {
      loaiKeHoach: 'DU_BAO',
      phienBan: 'KH 2026',
    });

    expect(matchDauTien(keHoach)).toMatchObject({
      loaiKeHoach: 'DU_BAO',
      phienBan: 'KH 2026',
      tenantId: 't1',
    });
    const matchThucHien = matchDauTien(chungTu);
    expect(matchThucHien).toMatchObject({ tenantId: 't1' });
    expect(matchThucHien).not.toHaveProperty('loaiKeHoach');
    expect(matchThucHien).not.toHaveProperty('phienBan');
  });
});

describe('KeHoachService — khoá theo tenant', () => {
  it('tìm dòng theo id luôn kèm tenantId', async () => {
    const keHoach = repo();
    keHoach.findOne = jest.fn(() => Promise.resolve({ _id: 'x' }));
    await dungService(keHoach, repo()).findById('507f1f77bcf86cd799439011');
    const where = (keHoach.findOne.mock.calls[0][0] as { where: Record<string, unknown> }).where;
    expect(where.tenantId).toBe('t1');
  });

  it('xóa hàng loạt cũng chỉ đụng dữ liệu của tenant hiện tại', async () => {
    const keHoach = repo();
    await dungService(keHoach, repo()).removeBatch(['507f1f77bcf86cd799439011']);
    expect(keHoach.deleteMany.mock.calls[0][0]).toMatchObject({ tenantId: 't1' });
  });

  it('không có dòng nào được chọn thì không gọi xuống DB', async () => {
    const keHoach = repo();
    const res = await dungService(keHoach, repo()).removeBatch([]);
    expect(res).toEqual({ success: true, deleted: 0 });
    expect(keHoach.deleteMany).not.toHaveBeenCalled();
  });
});

describe('KeHoachService.create', () => {
  it('phiên bản bỏ trống thì rơi về "Mặc định"', async () => {
    const keHoach = repo();
    await dungService(keHoach, repo()).create(
      { loaiKeHoach: 'KE_HOACH', ngay: '2026-01-01', soTien: 10, noiDung: '' },
      'user1',
    );
    expect(keHoach.create.mock.calls[0][0]).toMatchObject({
      phienBan: 'Mặc định',
      nguoiTaoId: 'user1',
    });
  });
});

describe('KeHoachService.getSeries', () => {
  it('lọc đúng khoảng của năm và trả đủ 12 tháng', async () => {
    const keHoach = repo([
      { ngay: new Date('2026-03-10'), soTien: 100, danhMuc: { taiKhoanCo: { ma: '511' } } },
    ]);
    const res = await dungService(keHoach, repo()).getSeries(2026, undefined, 'KE_HOACH');
    expect(res.data).toHaveLength(12);
    expect(res.data[2]).toMatchObject({ thang: 3, doanhThu: 100 });
    expect(matchDauTien(keHoach)).toMatchObject({ loaiKeHoach: 'KE_HOACH', tenantId: 't1' });
  });
});
