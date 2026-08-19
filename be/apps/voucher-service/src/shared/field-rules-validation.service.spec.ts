import { BadRequestException } from '@nestjs/common';
import { FieldRulesValidationService } from './field-rules-validation.service';
import { ServiceClient } from '@app/service-client';

describe('FieldRulesValidationService', () => {
  const makeService = (accounts: unknown, success = true) => {
    const serviceClient = {
      get: jest.fn().mockResolvedValue({ success, data: accounts }),
    } as unknown as ServiceClient;
    return { service: new FieldRulesValidationService(serviceClient), serviceClient };
  };

  const accounts = [
    { ma: '112', fieldRules: { duAn: 'BAT_BUOC', doi: 'CANH_BAO', doiTuong: 'BAT_BUOC' } },
    { ma: '131', fieldRules: { duAn: 'CANH_BAO' } },
    { ma: '511' },
    { ma: '1121', fieldRules: { soTaiKhoanNganHang: 'BAT_BUOC' } },
    { ma: '3387', fieldRules: { hopDong: 'BAT_BUOC' } },
  ];

  it('thiếu trường BAT_BUOC → BadRequestException', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '112' }, taiKhoanCo: { ma: '511' } } }] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('đủ trường BAT_BUOC → pass (CANH_BAO không chặn)', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '112' },
              taiKhoanCo: { ma: '511' },
              doiTuong: { ma: 'VCB01' },
              duAn: { ma: 'DA01' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).resolves.toBeUndefined();
  });

  it('rule doiTuong bên Có kiểm doiTuong2', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '511' },
              taiKhoanCo: { ma: '112' },
              duAn: { ma: 'DA01' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Đối tượng/);
  });

  it('rule soTaiKhoanNganHang: đối tượng thiếu số TK → BadRequestException', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '1121' },
              taiKhoanCo: { ma: '511' },
              doiTuong: { ma: 'VCB01' }, // có đối tượng nhưng không có soTaiKhoan
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Số tài khoản ngân hàng/);
  });

  it('rule soTaiKhoanNganHang: đối tượng có số TK → pass', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '1121' },
              taiKhoanCo: { ma: '511' },
              doiTuong: { ma: 'VCB01', soTaiKhoan: '0123456789' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).resolves.toBeUndefined();
  });

  it('rule soTaiKhoanNganHang: 1121 bên Có kiểm doiTuong2', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '511' },
              taiKhoanCo: { ma: '1121' },
              doiTuong2: { ma: 'VCB01', soTaiKhoan: '  ' }, // chỉ khoảng trắng → coi như trống
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Số tài khoản ngân hàng/);
  });

  it('rule hopDong: dòng không gắn hợp đồng → BadRequestException', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '3387' }, taiKhoanCo: { ma: '511' } } }] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Hợp đồng/);
  });

  it('rule hopDong: snapshot chỉ có soHopDong (không có ma) → pass', async () => {
    const { service } = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '3387' },
              taiKhoanCo: { ma: '511' },
              hopDong: { soHopDong: 'DH03', tenCongTrinh: 'Business in the Box' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).resolves.toBeUndefined();
  });

  it('master-data không phản hồi → bỏ qua, không chặn', async () => {
    const { service } = makeService(null, false);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '112' }, taiKhoanCo: { ma: '511' } } }] as never,
      ),
    ).resolves.toBeUndefined();
  });

  it('item không có danhMuc → bỏ qua item đó', async () => {
    const { service } = makeService(accounts);
    await expect(service.validateItems([{}] as never, 'Bearer x')).resolves.toBeUndefined();
  });
});

describe('FieldRulesValidationService — nhóm khoản mục & loại chi phí', () => {
  const makeService = (accounts: unknown) => {
    const serviceClient = {
      get: jest.fn().mockResolvedValue({ success: true, data: accounts }),
    } as unknown as ServiceClient;
    return new FieldRulesValidationService(serviceClient);
  };

  const accounts = [
    { ma: '334', fieldRules: { nhomKhoanMuc: 'BAT_BUOC', loaiChiPhi: 'BAT_BUOC' } },
    { ma: '111' },
  ];

  it('khoản mục có nhóm → coi như đã nhập nhóm khoản mục', async () => {
    const service = makeService(accounts);
    await expect(
      service.validateItems(
        [
          {
            danhMuc: {
              taiKhoanNo: { ma: '334' },
              taiKhoanCo: { ma: '111' },
              khoanMuc: { ma: 'KM01', nhom: 'NKM1' },
            },
          },
        ] as never,
        'Bearer x',
      ),
    ).resolves.toBeUndefined();
  });

  it('thiếu nhóm khoản mục thì báo lỗi bằng NHÃN tiếng Việt, không phải tên field', async () => {
    const service = makeService(accounts);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '334' }, taiKhoanCo: { ma: '111' } } }] as never,
        'Bearer x',
      ),
    ).rejects.toThrow(/Nhóm khoản mục/);
  });

  it('không bao giờ ném ra tên field thô trong thông báo', async () => {
    const service = makeService(accounts);
    const loi = await service
      .validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '334' }, taiKhoanCo: { ma: '111' } } }] as never,
        'Bearer x',
      )
      .catch((e: Error) => e.message);
    expect(loi).not.toMatch(/nhomKhoanMuc|loaiChiPhi/);
  });

  it('loaiChiPhi không chặn lưu vì dòng chứng từ không có trường này', async () => {
    const service = makeService([{ ma: '334', fieldRules: { loaiChiPhi: 'BAT_BUOC' } }]);
    await expect(
      service.validateItems(
        [{ danhMuc: { taiKhoanNo: { ma: '334' } } }] as never,
        'Bearer x',
      ),
    ).resolves.toBeUndefined();
  });
});
