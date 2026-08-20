import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService, LoaiResolverService } from '../shared';

/**
 * Tỷ trọng tiền thu / tiền chi của dashboard.
 *
 * Bút toán luân chuyển nội bộ (rút tiền gửi về quỹ: Nợ 111 / Có 112, và chiều
 * ngược lại) thoả CẢ hai bộ lọc — vừa vào biểu đồ thu vừa vào biểu đồ chi — nên
 * nó phình lên chiếm phần lớn vòng tròn dù doanh nghiệp không thu/chi đồng nào
 * ra ngoài. Phải loại hẳn khỏi hai biểu đồ này.
 *
 * Nhận diện TK tiền theo 3 KÝ TỰ ĐẦU (111/112) chứ không so bằng — nếu so bằng
 * thì tiểu khoản 1111 / 1121 lọt lưới và bút toán nội bộ vẫn được tính.
 */
describe('ChungTuService.getCashFlowComposition — loại luân chuyển nội bộ', () => {
  const toArray = jest.fn();
  const aggregate = jest.fn(() => ({ toArray }));
  const repo = { aggregate };
  let service: ChungTuService;

  beforeEach(async () => {
    aggregate.mockClear();
    toArray.mockReset();
    toArray.mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: {} },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => 't1' } },
        { provide: LoaiResolverService, useValue: { resolveLoai: async (_dm, fb) => fb } },
        { provide: ServiceClient, useValue: {} },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  /** $match ở đầu pipeline mà aggregate() thực sự nhận. */
  const matchStage = (): Record<string, unknown> => {
    const pipeline = aggregate.mock.calls[0][0] as { $match: Record<string, unknown> }[];
    return pipeline[0].$match;
  };

  /** Bộ lọc của vế đối ứng — vế KHÔNG phải tài khoản tiền của biểu đồ. */
  const doiUng = (which: 'thu' | 'chi') =>
    matchStage()[which === 'thu' ? 'danhMuc.taiKhoanCo.ma' : 'danhMuc.taiKhoanNo.ma'] as {
      $not: RegExp;
    };

  it.each(['thu', 'chi'] as const)('%s: chặn vế đối ứng là tài khoản tiền', async (which) => {
    await service.getCashFlowComposition(which, {} as never);

    const re = doiUng(which).$not;
    // Đúng cặp 111 ↔ 112 và cả hai chiều đều bị loại.
    expect(re.test('111')).toBe(true);
    expect(re.test('112')).toBe(true);
  });

  it.each(['thu', 'chi'] as const)('%s: tiểu khoản 1111 / 1121 cũng bị loại', async (which) => {
    await service.getCashFlowComposition(which, {} as never);

    const re = doiUng(which).$not;
    expect(re.test('1111')).toBe(true);
    expect(re.test('1121')).toBe(true);
    expect(re.test('11211')).toBe(true);
  });

  it('không đụng tới bút toán thu/chi thật', async () => {
    await service.getCashFlowComposition('thu', {} as never);

    const re = doiUng('thu').$not;
    // Thu tiền bán hàng (Có 511), thu công nợ (Có 131), thu khác (Có 711).
    expect(re.test('511')).toBe(false);
    expect(re.test('131')).toBe(false);
    expect(re.test('711')).toBe(false);
    // TK 113 (tiền đang chuyển) và 121 KHÔNG phải cặp 111/112 → vẫn tính.
    expect(re.test('113')).toBe(false);
    expect(re.test('121')).toBe(false);
  });

  it('giữ nguyên các bộ lọc cũ: vế tiền, mã dòng tiền, tenant', async () => {
    await service.getCashFlowComposition('chi', {} as never);

    const m = matchStage();
    expect(m.tenantId).toBe('t1');
    expect(m['danhMuc.taiKhoanCo.ma']).toEqual({ $regex: '^11[12]' });
    expect(m['danhMuc.dongTien.ma']).toEqual({ $exists: true, $ne: null });
  });
});
