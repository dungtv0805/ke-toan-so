import { Test, TestingModule } from '@nestjs/testing';
import { JwtGuard, RoleGuard } from '@app/auth';
import { KetChuyenController } from './ket-chuyen.controller';
import { KetChuyenService } from './ket-chuyen.service';

describe('KetChuyenController', () => {
  let controller: KetChuyenController;
  let ketChuyenService: any;

  beforeEach(async () => {
    ketChuyenService = {
      remove: jest.fn().mockResolvedValue({ deleted: 3 }),
      layCauHinh: jest.fn().mockResolvedValue({ loaiGiaoDichMa: 'KC' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KetChuyenController],
      providers: [{ provide: KetChuyenService, useValue: ketChuyenService }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RoleGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<KetChuyenController>(KetChuyenController);
  });

  it('remove lấy soPhieu từ body (POST /xoa) và truyền đúng xuống service', async () => {
    const ketQua = await controller.remove({ soPhieu: 'NVK202608/001' });

    expect(ketChuyenService.remove).toHaveBeenCalledWith('NVK202608/001');
    expect(ketQua).toEqual({ success: true, data: { deleted: 3 } });
  });

  it('GET /cau-hinh trả mã loại giao dịch mặc định của công ty', async () => {
    expect(await controller.layCauHinh()).toEqual({
      success: true,
      data: { loaiGiaoDichMa: 'KC' },
    });
  });
});
