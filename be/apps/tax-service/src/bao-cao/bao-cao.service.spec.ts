import { BaoCaoService } from './bao-cao.service';

// Test hẹp: dựng BaoCaoService trực tiếp với dependency giả (không qua Nest
// TestingModule) để kiểm nghiệm dòng bảng kê `choBoSung: true` (sinh từ màn
// liên kết chứng từ, số tiền chưa xác định) tuyệt đối không được cộng vào số
// thuế của báo cáo "Tình hình thực hiện nghĩa vụ chính sách".
describe('BaoCaoService.nghiaVuChinhSach — bỏ dòng chờ bổ sung khỏi VAT', () => {
  const nam = 2026;

  // Quý 1/2026: mỗi bên (mua vào / bán ra) có 1 dòng đã đủ thông tin và 1 dòng
  // chờ bổ sung với tienThue KHÁC 0 — nếu code quên lọc, số quý 1 sẽ lệch.
  const muaVaoRows = [
    {
      ma: 'MV1',
      ngayHoaDon: new Date(Date.UTC(nam, 0, 15)),
      tienThue: 100,
      isActive: true,
      choBoSung: false,
    },
    {
      ma: 'MV2',
      ngayHoaDon: new Date(Date.UTC(nam, 0, 20)),
      tienThue: 999,
      isActive: true,
      choBoSung: true,
    },
  ];
  const banRaRows = [
    {
      ma: 'BR1',
      ngayHoaDon: new Date(Date.UTC(nam, 0, 10)),
      tienThue: 300,
      isActive: true,
      choBoSung: false,
    },
    {
      ma: 'BR2',
      ngayHoaDon: new Date(Date.UTC(nam, 0, 25)),
      tienThue: 888,
      isActive: true,
      choBoSung: true,
    },
  ];

  const muaVaoRepo = { find: jest.fn().mockResolvedValue(muaVaoRows) };
  const banRaRepo = { find: jest.fn().mockResolvedValue(banRaRows) };
  const dieuChinhService = {
    getOrDefault: jest.fn().mockResolvedValue({
      nam,
      thueTNCN: [0, 0, 0, 0],
      bhxh3383: [0, 0, 0, 0],
      bhyt3384: [0, 0, 0, 0],
      bhtn3386: [0, 0, 0, 0],
      thuNhapMienThue: [0, 0, 0, 0],
      loDuocChuyen: [0, 0, 0, 0],
    }),
  };
  const serviceClient = {
    aggregateBalance: jest.fn().mockResolvedValue({ success: true, data: [] }),
    aggregateNonDeductible: jest
      .fn()
      .mockResolvedValue({ success: true, data: [] }),
  };
  const tenantContext = { getCurrentTenantId: jest.fn().mockReturnValue(undefined) };

  const service = new BaoCaoService(
    muaVaoRepo as any,
    banRaRepo as any,
    dieuChinhService as any,
    serviceClient as any,
    tenantContext as any,
  );

  it('VAT quý 1 chỉ cộng dòng đã đủ thông tin, bỏ dòng choBoSung=true', async () => {
    const res = await service.nghiaVuChinhSach(nam);
    const gtgt = res.sections.find((s) => s.ma === 'GTGT');
    expect(gtgt).toBeDefined();

    const vatMuaVao = gtgt!.rows.find((r) => r.chiTieu === 'VAT mua vào');
    const vatBanRa = gtgt!.rows.find((r) => r.chiTieu === 'VAT bán ra');
    expect(vatMuaVao).toBeDefined();
    expect(vatBanRa).toBeDefined();

    // Chỉ MV1 (100) / BR1 (300) được cộng — MV2/BR2 (choBoSung=true) bị loại.
    expect(vatMuaVao!.q1).toBe(100);
    expect(vatBanRa!.q1).toBe(300);
    expect(vatMuaVao!.luyKe).toBe(100);
    expect(vatBanRa!.luyKe).toBe(300);
  });
});
