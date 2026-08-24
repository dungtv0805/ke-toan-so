import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import { PaginatedResult, PaginationQueryDto } from '@app/dto';
import { NhomDongTien } from '@app/entities';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { CreateNhomDongTienDto, UpdateNhomDongTienDto } from './dto';

@Injectable()
export class NhomDongTienService {
  constructor(
    @InjectRepository(NhomDongTien)
    private readonly nhomDongTienRepository: Repository<NhomDongTien>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<NhomDongTien>> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { search } = query;
    const skip = (page - 1) * limit;

    const baseWhere: any = { isActive: true, ...this.getTenantFilter() };

    let data: NhomDongTien[];
    let total: number;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      const searchWhere = {
        ...baseWhere,
        $or: [
          { ma: { $regex: searchRegex } },
          { ten: { $regex: searchRegex } },
        ],
      };
      [data, total] = await this.nhomDongTienRepository.findAndCount({
        where: searchWhere,
        skip,
        take: limit,
      });
    } else {
      [data, total] = await this.nhomDongTienRepository.findAndCount({
        where: baseWhere,
        skip,
        take: limit,
      });
    }

    data.sort((a, b) => a.ma.localeCompare(b.ma));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(): Promise<NhomDongTien[]> {
    const data = await this.nhomDongTienRepository.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
    return data.sort((a, b) => a.ma.localeCompare(b.ma));
  }

  async findOne(id: string): Promise<NhomDongTien> {
    const { ObjectId } = await import('mongodb');
    const nhomDongTien = await this.nhomDongTienRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });
    if (!nhomDongTien) {
      throw new NotFoundException(`Không tìm thấy NhomDongTien với ID ${id}`);
    }
    return nhomDongTien;
  }

  async findByMa(ma: string): Promise<NhomDongTien | null> {
    return this.nhomDongTienRepository.findOne({
      where: { ma, isActive: true, ...this.getTenantFilter() },
    });
  }

  async create(createDto: CreateNhomDongTienDto): Promise<NhomDongTien> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã ${createDto.ma} đã tồn tại`);
    }
    const nhomDongTien = this.nhomDongTienRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.nhomDongTienRepository.save(nhomDongTien);
  }

  async update(
    id: string,
    updateDto: UpdateNhomDongTienDto,
  ): Promise<NhomDongTien> {
    const nhomDongTien = await this.findOne(id);
    if (updateDto.ma && updateDto.ma !== nhomDongTien.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã ${updateDto.ma} đã tồn tại`);
      }
    }
    Object.assign(nhomDongTien, sanitizeUpdateDto(updateDto));
    return this.nhomDongTienRepository.save(nhomDongTien);
  }

  async delete(id: string): Promise<void> {
    const nhomDongTien = await this.findOne(id);
    nhomDongTien.isActive = false;
    await this.nhomDongTienRepository.save(nhomDongTien);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.nhomDongTienRepository as unknown as MongoRepository<NhomDongTien>,
      ids,
    );
  }

  async getStats(): Promise<{ tongNhomDongTien: number }> {
    const all = await this.nhomDongTienRepository.find({
      where: { isActive: true, ...this.getTenantFilter() },
    });
    return { tongNhomDongTien: all.length };
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing.id === excludeId) return false;
    return true;
  }
}
