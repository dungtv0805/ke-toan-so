import { BangKeBanRaService } from './bang-ke-ban-ra.service';
import { CreateBangKeBanRaDto } from './dto';

function makeService(existing: unknown[] = []) {
  const repo = {
    create: jest.fn((o) => ({ ...o })),
    save: jest.fn(async (e) => e),
    find: jest.fn(async () => existing),
  };
  const tenantContext = { getCurrentTenantId: () => 'tenant-1' };
  const service = new BangKeBanRaService(repo as never, tenantContext as never);
  return { service, repo };
}

describe('BangKeBanRaService.importMany', () => {
  it('lưu đủ bản ghi và tính tiền thuế theo từng dòng', async () => {
    const { service, repo } = makeService();

    const result = await service.importMany([
      {
        ngayHoaDon: '2026-06-01',
        soHoaDon: '1',
        tenNguoiMua: 'Cty B',
        giaTriChuaThue: 2_000_000,
        thueSuat: '8',
      },
      {
        ngayHoaDon: '2026-06-02',
        soHoaDon: '2',
        tenNguoiMua: 'Cty C',
        giaTriChuaThue: 2_000_000,
        thueSuat: 'KCT',
      },
    ] as CreateBangKeBanRaDto[]);

    expect(result).toEqual({ created: 2 });
    const saved = repo.save.mock.calls[0][0] as { tienThue: number }[];
    expect(saved.map((e) => e.tienThue)).toEqual([160_000, 0]);
  });
});

describe('BangKeBanRaService.checkDuplicates', () => {
  it('dựng khóa từ mstNguoiMua (không phải mstNguoiBan)', async () => {
    const { service } = makeService([
      {
        soHoaDon: '0000123',
        kyHieuHoaDon: '1C25TAA',
        mstNguoiMua: '0101243150',
        isActive: true,
      },
    ]);

    const found = await service.checkDuplicates([
      { soHoaDon: '0000123', kyHieuHoaDon: '1C25TAA', mst: '0101243150' },
    ]);

    expect(found).toEqual(['0000123|1C25TAA|0101243150']);
  });
});
