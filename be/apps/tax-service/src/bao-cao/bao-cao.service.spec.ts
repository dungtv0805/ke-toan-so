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

// Hai dòng "Thuế TNCN phải nộp" và "Bảo hiểm phải nộp" lấy thẳng từ sổ:
// phát sinh bên CÓ của 3335 (TNCN) và 3383+3384+3386 (bảo hiểm), theo từng quý.
describe('BaoCaoService — TNCN/bảo hiểm lấy từ phát sinh bên Có', () => {
  const nam = 2026;

  // aggregateBalance được gọi 1 lần / quý: nhận ra quý qua tháng của startDate.
  const aggregateBalance = jest.fn((start: string) => {
    const thang = new Date(start).getUTCMonth();
    const data =
      thang === 0
        ? [
            { ma: '3335', priorNo: 0, priorCo: 0, periodNo: 40, periodCo: 100 },
            { ma: '3383', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 200 },
            { ma: '3384', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 30 },
            { ma: '3386', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 10 },
            { ma: '3388', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 999 },
          ]
        : thang === 3
          ? [{ ma: '3335', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 50 }]
          : [];
    return Promise.resolve({ success: true, data });
  });

  const makeService = () =>
    new BaoCaoService(
      { find: jest.fn().mockResolvedValue([]) } as any,
      { find: jest.fn().mockResolvedValue([]) } as any,
      {
        getOrDefault: jest.fn().mockResolvedValue({
          nam,
          thueTNCN: [1, 0, 0, 0],
          bhxh3383: [0, 0, 0, 0],
          bhyt3384: [0, 0, 0, 0],
          bhtn3386: [0, 0, 0, 0],
          thuNhapMienThue: [0, 0, 0, 0],
          loDuocChuyen: [0, 0, 0, 0],
        }),
      } as any,
      {
        aggregateBalance,
        aggregateNonDeductible: jest
          .fn()
          .mockResolvedValue({ success: true, data: [] }),
      } as any,
      { getCurrentTenantId: jest.fn().mockReturnValue(undefined) } as any,
    );

  beforeEach(() => aggregateBalance.mockClear());

  it('nghiaVuChinhSach: TNCN = Có 3335 + số nhập tay; bảo hiểm = Có 3383+3384+3386', async () => {
    const res = await makeService().nghiaVuChinhSach(nam);

    const tncn = res.sections.find((s) => s.ma === 'TNCN')!.rows[0];
    expect(tncn.q1).toBe(101); // 100 từ sổ + 1 nhập tay
    expect(tncn.q2).toBe(50);
    expect(tncn.luyKe).toBe(151);

    const bh = res.sections.find((s) => s.ma === 'BHXH')!.rows[0];
    expect(bh.q1).toBe(240); // 200+30+10, KHÔNG lấy 3388
    expect(bh.luyKe).toBe(240);
  });

  it('nghiaVuChinhSach chỉ gọi aggregateBalance 4 lần (1 lần/quý, không lấy hai lượt)', async () => {
    await makeService().nghiaVuChinhSach(nam);
    expect(aggregateBalance).toHaveBeenCalledTimes(4);
  });

  it('tongHop cả năm: nghĩa vụ ngân sách cộng số từ sổ', async () => {
    const res = await makeService().tongHop(nam, undefined);
    expect(res.nghiaVuNganSach.thueTNCN).toBe(151); // 100 + 50 + 1 nhập tay
    expect(res.nghiaVuNganSach.bhxh).toBe(200);
    expect(res.nghiaVuNganSach.bhyt).toBe(30);
    expect(res.nghiaVuNganSach.bhtn).toBe(10);
  });

  it('tongHop 1 quý: chỉ lấy số của quý đó', async () => {
    const res = await makeService().tongHop(nam, 2);
    expect(res.nghiaVuNganSach.thueTNCN).toBe(50);
    expect(res.nghiaVuNganSach.bhxh).toBe(0);
  });
});
