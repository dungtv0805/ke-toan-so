import 'reflect-metadata';
import { VoucherNumberService } from './voucher-number.service';

function makeRepoMock(initial?: { loai: string; year: number; lastSequence: number }) {
  let record = initial ? { ...initial } : null;
  return {
    findOne: jest.fn(async () => (record ? { ...record } : null)),
    create: jest.fn((data: any) => ({ ...data })),
    save: jest.fn(async (entity: any) => {
      record = { ...entity };
      return record;
    }),
    _get: () => record,
  };
}

describe('VoucherNumberService.generateVoucherNumbers', () => {
  const year = new Date().getFullYear();

  it('trả về dải số liên tiếp khi chưa có sequence', async () => {
    const repo = makeRepoMock();
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_THU', 3);

    expect(result).toEqual([
      `PT001/${year}`,
      `PT002/${year}`,
      `PT003/${year}`,
    ]);
    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo._get().lastSequence).toBe(3);
  });

  it('tiếp tục từ lastSequence hiện có', async () => {
    const repo = makeRepoMock({ loai: 'PHIEU_CHI', year, lastSequence: 5 });
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_CHI', 2);

    expect(result).toEqual([`PC006/${year}`, `PC007/${year}`]);
    expect(repo._get().lastSequence).toBe(7);
  });

  it('count = 0 trả về mảng rỗng, không ghi DB', async () => {
    const repo = makeRepoMock();
    const service = new VoucherNumberService(repo as any);

    const result = await service.generateVoucherNumbers('PHIEU_THU', 0);

    expect(result).toEqual([]);
    expect(repo.save).not.toHaveBeenCalled();
  });
});
