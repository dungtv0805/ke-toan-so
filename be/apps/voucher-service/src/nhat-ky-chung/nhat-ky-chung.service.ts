import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ChungTu } from '@app/entities';
import { PaginatedResult } from '@app/dto';
import { TenantContextService } from '@app/core';
import {
  NhatKyChungQueryDto,
  NhatKyChungStats,
  NhatKyChungStatsResponse,
  CreateNhatKyChungDto,
  UpdateNhatKyChungDto,
  BatchItemDto,
  SummaryType,
  SummaryItem,
  SummaryResponse,
} from './dto';
import { buildMongoQuery, buildSummaryAggregation } from './helpers';
import { VoucherNumberService } from '../shared';

@Injectable()
export class NhatKyChungService {
  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: MongoRepository<ChungTu>,
    private readonly voucherNumberService: VoucherNumberService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async getEntries(query: NhatKyChungQueryDto): Promise<{
    success: boolean;
    data: ChungTu[];
    meta: PaginatedResult<ChungTu>['meta'];
  }> {
    const { page = 1, limit = 15, search } = query;
    const skip = (page - 1) * limit;
    const tenantId = this.tenantContext.getCurrentTenantId();

    const mongoQuery = buildMongoQuery(query, tenantId);

    const aggregationPipeline: object[] = [{ $match: mongoQuery }];

    if (search) {
      aggregationPipeline.push({
        $addFields: { score: { $meta: 'textScore' } },
      });
      aggregationPipeline.push({
        $sort: { score: -1, ngay: -1, createdAt: -1 },
      });
    } else {
      aggregationPipeline.push({
        $sort: { ngay: -1, createdAt: -1 },
      });
    }

    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limit });

    const [data, total] = await Promise.all([
      this.chungTuRepository.aggregate(aggregationPipeline).toArray(),
      this.chungTuRepository.count(mongoQuery),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data: data as ChungTu[],
      meta: { total, page, limit, totalPages },
    };
  }

  async getStats(
    query: NhatKyChungQueryDto,
  ): Promise<NhatKyChungStatsResponse> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const mongoQuery = buildMongoQuery(query, tenantId);

    const aggregationPipeline: object[] = [
      { $match: mongoQuery },
      {
        $group: {
          _id: null,
          tongSo: { $sum: 1 },
          tongPhatSinhNo: {
            $sum: {
              $cond: [{ $eq: ['$loai', 'PHIEU_THU'] }, '$soTien', 0],
            },
          },
          tongPhatSinhCo: {
            $sum: {
              $cond: [{ $eq: ['$loai', 'PHIEU_CHI'] }, '$soTien', 0],
            },
          },
        },
      },
    ];

    const result = await this.chungTuRepository
      .aggregate(aggregationPipeline)
      .toArray();

    const stats: NhatKyChungStats = result[0] || {
      tongSo: 0,
      tongPhatSinhNo: 0,
      tongPhatSinhCo: 0,
    };

    return {
      success: true,
      data: {
        tongSo: stats.tongSo,
        tongPhatSinhNo: stats.tongPhatSinhNo,
        tongPhatSinhCo: stats.tongPhatSinhCo,
      },
    };
  }

  async findById(id: string): Promise<{ success: boolean; data: ChungTu }> {
    const { ObjectId } = await import('mongodb');
    const chungTu = await this.chungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!chungTu) {
      throw new NotFoundException(`Entry with ID ${id} not found`);
    }

    return { success: true, data: chungTu };
  }

  async create(
    createDto: CreateNhatKyChungDto,
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: ChungTu }> {
    const soPhieu = await this.voucherNumberService.generateVoucherNumber(
      createDto.loai,
    );

    const chungTu = this.chungTuRepository.create({
      loai: createDto.loai,
      soTien: createDto.soTien,
      noiDung: createDto.noiDung,
      danhMuc: createDto.danhMuc,
      ghiChu: createDto.ghiChu,
      nguoiGiaoDich: createDto.nguoiGiaoDich,
      diaChi: createDto.diaChi,
      ngay: new Date(createDto.ngay),
      soPhieu,
      nguoiTaoId,
    });

    const saved = await this.chungTuRepository.save(chungTu);
    return { success: true, data: saved };
  }

  async update(
    id: string,
    updateDto: UpdateNhatKyChungDto,
  ): Promise<{ success: boolean; data: ChungTu }> {
    const { ObjectId } = await import('mongodb');
    const chungTu = await this.chungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!chungTu) {
      throw new NotFoundException(`Entry with ID ${id} not found`);
    }

    if ((chungTu as any).trangThai === 'DA_DUYET') {
      throw new ForbiddenException('Cannot modify approved entry');
    }

    if (updateDto.ngay) {
      chungTu.ngay = new Date(updateDto.ngay);
    }
    if (updateDto.soTien !== undefined) {
      chungTu.soTien = updateDto.soTien;
    }
    if (updateDto.noiDung !== undefined) {
      chungTu.noiDung = updateDto.noiDung;
    }
    if (updateDto.danhMuc !== undefined) {
      chungTu.danhMuc = updateDto.danhMuc;
    }
    if (updateDto.ghiChu !== undefined) {
      chungTu.ghiChu = updateDto.ghiChu;
    }
    if (updateDto.diaChi !== undefined) {
      chungTu.diaChi = updateDto.diaChi;
    }
    if (updateDto.nguoiGiaoDich !== undefined) {
      chungTu.nguoiGiaoDich = updateDto.nguoiGiaoDich;
    }

    const saved = await this.chungTuRepository.save(chungTu);
    return { success: true, data: saved };
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const { ObjectId } = await import('mongodb');
    const chungTu = await this.chungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!chungTu) {
      throw new NotFoundException(`Entry with ID ${id} not found`);
    }

    if ((chungTu as any).trangThai === 'DA_DUYET') {
      throw new ForbiddenException('Cannot delete approved entry');
    }

    await this.chungTuRepository.remove(chungTu);
    return { success: true, message: 'Entry deleted successfully' };
  }

  /**
   * Create multiple entries with the same soPhieu (batch create)
   */
  async createBatch(
    items: CreateNhatKyChungDto[],
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: ChungTu[] }> {
    if (items.length === 0) {
      return { success: true, data: [] };
    }

    // Generate ONE soPhieu for all items
    const soPhieu = await this.voucherNumberService.generateVoucherNumber(
      items[0].loai,
    );

    const chungTuList = items.map((item) =>
      this.chungTuRepository.create({
        loai: item.loai,
        soTien: item.soTien,
        noiDung: item.noiDung,
        danhMuc: item.danhMuc,
        ghiChu: item.ghiChu,
        nguoiGiaoDich: item.nguoiGiaoDich,
        diaChi: item.diaChi,
        ngay: new Date(item.ngay),
        soPhieu, // Same soPhieu for all
        nguoiTaoId,
      }),
    );

    const saved = await this.chungTuRepository.save(chungTuList);
    return { success: true, data: saved };
  }

  /**
   * Update all entries of a soPhieu (batch update)
   * - Items with id: UPDATE existing
   * - Items without id: CREATE new with same soPhieu
   * - Items in DB but not in request: DELETE
   */
  async updateBatch(
    soPhieu: string,
    items: BatchItemDto[],
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: ChungTu[] }> {
    // 1. Get existing items by soPhieu
    const existing = await this.chungTuRepository.find({
      where: { soPhieu },
    });

    // 2. Check if any existing item is approved
    const hasApproved = existing.some(
      (item) => (item as any).trangThai === 'DA_DUYET',
    );
    if (hasApproved) {
      throw new ForbiddenException('Cannot modify approved entries');
    }

    // 3. Separate items by operation type
    const toCreate = items.filter((item) => !item.id);
    const toUpdate = items.filter((item) => item.id);

    // 4. Find items to delete (exist in DB but not in request)
    const requestIds = new Set(toUpdate.map((item) => item.id));
    const toDelete = existing.filter(
      (item) => !requestIds.has(item._id.toString()),
    );

    const results: ChungTu[] = [];

    // 5. UPDATE existing items
    for (const item of toUpdate) {
      const existingItem = existing.find(
        (e) => e._id.toString() === item.id,
      );
      if (!existingItem) {
        // Item ID not found in this soPhieu - skip
        continue;
      }

      existingItem.loai = item.loai;
      existingItem.ngay = new Date(item.ngay);
      existingItem.soTien = item.soTien;
      existingItem.noiDung = item.noiDung;
      if (item.danhMuc !== undefined) {
        existingItem.danhMuc = item.danhMuc;
      }
      if (item.ghiChu !== undefined) {
        existingItem.ghiChu = item.ghiChu;
      }
      if (item.nguoiGiaoDich !== undefined) {
        existingItem.nguoiGiaoDich = item.nguoiGiaoDich;
      }
      if (item.diaChi !== undefined) {
        existingItem.diaChi = item.diaChi;
      }

      const saved = await this.chungTuRepository.save(existingItem);
      results.push(saved);
    }

    // 6. CREATE new items
    for (const item of toCreate) {
      const chungTu = this.chungTuRepository.create({
        loai: item.loai,
        soTien: item.soTien,
        noiDung: item.noiDung,
        danhMuc: item.danhMuc,
        ghiChu: item.ghiChu,
        nguoiGiaoDich: item.nguoiGiaoDich,
        diaChi: item.diaChi,
        ngay: new Date(item.ngay),
        soPhieu, // Same soPhieu
        nguoiTaoId,
      });
      const saved = await this.chungTuRepository.save(chungTu);
      results.push(saved);
    }

    // 7. DELETE removed items
    for (const item of toDelete) {
      await this.chungTuRepository.remove(item);
    }

    return { success: true, data: results };
  }

  /**
   * Get summary data grouped by specified type
   */
  async getSummary(
    type: SummaryType,
    query: NhatKyChungQueryDto,
  ): Promise<SummaryResponse> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    const mongoQuery = buildMongoQuery(query, tenantId);
    const aggregationPipeline = buildSummaryAggregation(type, mongoQuery);

    const result = await this.chungTuRepository
      .aggregate(aggregationPipeline)
      .toArray();

    return {
      success: true,
      data: result as SummaryItem[],
    };
  }
}
