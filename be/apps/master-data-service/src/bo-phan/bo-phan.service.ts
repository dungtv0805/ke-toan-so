import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BoPhan } from '@app/entities';
import { CreateBoPhanDto, UpdateBoPhanDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class BoPhanService {
  constructor(
    @InjectRepository(BoPhan)
    private readonly boPhanRepository: Repository<BoPhan>,
  ) {}

  /**
   * Get total count using DB query
   */
  async getTotal(search?: string): Promise<number> {
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.boPhanRepository.count({
        where: {
          isActive: true,
          $or: [
            { ma: { $regex: searchRegex } },
            { ten: { $regex: searchRegex } },
          ],
        } as any,
      });
    }
    return this.boPhanRepository.count({ where: { isActive: true } });
  }

  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<BoPhan>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    // Get all items first, then filter and paginate (MongoDB count workaround)
    const allItems = await this.boPhanRepository.find();
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

  async findAll(): Promise<BoPhan[]> {
    return this.boPhanRepository.find({ where: { isActive: true } });
  }

  async findOne(id: string): Promise<BoPhan> {
    const { ObjectId } = await import('mongodb');
    const boPhan = await this.boPhanRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!boPhan) {
      throw new NotFoundException(`BoPhan with ID ${id} not found`);
    }

    return boPhan;
  }

  async findByMa(ma: string): Promise<BoPhan | null> {
    return this.boPhanRepository.findOne({ where: { ma } });
  }

  async create(createDto: CreateBoPhanDto): Promise<BoPhan> {
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(
        `Department code ${createDto.ma} already exists`,
      );
    }

    const boPhan = this.boPhanRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.boPhanRepository.save(boPhan);
  }

  async update(id: string, updateDto: UpdateBoPhanDto): Promise<BoPhan> {
    const boPhan = await this.findOne(id);

    if (updateDto.ma && updateDto.ma !== boPhan.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(
          `Department code ${updateDto.ma} already exists`,
        );
      }
    }

    Object.assign(boPhan, updateDto);
    return this.boPhanRepository.save(boPhan);
  }

  async delete(id: string): Promise<void> {
    const boPhan = await this.findOne(id);
    boPhan.isActive = false;
    await this.boPhanRepository.save(boPhan);
  }

  /**
   * Search departments by keyword using DB query
   */
  async search(keyword: string, limit = 20): Promise<BoPhan[]> {
    if (!keyword) {
      return this.boPhanRepository.find({
        where: { isActive: true },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.boPhanRepository.find({
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

  /**
   * Check if department code already exists
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
    tongBoPhan: number;
  }> {
    const allItems = await this.boPhanRepository.find();
    const activeItems = allItems.filter((item) => item.isActive !== false);

    return {
      tongBoPhan: activeItems.length,
    };
  }
}
