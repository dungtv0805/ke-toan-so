import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoaiChungTuMaster } from '@app/entities';
import { CreateLoaiChungTuDto, UpdateLoaiChungTuDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class LoaiChungTuService {
  constructor(
    @InjectRepository(LoaiChungTuMaster)
    private readonly loaiChungTuRepository: Repository<LoaiChungTuMaster>,
  ) {}

  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.loaiChungTuRepository.count({
        where: {
          isActive: true,
          $or: [
            { ma: { $regex: searchRegex } },
            { ten: { $regex: searchRegex } },
          ],
        } as any,
      });
    }
    return this.loaiChungTuRepository.count({ where: { isActive: true } });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<LoaiChungTuMaster>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.loaiChungTuRepository.find();
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

  async search(keyword: string, limit = 20): Promise<LoaiChungTuMaster[]> {
    if (!keyword) {
      return this.loaiChungTuRepository.find({
        where: { isActive: true },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.loaiChungTuRepository.find({
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

  async findAll(): Promise<LoaiChungTuMaster[]> {
    return this.loaiChungTuRepository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<LoaiChungTuMaster> {
    const { ObjectId } = await import('mongodb');
    const loaiChungTu = await this.loaiChungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!loaiChungTu) {
      throw new NotFoundException(`LoaiChungTu with ID ${id} not found`);
    }

    return loaiChungTu;
  }

  async findByMa(ma: string): Promise<LoaiChungTuMaster | null> {
    const result = await this.loaiChungTuRepository.findOne({ where: { ma } });
    return result ?? null;
  }

  async create(createDto: CreateLoaiChungTuDto): Promise<LoaiChungTuMaster> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã ${createDto.ma} đã tồn tại`);
    }

    const loaiChungTu = this.loaiChungTuRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.loaiChungTuRepository.save(loaiChungTu);
  }

  async update(
    id: string,
    updateDto: UpdateLoaiChungTuDto,
  ): Promise<LoaiChungTuMaster> {
    const loaiChungTu = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== loaiChungTu.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(loaiChungTu, updateDto);
    return this.loaiChungTuRepository.save(loaiChungTu);
  }

  async delete(id: string): Promise<void> {
    const loaiChungTu = await this.findOne(id);
    loaiChungTu.isActive = false;
    await this.loaiChungTuRepository.save(loaiChungTu);
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }
}
