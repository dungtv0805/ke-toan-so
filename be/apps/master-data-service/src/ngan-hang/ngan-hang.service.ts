import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NganHang } from '@app/entities';
import { CreateNganHangDto, UpdateNganHangDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class NganHangService {
  constructor(
    @InjectRepository(NganHang)
    private readonly nganHangRepository: Repository<NganHang>,
  ) {}

  /**
   * Get total count using DB query
   */
  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.nganHangRepository.count({
        where: {
          isActive: true,
          $or: [
            { ma: { $regex: searchRegex } },
            { ten: { $regex: searchRegex } },
          ],
        } as any,
      });
    }
    return this.nganHangRepository.count({ where: { isActive: true } });
  }

  async findAllPaginated(
    query: PaginationQueryDto & { loai?: string },
  ): Promise<PaginatedResult<NganHang>> {
    const { page = 1, limit = 10, search, loai } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate (MongoDB count workaround)
    const allItems = await this.nganHangRepository.find();
    let filteredItems = allItems.filter((item) => item.isActive !== false);

    if (loai) {
      filteredItems = filteredItems.filter((item) => item.loai === loai);
    }

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

  /**
   * Search banks using DB query
   */
  async search(keyword: string, limit = 20): Promise<NganHang[]> {
    if (!keyword) {
      return this.nganHangRepository.find({
        where: { isActive: true },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.nganHangRepository.find({
      where: {
        isActive: true,
        $or: [
          { ma: { $regex: searchRegex } },
          { ten: { $regex: searchRegex } },
        ],
      } as any,
      take: limit,
    });
  }

  async findAll(): Promise<NganHang[]> {
    return this.nganHangRepository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<NganHang> {
    const { ObjectId } = await import('mongodb');
    const nganHang = await this.nganHangRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!nganHang) {
      throw new NotFoundException(`NganHang with ID ${id} not found`);
    }

    return nganHang;
  }

  async findByMa(ma: string): Promise<NganHang | null> {
    return this.nganHangRepository.findOne({ where: { ma } });
  }

  async create(createDto: CreateNganHangDto): Promise<NganHang> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Bank code ${createDto.ma} already exists`);
    }

    const nganHang = this.nganHangRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.nganHangRepository.save(nganHang);
  }

  async update(id: string, updateDto: UpdateNganHangDto): Promise<NganHang> {
    const nganHang = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== nganHang.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Bank code ${updateDto.ma} already exists`);
      }
    }

    Object.assign(nganHang, updateDto);
    return this.nganHangRepository.save(nganHang);
  }

  async delete(id: string): Promise<void> {
    const nganHang = await this.findOne(id);
    nganHang.isActive = false;
    await this.nganHangRepository.save(nganHang);
  }

  /**
   * Check if bank code already exists
   */
  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  /**
   * Get statistics using filter (MongoDB count workaround)
   */
  async getStats(): Promise<{
    tongNganHang: number;
    nganHang: number;
    tienMat: number;
  }> {
    const allItems = await this.nganHangRepository.find();
    const activeItems = allItems.filter((item) => item.isActive !== false);

    const tongNganHang = activeItems.length;
    const nganHang = activeItems.filter(
      (item) => item.loai === 'NGAN_HANG',
    ).length;
    const tienMat = activeItems.filter(
      (item) => item.loai === 'TIEN_MAT',
    ).length;

    return {
      tongNganHang,
      nganHang,
      tienMat,
    };
  }
}
