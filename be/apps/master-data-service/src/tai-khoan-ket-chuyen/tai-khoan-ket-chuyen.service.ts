import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { PaginatedResult, PaginationQueryDto } from '@app/dto';
import { TaiKhoanKetChuyen } from '@app/entities';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import {
  CreateTaiKhoanKetChuyenDto,
  UpdateTaiKhoanKetChuyenDto,
} from './dto';

/** Thứ tự chạy quyết định số đúng — dòng 911 phải sau. Mã dùng làm tie-break cho ổn định. */
const theoThuTu = (a: TaiKhoanKetChuyen, b: TaiKhoanKetChuyen) =>
  (a.thuTu ?? 0) - (b.thuTu ?? 0) || a.ma.localeCompare(b.ma);

@Injectable()
export class TaiKhoanKetChuyenService {
  constructor(
    @InjectRepository(TaiKhoanKetChuyen)
    private readonly repository: Repository<TaiKhoanKetChuyen>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<TaiKhoanKetChuyen>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { search } = query;
    const skip = (page - 1) * limit;

    const baseWhere: any = { isActive: true, ...this.getTenantFilter() };
    const where = search
      ? {
          ...baseWhere,
          $or: [
            { ma: { $regex: new RegExp(search, 'i') } },
            { taiKhoanTu: { $regex: new RegExp(search, 'i') } },
            { taiKhoanDen: { $regex: new RegExp(search, 'i') } },
          ],
        }
      : baseWhere;

    const [data, total] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
    });

    data.sort(theoThuTu);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAll(): Promise<TaiKhoanKetChuyen[]> {
    const data = await this.repository.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
    return data.sort(theoThuTu);
  }

  async findOne(id: string): Promise<TaiKhoanKetChuyen> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!item) {
      throw new NotFoundException(`Không tìm thấy tài khoản kết chuyển với ID ${id}`);
    }
    return item;
  }

  async findByMa(ma: string): Promise<TaiKhoanKetChuyen | null> {
    return this.repository.findOne({
      where: { ma, isActive: true, ...this.getTenantFilter() },
    });
  }

  private kiemTraCapTaiKhoan(tu?: string, den?: string) {
    if (tu && den && tu === den) {
      throw new BadRequestException(
        'Kết chuyển từ và Kết chuyển đến không được trùng nhau',
      );
    }
  }

  async create(
    createDto: CreateTaiKhoanKetChuyenDto,
  ): Promise<TaiKhoanKetChuyen> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã kết chuyển ${createDto.ma} đã tồn tại`);
    }
    this.kiemTraCapTaiKhoan(createDto.taiKhoanTu, createDto.taiKhoanDen);

    const item = this.repository.create({
      ...createDto,
      loai: createDto.loai ?? 'XAC_DINH_KQKD',
      isActive: true,
    });
    return this.repository.save(item);
  }

  async update(
    id: string,
    updateDto: UpdateTaiKhoanKetChuyenDto,
  ): Promise<TaiKhoanKetChuyen> {
    const item = await this.findOne(id);
    if (updateDto.ma && updateDto.ma !== item.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã kết chuyển ${updateDto.ma} đã tồn tại`);
      }
    }
    this.kiemTraCapTaiKhoan(
      updateDto.taiKhoanTu ?? item.taiKhoanTu,
      updateDto.taiKhoanDen ?? item.taiKhoanDen,
    );

    Object.assign(item, sanitizeUpdateDto(updateDto));
    return this.repository.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repository.save(item);
  }

  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.repository as unknown as MongoRepository<TaiKhoanKetChuyen>,
      ids,
    );
  }

  async getStats(): Promise<{ tongTaiKhoanKetChuyen: number }> {
    const all = await this.repository.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
    return { tongTaiKhoanKetChuyen: all.length };
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing.id === excludeId) return false;
    return true;
  }
}
