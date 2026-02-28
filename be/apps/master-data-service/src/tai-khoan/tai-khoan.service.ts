import { PaginatedResult, PaginationQueryDto } from '@app/dto';
import { TaiKhoan } from '@app/entities';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTaiKhoanDto, UpdateTaiKhoanDto } from './dto';

@Injectable()
export class TaiKhoanService {
  constructor(
    @InjectRepository(TaiKhoan)
    private readonly taiKhoanRepository: Repository<TaiKhoan>,
  ) {}

  /**
   * Get total count using DB query
   */
  async getTotal(search?: string, nhom?: string): Promise<number> {
    const baseWhere: any = { isActive: true };
    if (nhom) {
      baseWhere.nhom = nhom;
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      return this.taiKhoanRepository.count({
        where: {
          ...baseWhere,
          $or: [
            { ma: { $regex: searchRegex } },
            { ten: { $regex: searchRegex } },
          ],
        },
      });
    }
    return this.taiKhoanRepository.count({ where: baseWhere });
  }

  async findAllPaginated(
    query: PaginationQueryDto & { nhom?: string },
  ): Promise<PaginatedResult<TaiKhoan>> {
    // Ensure page and limit are numbers
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const { search, nhom } = query;
    const skip = (page - 1) * limit;

    const baseWhere: any = { isActive: true };
    if (nhom) {
      baseWhere.nhom = nhom;
    }

    let data: TaiKhoan[];
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

      // Use findAndCount for accurate total with MongoDB
      [data, total] = await this.taiKhoanRepository.findAndCount({
        where: searchWhere,
        skip,
        take: limit,
        order: { ma: 'ASC' },
      });
    } else {
      // Use findAndCount for accurate total with MongoDB
      [data, total] = await this.taiKhoanRepository.findAndCount({
        where: baseWhere,
        skip,
        take: limit,
        order: { ma: 'ASC' },
      });
    }

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

  async findAll(): Promise<TaiKhoan[]> {
    const accounts = await this.taiKhoanRepository.find({
      where: { isActive: true },
    });
    return accounts.sort((a, b) => a.ma.localeCompare(b.ma));
  }

  async findOne(id: string): Promise<TaiKhoan> {
    const { ObjectId } = await import('mongodb');
    const taiKhoan = await this.taiKhoanRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!taiKhoan) {
      throw new NotFoundException(`TaiKhoan with ID ${id} not found`);
    }

    return taiKhoan;
  }

  async findByMa(ma: string): Promise<TaiKhoan | null> {
    return this.taiKhoanRepository.findOne({ where: { ma, isActive: true } });
  }

  async create(createDto: CreateTaiKhoanDto): Promise<TaiKhoan> {
    // Check for duplicate code
    const existing = await this.findByMa(createDto.ma);
    if (existing) {
      throw new ConflictException(
        `Account code ${createDto.ma} already exists`,
      );
    }

    const taiKhoan = this.taiKhoanRepository.create({
      ...createDto,
      isActive: true,
    });
    return this.taiKhoanRepository.save(taiKhoan);
  }

  async update(id: string, updateDto: UpdateTaiKhoanDto): Promise<TaiKhoan> {
    const taiKhoan = await this.findOne(id);

    // Check for duplicate code if changing
    if (updateDto.ma && updateDto.ma !== taiKhoan.ma) {
      const existing = await this.findByMa(updateDto.ma);
      if (existing) {
        throw new ConflictException(
          `Account code ${updateDto.ma} already exists`,
        );
      }
    }

    Object.assign(taiKhoan, updateDto);
    return this.taiKhoanRepository.save(taiKhoan);
  }

  async delete(id: string): Promise<void> {
    const taiKhoan = await this.findOne(id);
    // Soft delete
    taiKhoan.isActive = false;
    await this.taiKhoanRepository.save(taiKhoan);
  }

  async getHierarchy(): Promise<TaiKhoan[]> {
    const accounts = await this.findAll();
    // Return sorted by code for hierarchical display
    return accounts.sort((a, b) => a.ma.localeCompare(b.ma));
  }

  /**
   * Search accounts using DB query
   */
  async search(keyword: string, limit = 20): Promise<TaiKhoan[]> {
    if (!keyword) {
      return this.taiKhoanRepository.find({
        where: { isActive: true },
        take: limit,
      });
    }

    const searchRegex = new RegExp(keyword, 'i');
    return this.taiKhoanRepository.find({
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
   * Find accounts by nhom (group)
   */
  async findByNhom(nhom: string): Promise<TaiKhoan[]> {
    return this.taiKhoanRepository.find({
      where: { nhom: nhom as any, isActive: true },
    });
  }

  /**
   * Find parent accounts (capDo = 1)
   */
  async findParents(): Promise<TaiKhoan[]> {
    const parents = await this.taiKhoanRepository.find({
      where: { capDo: 1, isActive: true },
    });
    return parents.sort((a, b) => a.ma.localeCompare(b.ma));
  }

  /**
   * Find leaf accounts (accounts without children)
   * If an account has children, only show the children (lowest level)
   * If an account has no children, show the parent
   */
  async findLeafAccounts(): Promise<TaiKhoan[]> {
    const allAccounts = await this.taiKhoanRepository.find({
      where: { isActive: true },
    });

    // Get all parent IDs (accounts that have children)
    const parentIds = new Set(
      allAccounts.filter((acc) => acc.parentId).map((acc) => acc.parentId),
    );

    // Filter to only leaf accounts (accounts that are not parents)
    const leafAccounts = allAccounts.filter((acc) => !parentIds.has(acc.id));

    return leafAccounts.sort((a, b) => a.ma.localeCompare(b.ma));
  }
}
