import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NhomQuanLy } from '@app/entities';
import {
  CreateNhomQuanLyDto,
  UpdateNhomQuanLyDto,
  NhomQuanLyQueryDto,
} from './dto';
import { PaginatedResult } from '@app/dto';

@Injectable()
export class NhomQuanLyService {
  constructor(
    @InjectRepository(NhomQuanLy)
    private readonly nhomQuanLyRepository: Repository<NhomQuanLy>,
  ) {}

  async findAllPaginated(
    query: NhomQuanLyQueryDto,
  ): Promise<PaginatedResult<NhomQuanLy>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.nhomQuanLyRepository.find();
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

  async findAll(): Promise<NhomQuanLy[]> {
    const allItems = await this.nhomQuanLyRepository.find();
    return allItems.filter((item) => item.isActive !== false);
  }

  async findOne(id: string): Promise<NhomQuanLy> {
    const { ObjectId } = await import('mongodb');
    const nhomQuanLy = await this.nhomQuanLyRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!nhomQuanLy) {
      throw new NotFoundException(`NhomQuanLy with ID ${id} not found`);
    }

    return nhomQuanLy;
  }

  async findByMa(ma: string): Promise<NhomQuanLy | null> {
    return this.nhomQuanLyRepository.findOne({ where: { ma } });
  }

  async create(createDto: CreateNhomQuanLyDto): Promise<NhomQuanLy> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(`Mã ${createDto.ma} đã tồn tại`);
    }

    const nhomQuanLy = this.nhomQuanLyRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.nhomQuanLyRepository.save(nhomQuanLy);
  }

  async update(
    id: string,
    updateDto: UpdateNhomQuanLyDto,
  ): Promise<NhomQuanLy> {
    const nhomQuanLy = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== nhomQuanLy.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(`Mã ${updateDto.ma} đã tồn tại`);
      }
    }

    Object.assign(nhomQuanLy, updateDto);
    return this.nhomQuanLyRepository.save(nhomQuanLy);
  }

  async delete(id: string): Promise<void> {
    const nhomQuanLy = await this.findOne(id);
    nhomQuanLy.isActive = false;
    await this.nhomQuanLyRepository.save(nhomQuanLy);
  }

  async search(keyword: string, limit = 20): Promise<NhomQuanLy[]> {
    const allItems = await this.findAll();

    if (!keyword) {
      return allItems.slice(0, limit);
    }

    const searchLower = keyword.toLowerCase();
    return allItems
      .filter(
        (item) =>
          item.ma.toLowerCase().includes(searchLower) ||
          item.ten.toLowerCase().includes(searchLower),
      )
      .slice(0, limit);
  }

  async checkMaExists(ma: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findByMa(ma);
    if (!existing) return false;
    if (excludeId && existing._id.toString() === excludeId) return false;
    return true;
  }

  async getStats(): Promise<{ total: number }> {
    const allItems = await this.findAll();
    return { total: allItems.length };
  }
}
