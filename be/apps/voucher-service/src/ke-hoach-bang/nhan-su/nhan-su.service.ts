import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { KeHoachNhanSu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { CreateKeHoachNhanSuDto, UpdateKeHoachNhanSuDto } from './dto';

/**
 * CRUD bảng kế hoạch nhân sự. Mỗi dòng là một chức vụ trong một bộ phận,
 * trong một năm. CỘNG, quý, %, hàng bộ phận, hàng tổng do phía hiển thị tính.
 */
@Injectable()
export class KeHoachNhanSuService {
  constructor(
    @InjectRepository(KeHoachNhanSu)
    private readonly repo: MongoRepository<KeHoachNhanSu>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private theoTenant(where: Record<string, unknown>): Record<string, unknown> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) where.tenantId = tenantId;
    return where;
  }

  /** Vài chục dòng mỗi năm nên trả hết, không phân trang. */
  async layTheoNam(nam: number): Promise<KeHoachNhanSu[]> {
    return this.repo.find({
      where: this.theoTenant({ nam }),
      order: { 'boPhan.ma': 'ASC', maViTri: 'ASC' } as never,
    });
  }

  async taoMoi(
    dto: CreateKeHoachNhanSuDto,
    nguoiTaoId: string,
  ): Promise<KeHoachNhanSu> {
    // Trùng tính theo cả bộ phận: cùng mã vị trí ở hai bộ phận khác nhau là hợp lệ.
    const trung = await this.repo.countDocuments(
      this.theoTenant({
        nam: dto.nam,
        'boPhan.id': dto.boPhan.id,
        maViTri: dto.maViTri,
      }),
    );
    if (trung > 0) {
      throw new BadRequestException(
        `Mã vị trí ${dto.maViTri} đã có trong bộ phận ${dto.boPhan.ten} năm ${dto.nam}`,
      );
    }

    const dong = this.repo.create({
      ...dto,
      nguoiTaoId,
      tenantId: this.tenantContext.getCurrentTenantId(),
    });
    return this.repo.save(dong);
  }

  async capNhat(
    id: string,
    dto: UpdateKeHoachNhanSuDto,
  ): Promise<KeHoachNhanSu> {
    const dong = await this.timTheoId(id);
    Object.assign(dong, dto);
    return this.repo.save(dong);
  }

  async xoa(id: string): Promise<void> {
    const dong = await this.timTheoId(id);
    await this.repo.deleteOne({ _id: dong._id });
  }

  private async timTheoId(id: string): Promise<KeHoachNhanSu> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Mã dòng không hợp lệ');
    }
    const dong = await this.repo.findOne({
      where: this.theoTenant({ _id: new ObjectId(id) }),
    });
    if (!dong) {
      throw new NotFoundException('Không tìm thấy dòng kế hoạch nhân sự');
    }
    return dong;
  }
}
