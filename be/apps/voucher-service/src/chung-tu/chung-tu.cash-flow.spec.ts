import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChungTu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { ChungTuService } from './chung-tu.service';
import { VoucherNumberService, LoaiResolverService } from '../shared';

/**
 * Chuỗi dòng tiền của dashboard. Hai điều bắt buộc:
 *  1. Dòng chi tiết phải CỘNG LẠI ĐÚNG BẰNG số tổng — tooltip "tiền nằm ở đâu"
 *     mà lệch với thẻ TỔNG THU/TỔNG CHI/TỒN ngay trên nó thì tệ hơn là không có.
 *  2. Chỉ tài khoản ngân hàng/quỹ mới được đứng thành dòng. Chi tiền mặt trả nhà
 *     cung cấp thì đối tượng là NHÀ CUNG CẤP — lọt vào là báo cáo dòng tiền hiện
 *     tên một công ty như thể đó là ngân hàng.
 */
describe('ChungTuService.getCashFlowSeries — nguồn tiền', () => {
  const aggregate = jest.fn();
  const repo = { aggregate: () => ({ toArray: aggregate }) };
  const getSoDuDauKyRaw = jest.fn();
  const getNganHang = jest.fn();
  let service: ChungTuService;

  beforeEach(async () => {
    aggregate.mockReset();
    getSoDuDauKyRaw.mockReset();
    getNganHang.mockReset();
    getSoDuDauKyRaw.mockResolvedValue({ success: true, data: { items: [] } });
    getNganHang.mockResolvedValue({ success: true, data: [] });
    const moduleRef = await Test.createTestingModule({
      providers: [
        ChungTuService,
        { provide: getRepositoryToken(ChungTu), useValue: repo },
        { provide: VoucherNumberService, useValue: {} },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => 't1' } },
        { provide: LoaiResolverService, useValue: { resolveLoai: async (_dm, fb) => fb } },
        { provide: ServiceClient, useValue: { getSoDuDauKyRaw, getNganHang } },
      ],
    }).compile();
    service = moduleRef.get(ChungTuService);
  });

  /** aggregate() được gọi 2 lần: chuỗi trong kỳ trước, rồi phát sinh trước kỳ. */
  const mockAgg = (trongKy: unknown, truocKy: unknown) => {
    aggregate.mockResolvedValueOnce([trongKy]).mockResolvedValueOnce([truocKy]);
  };

  const DANH_MUC_NH = [
    { ma: '3999369986', ten: 'MB', nganHang: 'Ngân hàng Quân đội', soTaiKhoan: '3999369986' },
    { ma: '1703329986', ten: 'Vietcombank', nganHang: 'VCB', soTaiKhoan: '1703329986' },
  ];

  it('mỗi tài khoản ngân hàng một dòng, tổng khớp từng bucket', async () => {
    getNganHang.mockResolvedValue({ success: true, data: DANH_MUC_NH });
    mockAgg(
      {
        thu: [
          { _id: { ma: '1121', dt: '3999369986', bucket: 1 }, dtTen: 'MB', dtLoai: 'NGAN_HANG_QUY', v: 900 },
          { _id: { ma: '1121', dt: '1703329986', bucket: 1 }, dtTen: 'Vietcombank', dtLoai: 'NGAN_HANG_QUY', v: 100 },
          { _id: { ma: '1121', dt: '3999369986', bucket: 2 }, dtTen: 'MB', dtLoai: 'NGAN_HANG_QUY', v: 50 },
        ],
        chi: [
          { _id: { ma: '1121', dt: '1703329986', bucket: 2 }, dtTen: 'Vietcombank', dtLoai: 'NGAN_HANG_QUY', v: 60 },
        ],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.nguonTien.map((n) => `${n.ma} ${n.ten}`)).toEqual([
      '1703329986 Vietcombank',
      '3999369986 MB',
    ]);
    expect(data.series[0]).toEqual({ thang: 1, thu: 1000, chi: 0 });
    expect(data.series[1]).toEqual({ thang: 2, thu: 50, chi: 60 });
    for (let i = 0; i < 12; i++) {
      expect(data.series[i].thu).toBe(data.nguonTien.reduce((s, n) => s + n.series[i].thu, 0));
      expect(data.series[i].chi).toBe(data.nguonTien.reduce((s, n) => s + n.series[i].chi, 0));
    }
  });

  it('KHÔNG phát số hiệu TK kế toán thành dòng riêng', async () => {
    getNganHang.mockResolvedValue({ success: true, data: DANH_MUC_NH });
    mockAgg(
      {
        thu: [
          { _id: { ma: '1121', dt: '3999369986', bucket: 1 }, dtTen: 'MB', dtLoai: 'NGAN_HANG_QUY', v: 900 },
          { _id: { ma: '1111', dt: '', bucket: 1 }, v: 100 },
        ],
        chi: [],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    const ten = data.nguonTien.map((n) => n.ten);
    expect(ten).toContain('MB');
    expect(ten).toContain('Tiền mặt');
    expect(ten).not.toContain('1111');
    expect(ten).not.toContain('1121');
    expect(data.nguonTien.every((n) => !/^11[12]/.test(n.ma))).toBe(true);
  });

  it('nhà cung cấp gắn vào bút toán tiền KHÔNG được thành dòng ngân hàng', async () => {
    getNganHang.mockResolvedValue({ success: true, data: DANH_MUC_NH });
    mockAgg(
      {
        thu: [],
        chi: [
          // Chi tiền mặt trả nhà cung cấp: doiTuong2 là NCC, không phải ngân hàng.
          {
            _id: { ma: '111', dt: '0108269207-003', bucket: 1 },
            dtTen: 'CHI NHÁNH CÔNG TY CỔ PHẦN BE GROUP TẠI HÀ NỘI',
            dtLoai: 'NHA_CUNG_CAP',
            v: 1007000,
          },
          { _id: { ma: '111', dt: '', bucket: 1 }, v: 3000 },
        ],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.nguonTien).toHaveLength(1);
    expect(data.nguonTien[0]).toMatchObject({ ma: '', ten: 'Tiền mặt' });
    // Tiền của NCC vẫn nằm trong tổng, chỉ là gom vào dòng Tiền mặt.
    expect(data.nguonTien[0].series[0].chi).toBe(1010000);
    expect(data.series[0].chi).toBe(1010000);
  });

  it('tiền gửi chưa gán tài khoản tách khỏi tiền mặt', async () => {
    mockAgg(
      {
        thu: [
          { _id: { ma: '1121', dt: '', bucket: 1 }, v: 700 },
          { _id: { ma: '1111', dt: '', bucket: 1 }, v: 300 },
        ],
        chi: [],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    const byTen = Object.fromEntries(data.nguonTien.map((n) => [n.ten, n.series[0].thu]));
    expect(byTen['Tiền mặt']).toBe(300);
    expect(byTen['Tiền gửi (chưa gán tài khoản)']).toBe(700);
  });

  it('đối tượng có trong danh mục ngân hàng thì nhận, kể cả snapshot ghi loại khác', async () => {
    // Đối tượng đa loại: snapshot chỉ giữ loai[0] = KHACH_HANG, nhưng nó có trong
    // danh mục ngân hàng → vẫn phải là dòng ngân hàng.
    getNganHang.mockResolvedValue({ success: true, data: DANH_MUC_NH });
    mockAgg(
      {
        thu: [
          { _id: { ma: '1121', dt: '3999369986', bucket: 1 }, dtTen: 'MB', dtLoai: 'KHACH_HANG', v: 500 },
        ],
        chi: [],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.nguonTien).toHaveLength(1);
    expect(data.nguonTien[0]).toMatchObject({ ma: '3999369986', ten: 'MB' });
  });

  it('tồn đầu kỳ tách theo nguồn tiền, cộng lại bằng soDuDauKy tổng', async () => {
    getNganHang.mockResolvedValue({ success: true, data: DANH_MUC_NH });
    getSoDuDauKyRaw.mockResolvedValue({
      success: true,
      data: {
        items: [
          { maTaiKhoan: '1121', chiTietMa: '3999369986', chiTietTen: 'MB', chiTietType: 'NGAN_HANG_QUY', duNo: 1000, duCo: 0 },
          { maTaiKhoan: '111', chiTietMa: null, chiTietTen: null, duNo: 500, duCo: 100 },
          { maTaiKhoan: '131', duNo: 9999, duCo: 0 }, // không phải TK tiền → bỏ
        ],
      },
    });
    mockAgg(
      { thu: [], chi: [] },
      {
        thu: [{ _id: { ma: '1121', dt: '3999369986' }, dtLoai: 'NGAN_HANG_QUY', v: 200 }],
        chi: [{ _id: { ma: '111', dt: '' }, v: 50 }],
      },
    );

    const { data } = await service.getCashFlowSeries(2026);

    const byTen = Object.fromEntries(data.nguonTien.map((n) => [n.ten, n.soDuDauKy]));
    expect(byTen['MB']).toBe(1200); // 1000 + 200 thu trước kỳ
    expect(byTen['Tiền mặt']).toBe(350); // 500 - 100 - 50 chi trước kỳ
    expect(data.soDuDauKy).toBe(1550);
    expect(data.soDuDauKy).toBe(data.nguonTien.reduce((s, n) => s + n.soDuDauKy, 0));
  });

  it('tài khoản chỉ có tồn đầu kỳ, không phát sinh vẫn xuất hiện', async () => {
    getNganHang.mockResolvedValue({ success: true, data: DANH_MUC_NH });
    getSoDuDauKyRaw.mockResolvedValue({
      success: true,
      data: {
        items: [
          { maTaiKhoan: '1121', chiTietMa: '1703329986', chiTietTen: 'Vietcombank', chiTietType: 'NGAN_HANG_QUY', duNo: 70, duCo: 0 },
        ],
      },
    });
    mockAgg({ thu: [], chi: [] }, { thu: [], chi: [] });

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.nguonTien).toHaveLength(1);
    expect(data.nguonTien[0]).toMatchObject({ ma: '1703329986', ten: 'Vietcombank', soDuDauKy: 70 });
    expect(data.nguonTien[0].series.every((p) => !p.thu && !p.chi)).toBe(true);
  });

  it('chế độ tuần: 5 bucket ở cả chuỗi tổng lẫn từng nguồn tiền', async () => {
    getNganHang.mockResolvedValue({ success: true, data: DANH_MUC_NH });
    mockAgg(
      {
        thu: [
          { _id: { ma: '1121', dt: '3999369986', bucket: 3 }, dtLoai: 'NGAN_HANG_QUY', v: 80 },
          { _id: { ma: '1121', dt: '1703329986', bucket: 1 }, dtLoai: 'NGAN_HANG_QUY', v: 20 },
        ],
        chi: [],
      },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026, 7);

    expect(data.series).toHaveLength(5);
    expect(data.nguonTien[0].series).toHaveLength(5);
    expect(data.series[2].thu).toBe(80);
    expect(data.series[0].thu).toBe(20);
  });

  it('master-data lỗi → vẫn trả phát sinh, gom về dòng theo TK gốc', async () => {
    getSoDuDauKyRaw.mockResolvedValue({ success: false, error: {} });
    getNganHang.mockResolvedValue({ success: false, error: {} });
    mockAgg(
      { thu: [{ _id: { ma: '1111', dt: '', bucket: 1 }, v: 10 }], chi: [] },
      { thu: [], chi: [] },
    );

    const { data } = await service.getCashFlowSeries(2026);

    expect(data.soDuDauKy).toBe(0);
    expect(data.nguonTien[0]).toMatchObject({ ten: 'Tiền mặt', soDuDauKy: 0 });
    expect(data.series[0].thu).toBe(10);
  });
});
