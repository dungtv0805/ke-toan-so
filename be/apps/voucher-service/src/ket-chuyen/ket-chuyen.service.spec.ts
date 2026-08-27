import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import { CauHinhKetChuyen, ChungTu, QuyChuan } from '@app/entities';
import { NhatKyChungService } from '../nhat-ky-chung/nhat-ky-chung.service';
import { LoaiResolverService, VoucherNumberService } from '../shared';
import { KetChuyenService } from './ket-chuyen.service';

describe('KetChuyenService', () => {
  let service: KetChuyenService;
  let chungTuRepository: any;
  let serviceClient: any;
  let nhatKyChungService: any;
  let voucherNumberService: any;
  let cauHinhRepository: any;
  let quyChuanRepository: any;
  let loaiResolver: any;

  const DANH_MUC = [
    { ma: '511-911', thuTu: 10, taiKhoanTu: '511', taiKhoanDen: '911', ben: 'CO', loai: 'XAC_DINH_KQKD', isActive: true, dienGiai: 'Kết chuyển doanh thu' },
    { ma: '642-911', thuTu: 20, taiKhoanTu: '642', taiKhoanDen: '911', ben: 'NO', loai: 'XAC_DINH_KQKD', isActive: true, dienGiai: 'Kết chuyển chi phí QLDN' },
    { ma: '911-4212', thuTu: 99, taiKhoanTu: '911', taiKhoanDen: '4212', ben: 'HAI_BEN', loai: 'XAC_DINH_KQKD', isActive: true, dienGiai: 'Kết chuyển lãi lỗ' },
  ];

  const TAI_KHOAN = [
    { ma: '511', ten: 'Doanh thu bán hàng', loai: 'DOANH_THU', nhom: 'KHONG_CO_SO_DU' },
    { ma: '642', ten: 'Chi phí quản lý doanh nghiệp', loai: 'CHI_PHI', nhom: 'KHONG_CO_SO_DU' },
    { ma: '911', ten: 'Xác định kết quả kinh doanh', loai: 'XAC_DINH_KQKD', nhom: 'KHONG_CO_SO_DU' },
    { ma: '4212', ten: 'LNST chưa phân phối năm nay', loai: 'VON_CHU_SO_HUU', nhom: 'CO' },
  ];

  beforeEach(async () => {
    chungTuRepository = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((d: any) => d),
      save: jest.fn((d: any) => d),
      delete: jest.fn().mockResolvedValue({ affected: 3 }),
    };
    serviceClient = {
      getTaiKhoanKetChuyen: jest.fn().mockResolvedValue({ success: true, data: DANH_MUC }),
      getTaiKhoan: jest.fn().mockResolvedValue({ success: true, data: TAI_KHOAN }),
      getSoDuDauKy: jest.fn().mockResolvedValue({ success: true, data: { ngayApDung: null, items: [] } }),
    };
    nhatKyChungService = {
      aggregateBalance: jest.fn().mockResolvedValue({
        success: true,
        data: [
          { ma: '511', priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 100 },
          { ma: '642', priorNo: 0, priorCo: 0, periodNo: 30, periodCo: 0 },
        ],
      }),
    };
    voucherNumberService = {
      generateVoucherNumber: jest.fn().mockResolvedValue('NVK202608/001'),
    };
    cauHinhRepository = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((d: any) => d),
      save: jest.fn((d: any) => d),
    };
    quyChuanRepository = {
      find: jest.fn().mockResolvedValue([
        { loaiGiaoDich: 'KC', nghiepVu: 'Kết chuyển doanh thu thuần', taiKhoanNo: '511', taiKhoanCo: '911', isActive: true },
      ]),
    };
    loaiResolver = {
      layThongTinLoaiGiaoDich: jest.fn(async (ma: string) =>
        ma === 'KC'
          ? { ma: 'KC', ten: 'Kết chuyển', loaiChungTu: { ma: 'KC', ten: 'Phiếu kết chuyển' }, phanLoai: 'KHAC' }
          : null,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KetChuyenService,
        { provide: getRepositoryToken(ChungTu), useValue: chungTuRepository },
        { provide: getRepositoryToken(CauHinhKetChuyen), useValue: cauHinhRepository },
        { provide: getRepositoryToken(QuyChuan), useValue: quyChuanRepository },
        { provide: LoaiResolverService, useValue: loaiResolver },
        { provide: NhatKyChungService, useValue: nhatKyChungService },
        { provide: VoucherNumberService, useValue: voucherNumberService },
        { provide: ServiceClient, useValue: serviceClient },
        { provide: TenantContextService, useValue: { getCurrentTenantId: () => 'tenant-1' } },
      ],
    }).compile();

    service = module.get<KetChuyenService>(KetChuyenService);
  });

  it('preview trả về đủ dòng kết chuyển và số lãi', async () => {
    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong.map((d) => `${d.taiKhoanNo}/${d.taiKhoanCo}=${d.soTien}`)).toEqual([
      '511/911=100',
      '911/642=30',
      '911/4212=70',
    ]);
    expect(kq.laiLo).toBe(70);
  });

  it('preview lấy số dư từ đầu năm của ngày kết chuyển', async () => {
    await service.preview('2026-08-31', 'Bearer token');

    const [start, end] = nhatKyChungService.aggregateBalance.mock.calls[0];
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2026);
  });

  it('preview lấy denNgay đến cuối ngày (23:59:59.999)', async () => {
    await service.preview('2026-08-31', 'Bearer token');

    const [, end] = nhatKyChungService.aggregateBalance.mock.calls[0];
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
    expect(end.getMilliseconds()).toBe(999);
  });

  it('preview dựng đầu năm cùng cơ sở (múi giờ) với ngày kết thúc', async () => {
    await service.preview('2026-08-31', 'Bearer token');

    const [start, end] = nhatKyChungService.aggregateBalance.mock.calls[0];
    const dauNamMongDoi = new Date(end.getFullYear(), 0, 1);
    expect(start.getTime()).toBe(dauNamMongDoi.getTime());
  });

  it('preview gắn tên tài khoản vào cảnh báo', async () => {
    serviceClient.getTaiKhoanKetChuyen.mockResolvedValue({ success: true, data: [] });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.canhBao).toEqual([
      { ma: '511', ten: 'Doanh thu bán hàng', soTien: 100, ben: 'CO' },
      { ma: '642', ten: 'Chi phí quản lý doanh nghiệp', soTien: 30, ben: 'NO' },
    ]);
  });

  it('preview bỏ qua dòng danh mục đã ngừng sử dụng', async () => {
    serviceClient.getTaiKhoanKetChuyen.mockResolvedValue({
      success: true,
      data: DANH_MUC.map((d) => (d.ma === '642-911' ? { ...d, isActive: false } : d)),
    });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong.some((d) => d.taiKhoanCo === '642')).toBe(false);
  });

  it('preview bỏ qua số dư đầu kỳ có ngày áp dụng ngoài năm kết chuyển', async () => {
    serviceClient.getSoDuDauKy.mockResolvedValue({
      success: true,
      data: { ngayApDung: '2025-06-30', items: [{ maTaiKhoan: '511', duNo: 0, duCo: 500 }] },
    });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong[0].soTien).toBe(100);
  });

  it('preview cộng số dư đầu kỳ có ngày áp dụng trong năm kết chuyển', async () => {
    serviceClient.getSoDuDauKy.mockResolvedValue({
      success: true,
      data: { ngayApDung: '2026-06-30', items: [{ maTaiKhoan: '511', duNo: 0, duCo: 500 }] },
    });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong[0].soTien).toBe(600);
  });

  it('preview trả 0 dòng và laiLo là 0 khi toàn bộ tài khoản về 0 (không để lọt -0)', async () => {
    // Bài học từ Task 3: unary minus của 0 dương cho ra -0 (IEEE-754), Object.is(-0, 0)
    // là false nên nếu để lọt ra tầng I/O sẽ gây so sánh sai ở FE/báo cáo.
    nhatKyChungService.aggregateBalance.mockResolvedValue({ success: true, data: [] });

    const kq = await service.preview('2026-08-31', 'Bearer token');

    expect(kq.dong).toHaveLength(0);
    expect(kq.laiLo).toBe(0);
    expect(Object.is(kq.laiLo, -0)).toBe(false);
  });

  it('preview ném lỗi khi không tải được danh mục tài khoản kết chuyển', async () => {
    // Danh mục lỗi mà cứ trả 0 dòng thì trông y hệt "không có gì để kết chuyển" —
    // phải phân biệt hai trường hợp bằng lỗi rõ ràng, không được im lặng.
    serviceClient.getTaiKhoanKetChuyen.mockResolvedValue({ success: false, data: undefined });

    await expect(service.preview('2026-08-31', 'Bearer token')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('create ghi mọi dòng cùng một số phiếu và gắn tag kết chuyển', async () => {
    const kq = await service.create(
      {
        denNgay: '2026-08-31',
        ngayHachToan: '2026-08-31',
        ngayChungTu: '2026-08-31',
        dienGiai: 'Kết chuyển lãi lỗ đến ngày 31/08/2026',
        dong: [
          { maKetChuyen: '511-911', dienGiai: 'Kết chuyển doanh thu', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
          { maKetChuyen: '911-4212', dienGiai: 'Kết chuyển lãi lỗ', taiKhoanNo: '911', taiKhoanCo: '4212', soTien: 100 },
        ],
      },
      'user-1',
      'Bearer token',
    );

    expect(kq.soPhieu).toBe('NVK202608/001');
    expect(kq.soDong).toBe(2);

    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu).toHaveLength(2);
    expect(daLuu.every((r: any) => r.soPhieu === 'NVK202608/001')).toBe(true);
    expect(daLuu.every((r: any) => r.nguon === 'KET_CHUYEN')).toBe(true);
    expect(daLuu.every((r: any) => r.loai === 'KHAC')).toBe(true);
    expect(daLuu[0].danhMuc.taiKhoanNo).toEqual({
      ma: '511',
      ten: 'Doanh thu bán hàng',
      loai: 'DOANH_THU',
      nhom: 'KHONG_CO_SO_DU',
    });
  });

  it('create dùng tiền tố NVK khi lô không chọn loại giao dịch', async () => {
    await service.create(
      {
        denNgay: '2026-08-31',
        ngayHachToan: '2026-08-31',
        ngayChungTu: '2026-08-31',
        dienGiai: 'x',
        dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
      },
      'user-1',
      'Bearer token',
    );

    expect(voucherNumberService.generateVoucherNumber).toHaveBeenCalledWith(
      'KHAC',
      expect.objectContaining({ maLoaiChungTu: 'NVK' }),
    );
  });

  const LO_CO_LOAI_GD = {
    denNgay: '2026-08-31',
    ngayHachToan: '2026-08-31',
    ngayChungTu: '2026-08-31',
    dienGiai: 'x',
    loaiGiaoDichMa: 'KC',
    dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
  };

  it('create lấy tiền tố số phiếu theo loại chứng từ mà loại giao dịch trỏ tới', async () => {
    await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    expect(voucherNumberService.generateVoucherNumber).toHaveBeenCalledWith(
      'KHAC',
      expect.objectContaining({ maLoaiChungTu: 'KC' }),
    );
  });

  it('create snapshot loại giao dịch và loại chứng từ vào mọi dòng', async () => {
    await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu[0].danhMuc.loaiGiaoDich).toEqual({ ma: 'KC', ten: 'Kết chuyển' });
    expect(daLuu[0].danhMuc.loaiChungTu).toEqual({ ma: 'KC', ten: 'Phiếu kết chuyển' });
  });

  it('create giữ loai KHAC kể cả khi loại chứng từ liên kết có phân loại THU', async () => {
    // Trỏ nhầm sang loại chứng từ phân loại THU không được biến bút toán kết chuyển
    // thành phiếu thu — nó sẽ chui vào sổ quỹ.
    loaiResolver.layThongTinLoaiGiaoDich.mockResolvedValue({
      ma: 'KC',
      ten: 'Kết chuyển',
      loaiChungTu: { ma: 'THU', ten: 'Phiếu thu' },
      phanLoai: 'THU',
    });

    await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu.every((r: any) => r.loai === 'KHAC')).toBe(true);
  });

  it('create vẫn snapshot loại giao dịch chưa liên kết loại chứng từ, tiền tố về NVK', async () => {
    loaiResolver.layThongTinLoaiGiaoDich.mockResolvedValue({ ma: 'KC', ten: 'Kết chuyển' });

    await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    expect(voucherNumberService.generateVoucherNumber).toHaveBeenCalledWith(
      'KHAC',
      expect.objectContaining({ maLoaiChungTu: 'NVK' }),
    );
    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu[0].danhMuc.loaiGiaoDich).toEqual({ ma: 'KC', ten: 'Kết chuyển' });
    expect(daLuu[0].danhMuc.loaiChungTu).toBeUndefined();
  });

  it('create ném lỗi và không sinh số phiếu khi mã loại giao dịch không có trong danh mục', async () => {
    await expect(
      service.create({ ...LO_CO_LOAI_GD, loaiGiaoDichMa: 'KHONG_CO' }, 'user-1', 'Bearer token'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(voucherNumberService.generateVoucherNumber).not.toHaveBeenCalled();
    expect(chungTuRepository.save).not.toHaveBeenCalled();
  });

  it('create gắn nghiệp vụ từ quy chuẩn theo cặp tài khoản', async () => {
    await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu[0].danhMuc.nghiepVu).toEqual({
      ma: 'Kết chuyển doanh thu thuần',
      ten: 'Kết chuyển doanh thu thuần',
    });
    expect(quyChuanRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { loaiGiaoDich: 'KC' } }),
    );
  });

  it('create rơi về diễn giải danh mục khi cặp TK chưa có quy chuẩn', async () => {
    quyChuanRepository.find.mockResolvedValue([]);

    await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu[0].danhMuc.nghiepVu).toEqual({
      ma: 'Kết chuyển doanh thu',
      ten: 'Kết chuyển doanh thu',
    });
  });

  it('create lấy diễn giải GỐC của danh mục, không lấy chữ kế toán sửa trên form', async () => {
    // Nghiệp vụ trôi theo ô diễn giải người dùng gõ thì mỗi lô một giá trị, bộ lọc
    // Nghiệp vụ ở Nhật ký chung hết gom được.
    quyChuanRepository.find.mockResolvedValue([]);

    await service.create(
      {
        ...LO_CO_LOAI_GD,
        dong: [{ maKetChuyen: '511-911', dienGiai: 'kc dt thang 8', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
      },
      'user-1',
      'Bearer token',
    );

    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu[0].danhMuc.nghiepVu.ten).toBe('Kết chuyển doanh thu');
    expect(daLuu[0].noiDung).toBe('kc dt thang 8');
  });

  it('create bỏ qua quy chuẩn đã tắt', async () => {
    quyChuanRepository.find.mockResolvedValue([
      { loaiGiaoDich: 'KC', nghiepVu: 'Nghiệp vụ đã tắt', taiKhoanNo: '511', taiKhoanCo: '911', isActive: false },
    ]);

    await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu[0].danhMuc.nghiepVu.ten).toBe('Kết chuyển doanh thu');
  });

  it('create không tra quy chuẩn khi lô không chọn loại giao dịch', async () => {
    await service.create(
      {
        denNgay: '2026-08-31',
        ngayHachToan: '2026-08-31',
        ngayChungTu: '2026-08-31',
        dienGiai: 'x',
        dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
      },
      'user-1',
      'Bearer token',
    );

    expect(quyChuanRepository.find).not.toHaveBeenCalled();
    // Vẫn có nghiệp vụ nhờ diễn giải danh mục — không cần chọn loại giao dịch mới tổng hợp được.
    const daLuu = chungTuRepository.save.mock.calls[0][0];
    expect(daLuu[0].danhMuc.nghiepVu.ten).toBe('Kết chuyển doanh thu');
  });

  it('create lưu loại giao dịch vừa dùng làm mặc định của công ty', async () => {
    await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    expect(cauHinhRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ loaiGiaoDichMa: 'KC' }),
    );
  });

  it('create không đổi mặc định khi lô bị từ chối', async () => {
    await expect(
      service.create(
        { ...LO_CO_LOAI_GD, ngayHachToan: '2025-12-31' },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(cauHinhRepository.save).not.toHaveBeenCalled();
  });

  it('create vẫn trả kết quả ghi sổ khi lưu mặc định lỗi', async () => {
    // Chứng từ đã nằm trong sổ — ném lỗi ở bước lưu mặc định sẽ khiến kế toán tưởng
    // chưa ghi và bấm Lưu lần nữa, nhân đôi cả lô.
    cauHinhRepository.save.mockRejectedValue(new Error('mongo down'));

    const kq = await service.create(LO_CO_LOAI_GD, 'user-1', 'Bearer token');

    expect(kq.soDong).toBe(1);
  });

  it('layCauHinh trả object rỗng khi công ty chưa từng chọn', async () => {
    expect(await service.layCauHinh()).toEqual({});
  });

  it('layCauHinh trả mã đã lưu', async () => {
    cauHinhRepository.findOne.mockResolvedValue({ loaiGiaoDichMa: 'KC' });

    expect(await service.layCauHinh()).toEqual({ loaiGiaoDichMa: 'KC' });
  });

  it('luuCauHinh ghi đè bản ghi sẵn có thay vì tạo thêm', async () => {
    const banGhi = { loaiGiaoDichMa: 'CU' };
    cauHinhRepository.findOne.mockResolvedValue(banGhi);

    await service.luuCauHinh('KC');

    expect(cauHinhRepository.create).not.toHaveBeenCalled();
    expect(cauHinhRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ loaiGiaoDichMa: 'KC' }),
    );
  });

  it('create ném lỗi và không ghi sổ khi không tải được danh mục tài khoản', async () => {
    serviceClient.getTaiKhoan.mockResolvedValue({ success: false, data: undefined });

    await expect(
      service.create(
        {
          denNgay: '2026-08-31',
          ngayHachToan: '2026-08-31',
          ngayChungTu: '2026-08-31',
          dienGiai: 'x',
          dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
        },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);

    expect(chungTuRepository.save).not.toHaveBeenCalled();
  });

  it('create ném lỗi khi không còn số dư nào để kết chuyển (chặn double-submit)', async () => {
    nhatKyChungService.aggregateBalance.mockResolvedValue({ success: true, data: [] });

    await expect(
      service.create(
        {
          denNgay: '2026-08-31',
          ngayHachToan: '2026-08-31',
          ngayChungTu: '2026-08-31',
          dienGiai: 'x',
          dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
        },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(chungTuRepository.save).not.toHaveBeenCalled();
  });

  it('create ném lỗi khi maKetChuyen không khớp mã nào trong preview hiện tại', async () => {
    await expect(
      service.create(
        {
          denNgay: '2026-08-31',
          ngayHachToan: '2026-08-31',
          ngayChungTu: '2026-08-31',
          dienGiai: 'x',
          dong: [{ maKetChuyen: 'ma-khong-ton-tai', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
        },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(chungTuRepository.save).not.toHaveBeenCalled();
  });

  it('create ném lỗi khi ngày hạch toán rơi ngoài cửa sổ kết chuyển', async () => {
    // Tai nạn thật: chốt năm cũ (denNgay = 31/12/2025) nhưng để ngày hạch toán mặc
    // định là hôm nay (2026) → lô rơi vào 2026, TK 5/6/7/8 của 2025 không bao giờ sạch
    // và mỗi lần Lưu lại nhân bản toàn bộ lô vào sai năm.
    await expect(
      service.create(
        {
          denNgay: '2025-12-31',
          ngayHachToan: '2026-08-25',
          ngayChungTu: '2026-08-25',
          dienGiai: 'x',
          dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
        },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(chungTuRepository.save).not.toHaveBeenCalled();
  });

  it('create nêu rõ ngày trong thông báo lỗi ngày hạch toán ngoài cửa sổ', async () => {
    await expect(
      service.create(
        {
          denNgay: '2025-12-31',
          ngayHachToan: '2026-08-25',
          ngayChungTu: '2026-08-25',
          dienGiai: 'x',
          dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
        },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toThrow(/25\/08\/2026[\s\S]*01\/01\/2025[\s\S]*31\/12\/2025/);
  });

  it('create ném lỗi khi ngày hạch toán rơi vào năm trước ngày chốt', async () => {
    await expect(
      service.create(
        {
          denNgay: '2026-08-31',
          ngayHachToan: '2025-12-31',
          ngayChungTu: '2026-08-31',
          dienGiai: 'x',
          dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
        },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(chungTuRepository.save).not.toHaveBeenCalled();
  });

  it('create vẫn ghi bình thường khi ngày hạch toán nằm trong cửa sổ kết chuyển', async () => {
    const kq = await service.create(
      {
        denNgay: '2026-08-31',
        ngayHachToan: '2026-01-01',
        ngayChungTu: '2026-01-01',
        dienGiai: 'x',
        dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
      },
      'user-1',
      'Bearer token',
    );

    expect(kq.soDong).toBe(1);
    expect(chungTuRepository.save).toHaveBeenCalled();
  });

  it('create chấp nhận ngày hạch toán đúng bằng ngày chốt', async () => {
    await service.create(
      {
        denNgay: '2026-08-31',
        ngayHachToan: '2026-08-31',
        ngayChungTu: '2026-08-31',
        dienGiai: 'x',
        dong: [{ maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 }],
      },
      'user-1',
      'Bearer token',
    );

    expect(chungTuRepository.save).toHaveBeenCalled();
  });

  it('create từ chối khi tài khoản hạch toán không có trong danh mục tài khoản', async () => {
    // '4212 ' thừa dấu cách: BCĐKT duyệt tài khoản TỪ danh mục và khớp mã chính xác
    // nên dòng này không đóng góp vào đâu cả, BCĐKT lệch đúng bằng lợi nhuận.
    await expect(
      service.create(
        {
          denNgay: '2026-08-31',
          ngayHachToan: '2026-08-31',
          ngayChungTu: '2026-08-31',
          dienGiai: 'x',
          dong: [
            { maKetChuyen: '511-911', taiKhoanNo: '511', taiKhoanCo: '911', soTien: 100 },
            { maKetChuyen: '911-4212', taiKhoanNo: '911', taiKhoanCo: '4212 ', soTien: 100 },
          ],
        },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toThrow(/4212/);

    expect(chungTuRepository.save).not.toHaveBeenCalled();
  });

  it('create không đốt số chứng từ khi tài khoản hạch toán không có trong danh mục', async () => {
    await expect(
      service.create(
        {
          denNgay: '2026-08-31',
          ngayHachToan: '2026-08-31',
          ngayChungTu: '2026-08-31',
          dienGiai: 'x',
          dong: [{ maKetChuyen: '511-911', taiKhoanNo: '4121', taiKhoanCo: '911', soTien: 100 }],
        },
        'user-1',
        'Bearer token',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(voucherNumberService.generateVoucherNumber).not.toHaveBeenCalled();
  });

  it('remove chỉ xóa chứng từ do kết chuyển sinh ra', async () => {
    await service.remove('NVK202608/001');

    expect(chungTuRepository.delete).toHaveBeenCalledWith({
      soPhieu: 'NVK202608/001',
      nguon: 'KET_CHUYEN',
    });
  });
});
