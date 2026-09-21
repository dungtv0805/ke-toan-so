import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { KhoaSo, KhoaSoCauHinh } from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  CreateKhoaSoDto,
  KhoaSoCauHinhDto,
  KiemTraKhoaSoDto,
  KiemTraKhoaSoResponse,
  KhoaSoQueryDto,
} from '@app/dto';

@Injectable()
export class KhoaSoService {
  constructor(
    @InjectRepository(KhoaSo)
    private readonly khoaSoRepository: MongoRepository<KhoaSo>,
    @InjectRepository(KhoaSoCauHinh)
    private readonly cauHinhRepository: MongoRepository<KhoaSoCauHinh>,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getCauHinh(): Promise<KhoaSoCauHinh | null> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return this.cauHinhRepository.findOne({ where: { tenantId } });
  }

  async saveCauHinh(dto: KhoaSoCauHinhDto): Promise<KhoaSoCauHinh> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    let cauHinh = await this.cauHinhRepository.findOne({ where: { tenantId } });

    if (cauHinh) {
      cauHinh.chiNhanhId = dto.chiNhanhId;
      cauHinh.kyKhoaSo = dto.kyKhoaSo;
      cauHinh.gioThucHien = dto.gioThucHien;
      cauHinh.isActive = dto.isActive;
    } else {
      cauHinh = this.cauHinhRepository.create({
        ...dto,
        tenantId,
      });
    }

    return this.cauHinhRepository.save(cauHinh);
  }

  async getList(query: KhoaSoQueryDto) {
    const { page = 1, limit = 20, loaiChungTuMa, chiNhanhId } = query;
    const tenantId = this.tenantContext.getCurrentTenantId();

    const where: Record<string, unknown> = { tenantId };
    if (loaiChungTuMa) where.loaiChungTuMa = loaiChungTuMa;
    if (chiNhanhId) where.chiNhanhId = chiNhanhId;

    const [data, total] = await this.khoaSoRepository.findAndCount({
      where,
      order: { ngayKhoaSo: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(dto: CreateKhoaSoDto, nguoiTaoId: string): Promise<KhoaSo> {
    const tenantId = this.tenantContext.getCurrentTenantId();

    const khoaSo = this.khoaSoRepository.create({
      ...dto,
      nguon: 'THU_CONG',
      nguoiTaoId,
      tenantId,
    });

    return this.khoaSoRepository.save(khoaSo);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const khoaSo = await this.khoaSoRepository.findOne({
      where: { _id: new ObjectId(id), tenantId },
    });

    if (!khoaSo) {
      throw new NotFoundException('Không tìm thấy bản ghi khóa sổ');
    }

    await this.khoaSoRepository.delete({ _id: new ObjectId(id) });
    return { success: true };
  }

  async kiemTra(dto: KiemTraKhoaSoDto): Promise<KiemTraKhoaSoResponse> {
    const tenantId = this.tenantContext.getCurrentTenantId();

    // Tìm bản ghi khóa sổ áp dụng cho chứng từ này
    const khoaSoList = await this.khoaSoRepository.find({
      where: {
        tenantId,
        ngayKhoaSo: { $gte: dto.ngayChungTu } as unknown,
      },
    });

    for (const khoaSo of khoaSoList) {
      // Kiểm tra loại chứng từ
      if (khoaSo.loaiChungTuMa && khoaSo.loaiChungTuMa !== dto.loaiChungTuMa) {
        continue;
      }

      // Kiểm tra chi nhánh
      if (khoaSo.chiNhanhId && khoaSo.chiNhanhId !== dto.chiNhanhId) {
        continue;
      }

      // Kiểm tra người dùng
      if (khoaSo.nguoiDungBiKhoa === null || khoaSo.nguoiDungBiKhoa === undefined) {
        // Tất cả bị khóa
        return {
          biKhoa: true,
          lyDo: `Sổ đã khóa đến ngày ${khoaSo.ngayKhoaSo.toLocaleDateString('vi-VN')}`,
          khoaSoId: khoaSo.id,
        };
      }

      if (khoaSo.nguoiDungBiKhoa.includes(dto.userId)) {
        return {
          biKhoa: true,
          lyDo: `Sổ đã khóa đến ngày ${khoaSo.ngayKhoaSo.toLocaleDateString('vi-VN')}`,
          khoaSoId: khoaSo.id,
        };
      }
    }

    return { biKhoa: false };
  }
}
