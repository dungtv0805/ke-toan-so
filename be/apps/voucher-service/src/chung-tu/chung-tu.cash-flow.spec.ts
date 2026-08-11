import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService, LoaiResolverService } from '../shared';

/**
 * Chuỗi dòng tiền của dashboard. Điều bắt buộc: phần chi tiết theo tài khoản phải
 * CỘNG LẠI ĐÚNG BẰNG số tổng — tooltip "TK nào bao nhiêu tiền" mà lệch với thẻ
 * TỔNG THU/TỔNG CHI/TỒN ngay trên nó thì tệ hơn là không có tooltip.
 */
describe('ChungTuService.getCashFlowSeries — chi tiết theo tài khoản', () => {
  const aggregate = jest.fn();
  const repo = { aggregate: () => ({ toArray: aggregate }) };
  const getSoDuDauKyRaw = jest.fn();
  let service: ChungTuService;

  beforeEach(async () => {
    aggregate.mockReset();
    getSoDuDauKyRaw.mockReset();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: {} },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => 't1' } },
        { provide: LoaiResolverService, useValue: { resolveLoai: async (_dm, fb) => fb } },
        { provide: ServiceClient, useValue: { getSoDuDauKyRaw } },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  /** aggregate() được gọi 2 lần: chuỗi trong kỳ trước, rồi phát sinh trước kỳ. */
  const mockAgg = (trongKy: unknown, truocKy: unknown) => {
    aggregate.mockResolvedValueOnce([trongKy]).mockResolvedValueOnce([truocKy]);
  };

  it('tách thu/chi từng tháng theo tài khoản và tổng khớp từng bucket', async () => {
    getSoDuDauKyRaw.mockResolvedValue({ success: true, data: { items: [] } });
    mockAgg(
      {
        thu: [
          { _id: { ma: '1111', dt: '', bucket: 1 }, ten: 'Tiền mặt', v: 100 },
          { _id: { ma: '1121', dt: 'VCB', bucket: 1 }, ten: 'TGNH', dtTen: 'Vietcombank', v: 300 },
          { _id: { ma: '1121', dt: 'VCB', bucket: 2 }, ten: 'TGNH', dtTen: 'Vietcombank', v: 50 },
        ],
        chi: [{ _id: { ma: '1111', dt: '', bucket: 1 }, ten: 'Tiền mặt', v: 40 }],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.taiKhoan.map((t) => t.ma)).toEqual(['1111', '1121']);
    expect(data.series[0]).toEqual({ thang: 1, thu: 400, chi: 40 });
    expect(data.series[1]).toEqual({ thang: 2, thu: 50, chi: 0 });
    // Bất biến: tổng = Σ theo tài khoản, ở MỌI bucket.
    for (let i = 0; i < 12; i++) {
      expect(data.series[i].thu).toBe(
        data.taiKhoan.reduce((s, t) => s + t.series[i].thu, 0),
      );
      expect(data.series[i].chi).toBe(
        data.taiKhoan.reduce((s, t) => s + t.series[i].chi, 0),
      );
    }
    expect(data.taiKhoan[0].ten).toBe('Tiền mặt');
    expect(data.taiKhoan[0].series).toHaveLength(12);
  });

  it('tách tiếp theo ngân hàng/quỹ trong TK; TK = Σ dòng ngân hàng', async () => {
    getSoDuDauKyRaw.mockResolvedValue({
      success: true,
      data: {
        items: [
          { maTaiKhoan: '1121', chiTietMa: 'VCB', chiTietTen: 'Vietcombank', duNo: 1000, duCo: 0 },
          { maTaiKhoan: '1121', chiTietMa: 'TCB', chiTietTen: 'Techcombank', duNo: 400, duCo: 0 },
        ],
      },
    });
    mockAgg(
      {
        thu: [
          { _id: { ma: '1121', dt: 'VCB', bucket: 1 }, ten: 'TGNH', dtTen: 'Vietcombank', v: 900 },
          { _id: { ma: '1121', dt: 'TCB', bucket: 1 }, ten: 'TGNH', dtTen: 'Techcombank', v: 100 },
        ],
        chi: [
          { _id: { ma: '1121', dt: 'TCB', bucket: 2 }, ten: 'TGNH', dtTen: 'Techcombank', v: 60 },
        ],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    const tk = data.taiKhoan[0];
    expect(tk.ma).toBe('1121');
    expect(tk.chiTiet.map((c) => c.ma)).toEqual(['TCB', 'VCB']);
    expect(tk.chiTiet.find((c) => c.ma === 'VCB')).toMatchObject({
      ten: 'Vietcombank',
      soDuDauKy: 1000,
    });
    // Bất biến ở mức 2: TK = Σ ngân hàng, mọi bucket + tồn đầu kỳ.
    expect(tk.soDuDauKy).toBe(tk.chiTiet.reduce((s, c) => s + c.soDuDauKy, 0));
    expect(tk.soDuDauKy).toBe(1400);
    for (let i = 0; i < 12; i++) {
      expect(tk.series[i].thu).toBe(tk.chiTiet.reduce((s, c) => s + c.series[i].thu, 0));
      expect(tk.series[i].chi).toBe(tk.chiTiet.reduce((s, c) => s + c.series[i].chi, 0));
    }
    expect(tk.series[0].thu).toBe(1000);
    expect(tk.series[1].chi).toBe(60);
  });

  it('phần chưa gắn đối tượng thành một dòng riêng để Σ vẫn bằng TK', async () => {
    getSoDuDauKyRaw.mockResolvedValue({ success: true, data: { items: [] } });
    mockAgg(
      {
        thu: [
          { _id: { ma: '1121', dt: 'VCB', bucket: 1 }, ten: 'TGNH', dtTen: 'Vietcombank', v: 700 },
          { _id: { ma: '1121', dt: '', bucket: 1 }, ten: 'TGNH', v: 300 },
        ],
        chi: [],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    const tk = data.taiKhoan[0];
    expect(tk.chiTiet.map((c) => c.ma)).toEqual(['', 'VCB']);
    expect(tk.series[0].thu).toBe(1000);
    expect(tk.series[0].thu).toBe(tk.chiTiet.reduce((s, c) => s + c.series[0].thu, 0));
  });

  it('TK mà mọi phát sinh đều chưa gắn đối tượng thì không đẻ dòng con thừa', async () => {
    getSoDuDauKyRaw.mockResolvedValue({ success: true, data: { items: [] } });
    mockAgg(
      { thu: [{ _id: { ma: '1111', dt: '', bucket: 1 }, ten: 'Tiền mặt', v: 500 }], chi: [] },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.taiKhoan[0].chiTiet).toEqual([]);
    expect(data.taiKhoan[0].series[0].thu).toBe(500);
  });

  it('tồn đầu kỳ tách theo tài khoản, cộng lại bằng soDuDauKy tổng', async () => {
    getSoDuDauKyRaw.mockResolvedValue({
      success: true,
      data: {
        items: [
          { maTaiKhoan: '1111', duNo: 500, duCo: 0 },
          { maTaiKhoan: '1121', duNo: 900, duCo: 100 },
          { maTaiKhoan: '131', duNo: 9999, duCo: 0 }, // không phải TK tiền → bỏ
        ],
      },
    });
    mockAgg(
      { thu: [], chi: [] },
      {
        thu: [{ _id: { ma: '1111', dt: '' }, v: 200 }],
        chi: [{ _id: { ma: '1121', dt: '' }, v: 300 }],
      },
    );

    const { data } = await service.getCashFlowSeries(2026);

    const byMa = Object.fromEntries(data.taiKhoan.map((t) => [t.ma, t.soDuDauKy]));
    expect(byMa['1111']).toBe(700); // 500 + 200 thu trước kỳ
    expect(byMa['1121']).toBe(500); // 900 - 100 - 300 chi trước kỳ
    expect(byMa['131']).toBeUndefined();
    expect(data.soDuDauKy).toBe(1200);
    expect(data.soDuDauKy).toBe(
      data.taiKhoan.reduce((s, t) => s + t.soDuDauKy, 0),
    );
  });

  it('tài khoản chỉ có tồn đầu kỳ, không phát sinh vẫn xuất hiện', async () => {
    getSoDuDauKyRaw.mockResolvedValue({
      success: true,
      data: { items: [{ maTaiKhoan: '1112', duNo: 70, duCo: 0 }] },
    });
    mockAgg({ thu: [], chi: [] }, { thu: [], chi: [] });

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.taiKhoan).toHaveLength(1);
    expect(data.taiKhoan[0]).toMatchObject({ ma: '1112', soDuDauKy: 70 });
    expect(data.taiKhoan[0].series.every((p) => !p.thu && !p.chi)).toBe(true);
  });

  it('chế độ tuần: 5 bucket, chi tiết theo tài khoản/ngân hàng cũng 5 bucket', async () => {
    getSoDuDauKyRaw.mockResolvedValue({ success: true, data: { items: [] } });
    mockAgg(
      {
        thu: [
          { _id: { ma: '1121', dt: 'VCB', bucket: 3 }, ten: 'TGNH', dtTen: 'Vietcombank', v: 80 },
          { _id: { ma: '1121', dt: 'TCB', bucket: 1 }, ten: 'TGNH', dtTen: 'Techcombank', v: 20 },
        ],
        chi: [],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026, 7);

    expect(data.series).toHaveLength(5);
    expect(data.taiKhoan[0].series).toHaveLength(5);
    expect(data.taiKhoan[0].chiTiet[0].series).toHaveLength(5);
    expect(data.series[2].thu).toBe(80);
    expect(data.series[0].thu).toBe(20);
  });

  it('service số dư đầu kỳ lỗi → vẫn trả chi tiết phát sinh, không vỡ', async () => {
    getSoDuDauKyRaw.mockResolvedValue({ success: false, error: {} });
    mockAgg(
      { thu: [{ _id: { ma: '1111', dt: '', bucket: 1 }, ten: 'Tiền mặt', v: 10 }], chi: [] },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.soDuDauKy).toBe(0);
    expect(data.taiKhoan[0]).toMatchObject({ ma: '1111', soDuDauKy: 0 });
    expect(data.series[0].thu).toBe(10);
  });
});
