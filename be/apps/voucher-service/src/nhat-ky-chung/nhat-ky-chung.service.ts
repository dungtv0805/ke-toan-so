import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ChungTu, LoaiChungTu } from '@app/entities';
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
import { buildMongoQuery, buildSummaryAggregation, mergeDoiTuongBuckets, DoiTuongBucket } from './helpers';
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
    const { page = 1, limit = 15 } = query;
    const skip = (page - 1) * limit;
    const mongoQuery = buildMongoQuery(query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

    const aggregationPipeline: object[] = [{ $match: mongoQuery }];

    aggregationPipeline.push({
      $sort: { ngay: -1, createdAt: -1 },
    });

    aggregationPipeline.push({ $skip: skip });
    aggregationPipeline.push({ $limit: limit });

    const [data, total] = await Promise.all([
      this.chungTuRepository.aggregate(aggregationPipeline).toArray(),
      // Dùng countDocuments (native Mongo) để khớp đúng filter thô của $match.
      // MongoRepository.count() diễn giải sai filter (dotted path/$or/$gte) → trả 0.
      this.chungTuRepository.countDocuments(mongoQuery),
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
    const mongoQuery = buildMongoQuery(query);
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) mongoQuery['tenantId'] = tenantId;

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

  /**
   * Aggregate account balances directly in MongoDB.
   * Returns prior period (before startDate) and current period totals per account.
   * Used by reporting-service instead of fetching all raw records.
   */
  async aggregateBalance(
    startDate: Date,
    endDate: Date,
    tenantId?: string,
  ): Promise<{
    success: boolean;
    data: Array<{
      ma: string;
      priorNo: number;
      priorCo: number;
      periodNo: number;
      periodCo: number;
    }>;
  }> {
    const pipeline: object[] = [
      {
        $match: {
          ...(tenantId ? { tenantId } : {}),
          ngay: { $lte: endDate },
        },
      },
      {
        $facet: {
          noEntries: [
            { $match: { 'danhMuc.taiKhoanNo.ma': { $exists: true, $ne: null } } },
            {
              $group: {
                _id: '$danhMuc.taiKhoanNo.ma',
                priorNo: {
                  $sum: { $cond: [{ $lt: ['$ngay', startDate] }, '$soTien', 0] },
                },
                periodNo: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$ngay', startDate] }, { $lte: ['$ngay', endDate] }] },
                      '$soTien',
                      0,
                    ],
                  },
                },
              },
            },
          ],
          coEntries: [
            { $match: { 'danhMuc.taiKhoanCo.ma': { $exists: true, $ne: null } } },
            {
              $group: {
                _id: '$danhMuc.taiKhoanCo.ma',
                priorCo: {
                  $sum: { $cond: [{ $lt: ['$ngay', startDate] }, '$soTien', 0] },
                },
                periodCo: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$ngay', startDate] }, { $lte: ['$ngay', endDate] }] },
                      '$soTien',
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ];

    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    const facet = result[0] || { noEntries: [], coEntries: [] };

    // Merge Nợ + Có per account
    const map = new Map<string, { priorNo: number; priorCo: number; periodNo: number; periodCo: number }>();

    for (const e of facet.noEntries) {
      map.set(e._id, {
        priorNo: e.priorNo,
        priorCo: 0,
        periodNo: e.periodNo,
        periodCo: 0,
      });
    }

    for (const e of facet.coEntries) {
      const existing = map.get(e._id) || { priorNo: 0, priorCo: 0, periodNo: 0, periodCo: 0 };
      existing.priorCo = e.priorCo;
      existing.periodCo = e.periodCo;
      map.set(e._id, existing);
    }

    const accounts = Array.from(map.entries())
      .map(([ma, d]) => ({ ma, ...d }))
      .sort((a, b) => a.ma.localeCompare(b.ma));

    return { success: true, data: accounts };
  }

  /**
   * Gom số dư theo (tài khoản, đối tượng) — phục vụ xổ cây đối tượng ở báo cáo.
   * Bucket doiTuongMa = null là phần chứng từ không gắn đối tượng.
   */
  async aggregateBalanceByDoiTuong(
    startDate: Date,
    endDate: Date,
    tenantId?: string,
  ): Promise<{ success: boolean; data: DoiTuongBucket[] }> {
    const pipeline: object[] = [
      {
        $match: {
          ...(tenantId ? { tenantId } : {}),
          ngay: { $lte: endDate },
        },
      },
      {
        $facet: {
          noEntries: [
            { $match: { 'danhMuc.taiKhoanNo.ma': { $exists: true, $ne: null } } },
            {
              $group: {
                _id: { ma: '$danhMuc.taiKhoanNo.ma', dt: '$danhMuc.doiTuong.ma' },
                doiTuongTen: { $first: '$danhMuc.doiTuong.ten' },
                doiTuongLoai: { $first: '$danhMuc.doiTuong.loai' },
                priorNo: {
                  $sum: { $cond: [{ $lt: ['$ngay', startDate] }, '$soTien', 0] },
                },
                periodNo: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$ngay', startDate] }, { $lte: ['$ngay', endDate] }] },
                      '$soTien',
                      0,
                    ],
                  },
                },
              },
            },
          ],
          coEntries: [
            { $match: { 'danhMuc.taiKhoanCo.ma': { $exists: true, $ne: null } } },
            // "Đối tượng có" nằm ở doiTuong2; dữ liệu cũ chỉ có doiTuong → fallback
            { $addFields: { _dtCo: { $ifNull: ['$danhMuc.doiTuong2', '$danhMuc.doiTuong'] } } },
            {
              $group: {
                _id: { ma: '$danhMuc.taiKhoanCo.ma', dt: '$_dtCo.ma' },
                doiTuongTen: { $first: '$_dtCo.ten' },
                doiTuongLoai: { $first: '$_dtCo.loai' },
                priorCo: {
                  $sum: { $cond: [{ $lt: ['$ngay', startDate] }, '$soTien', 0] },
                },
                periodCo: {
                  $sum: {
                    $cond: [
                      { $and: [{ $gte: ['$ngay', startDate] }, { $lte: ['$ngay', endDate] }] },
                      '$soTien',
                      0,
                    ],
                  },
                },
              },
            },
          ],
        },
      },
    ];

    const result = await this.chungTuRepository.aggregate(pipeline).toArray();
    const facet = result[0] || { noEntries: [], coEntries: [] };
    const data = mergeDoiTuongBuckets(facet.noEntries, facet.coEntries);
    data.sort((a, b) =>
      a.ma.localeCompare(b.ma) || (a.doiTuongMa ?? '').localeCompare(b.doiTuongMa ?? ''),
    );
    return { success: true, data };
  }

  async findById(id: string): Promise<{ success: boolean; data: ChungTu }> {
    const { ObjectId } = await import('mongodb');
    const chungTu = await this.chungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!chungTu) {
      throw new NotFoundException(`Không tìm thấy bút toán với ID ${id}`);
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
      throw new NotFoundException(`Không tìm thấy bút toán với ID ${id}`);
    }

    if ((chungTu as any).trangThai === 'DA_DUYET') {
      throw new ForbiddenException('Không thể sửa bút toán đã duyệt');
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
      throw new NotFoundException(`Không tìm thấy bút toán với ID ${id}`);
    }

    if ((chungTu as any).trangThai === 'DA_DUYET') {
      throw new ForbiddenException('Không thể xóa bút toán đã duyệt');
    }

    await this.chungTuRepository.remove(chungTu);
    return { success: true, message: 'Xóa bút toán thành công' };
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
   * Import: mỗi item là 1 chứng từ độc lập (số phiếu riêng).
   * Gom theo loai, đặt trước dải số mỗi loại, lưu 1 lần.
   */
  async importEntries(
    items: CreateNhatKyChungDto[],
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: ChungTu[] }> {
    if (items.length === 0) {
      return { success: true, data: [] };
    }

    // Gom index theo loai
    const indicesByLoai = new Map<LoaiChungTu, number[]>();
    items.forEach((item, idx) => {
      const list = indicesByLoai.get(item.loai) ?? [];
      list.push(idx);
      indicesByLoai.set(item.loai, list);
    });

    // Đặt trước dải số phiếu cho từng loai, gán theo đúng index gốc
    const soPhieuByIndex: string[] = new Array(items.length);
    for (const [loai, indices] of indicesByLoai) {
      const numbers = await this.voucherNumberService.generateVoucherNumbers(
        loai,
        indices.length,
      );
      indices.forEach((origIdx, i) => {
        soPhieuByIndex[origIdx] = numbers[i];
      });
    }

    const chungTuList = items.map((item, idx) =>
      this.chungTuRepository.create({
        loai: item.loai,
        soTien: item.soTien,
        noiDung: item.noiDung,
        danhMuc: item.danhMuc,
        ghiChu: item.ghiChu,
        nguoiGiaoDich: item.nguoiGiaoDich,
        diaChi: item.diaChi,
        ngay: new Date(item.ngay),
        soPhieu: soPhieuByIndex[idx],
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
      throw new ForbiddenException('Không thể sửa các bút toán đã duyệt');
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
    const mongoQuery = buildMongoQuery(query);
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
