import {
  sanitizeUpdateDto,
  softDeleteBatch,
  TenantContextService,
  type SoftDeleteBatchResult,
} from '@app/core';
import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository, Repository } from 'typeorm';
import { NhomSanPham } from '@app/entities';
import { CreateNhomSanPhamDto, UpdateNhomSanPhamDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class NhomSanPhamService {
  constructor(
    @InjectRepository(NhomSanPham)
    private readonly nhomSanPhamRepository: Repository<NhomSanPham>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.nhomSanPhamRepository.count({
        where: {
          isActive: true,
          ...this.getTenantFilter(),
          $or: [
            { ma: { $regex: searchRegex } },
            { ten: { $regex: searchRegex } },
          ],
        } as any,
      });
    }
    return this.nhomSanPhamRepository.count({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<NhomSanPham>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.nhomSanPhamRepository.find({ where: this.getTenantFilter() as any });
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.ma.toLowerCase().includes(searchLower) ||
          item.ten.toLowerCase().includes(searchLower),
      );
    }

    const total = filteredItems.length;
    const data = filteredItems.slice(skip, skip + limit);

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

  async findAll(): Promise<NhomSanPham[]> {
    return this.nhomSanPhamRepository.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<NhomSanPham> {
    const { ObjectId } = await import('mongodb');
    const nhomSanPham = await this.nhomSanPhamRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!nhomSanPham) {
      throw new NotFoundException(`Không tìm thấy NhomSanPham với ID ${id}`);
    }

    return nhomSanPham;
  }

  async findByMa(ma: string): Promise<NhomSanPham | null> {
    return this.nhomSanPhamRepository.findOne({ where: { ma, isActive: true, ...this.getTenantFilter() } });
  }

  async create(createDto: CreateNhomSanPhamDto): Promise<NhomSanPham> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã nhóm vật tư ${createDto.ma} đã tồn tại`);
    }

    const nhomSanPham = this.nhomSanPhamRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.nhomSanPhamRepository.save(nhomSanPham);
  }

  async update(id: string, updateDto: UpdateNhomSanPhamDto): Promise<NhomSanPham> {
    const nhomSanPham = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== nhomSanPham.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã nhóm vật tư ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(nhomSanPham, sanitizeUpdateDto(updateDto));
    return this.nhomSanPhamRepository.save(nhomSanPham);
  }

  async delete(id: string): Promise<void> {
    const nhomSanPham = await this.findOne(id);
    nhomSanPham.isActive = false;
    await this.nhomSanPhamRepository.save(nhomSanPham);
  }

  /** Xóa mềm hàng loạt (checkbox chọn dòng trên bảng). Repository tự lọc theo tenant. */
  async deleteBatch(ids: string[]): Promise<SoftDeleteBatchResult> {
    return softDeleteBatch(
      this.nhomSanPhamRepository as unknown as MongoRepository<NhomSanPham>,
      ids,
    );
  }

  async search(keyword: string, limit = 20): Promise<NhomSanPham[]> {
    if (!keyword) {
      return this.nhomSanPhamRepository.find({
        where: { isActive: true, ...this.getTenantFilter() },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.nhomSanPhamRepository.find({
      where: {
        isActive: true,
        ...this.getTenantFilter(),
        $or: [
          { ma: { $regex: searchRegex } },
          { ten: { $regex: searchRegex } },
        ],
      } as any,
      take: limit,
    });
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  async getStats(): Promise<{ tong: number }> {
    const allItems = await this.nhomSanPhamRepository.find({ where: this.getTenantFilter() as any });
    const activeItems = allItems.filter((item) => item.isActive !== false);
    return { tong: activeItems.length };
  }
}
