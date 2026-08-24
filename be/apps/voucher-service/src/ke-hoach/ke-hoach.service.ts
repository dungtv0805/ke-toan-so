import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { ChungTu, KeHoachDong, PHIEN_BAN_MAC_DINH } from '@app/entities';
import { PaginatedResult, KqkdKeHoachReport } from '@app/dto';
import { TenantContextService } from '@app/core';
import { ServiceClient } from '@app/service-client';
import {
  BatchUpdateKeHoachItemDto,
  CreateKeHoachDto,
  KeHoachQueryDto,
  UpdateKeHoachDto,
} from './dto';
import {
  buildDimensionPipeline,
  buildKeHoachQuery,
  buildKqkdKeHoach,
  buildSeries,
  ChiTieu,
  DanhMucTraCuuKqkd,
  DimensionRow,
  DongKeHoachKqkd,
  DongTinhSeries,
  gomSoSanh,
  KeHoachDimension,
  SeriesRow,
  SoSanhKetQua,
} from './helpers';

@Injectable()
export class KeHoachService {
  constructor(
    @InjectRepository(KeHoachDong)
    private readonly keHoachRepository: MongoRepository<KeHoachDong>,
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: MongoRepository<ChungTu>,
    private readonly tenantContext: TenantContextService,
    private readonly serviceClient: ServiceClient,
  ) {}

  private theoTenant(query: Record<string, unknown>): Record<string, unknown> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) query.tenantId = tenantId;
    return query;
  }

  async getEntries(query: KeHoachQueryDto): Promise<{
    success: boolean;
    data: KeHoachDong[];
    meta: PaginatedResult<KeHoachDong>['meta'];
  }> {
    const { page = 1, limit = 50 } = query;
    const mongoQuery = this.theoTenant(buildKeHoachQuery(query));

    const [data, total] = await Promise.all([
      this.keHoachRepository
        .aggregate([
          { $match: mongoQuery },
          { $sort: { ngay: -1, createdAt: -1 } },
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ])
        .toArray(),
      // countDocuments (native) — MongoRepository.count() diễn giải sai filter dotted path.
      this.keHoachRepository.countDocuments(mongoQuery),
    ]);

    return {
      success: true,
      data: data as KeHoachDong[],
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Danh sách phiên bản đã dùng — để thanh lọc hiển thị dạng thả xuống. */
  async getPhienBanOptions(
    loaiKeHoach?: string,
  ): Promise<{ success: boolean; data: string[] }> {
    const match = this.theoTenant(
      loaiKeHoach ? { loaiKeHoach } : {},
    ) as Record<string, unknown>;
    const rows = await this.keHoachRepository
      .aggregate([
        { $match: match },
        { $group: { _id: '$phienBan' } },
        { $match: { _id: { $nin: [null, ''] } } },
        { $sort: { _id: 1 } },
      ])
      .toArray();
    return { success: true, data: rows.map((r) => String(r._id)) };
  }

  /** Tổng hợp riêng số kế hoạch theo một chiều phân tích. */
  async getSummary(
    dimension: KeHoachDimension,
    query: KeHoachQueryDto,
  ): Promise<{ success: boolean; data: DimensionRow[] }> {
    const match = this.theoTenant(buildKeHoachQuery(query));
    const data = (await this.keHoachRepository
      .aggregate(buildDimensionPipeline(dimension, match))
      .toArray()) as DimensionRow[];
    return { success: true, data };
  }

  /**
   * So sánh Kế hoạch với Thực hiện theo một chiều. Hai nguồn (`ke_hoach` và
   * `chung_tu`) đi qua CÙNG một pipeline gom nên số liệu luôn cùng cách tính;
   * ghép hai bên theo mã.
   */
  async soSanh(
    dimension: KeHoachDimension,
    chiTieu: ChiTieu,
    query: KeHoachQueryDto,
  ): Promise<{ success: boolean; data: SoSanhKetQua }> {
    const matchKeHoach = this.theoTenant(buildKeHoachQuery(query));
    // Chứng từ thực tế không có loaiKeHoach/phienBan — bỏ hai điều kiện đó đi.
    const { loaiKeHoach: _l, phienBan: _p, ...queryThucHien } = query;
    const matchThucHien = this.theoTenant(buildKeHoachQuery(queryThucHien));

    const [keHoach, thucHien] = await Promise.all([
      this.keHoachRepository
        .aggregate(buildDimensionPipeline(dimension, matchKeHoach))
        .toArray() as Promise<DimensionRow[]>,
      this.chungTuRepository
        .aggregate(buildDimensionPipeline(dimension, matchThucHien))
        .toArray() as Promise<DimensionRow[]>,
    ]);

    return { success: true, data: gomSoSanh(keHoach, thucHien, chiTieu) };
  }

  /**
   * Chuỗi doanh thu / chi phí / lợi nhuận KẾ HOẠCH theo tháng (hoặc theo tuần khi
   * xem một tháng) — cùng shape với `pnl-series` để 3 gauge ở Tổng quan ghép thẳng.
   */
  async getSeries(
    year: number,
    month: number | undefined,
    loaiKeHoach: string,
    phienBan?: string,
  ): Promise<{ success: boolean; data: SeriesRow[] }> {
    const theoTuan = !!month && month >= 1 && month <= 12;
    const start = theoTuan ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
    const end = theoTuan
      ? new Date(year, month, 0, 23, 59, 59, 999)
      : new Date(year, 11, 31, 23, 59, 59, 999);

    const match = this.theoTenant({
      loaiKeHoach,
      ...(phienBan ? { phienBan } : {}),
      ngay: { $gte: start, $lte: end },
    });

    const rows = (await this.keHoachRepository
      .aggregate([
        { $match: match },
        { $project: { ngay: 1, soTien: 1, 'danhMuc.taiKhoanNo.ma': 1, 'danhMuc.taiKhoanCo.ma': 1 } },
      ])
      .toArray()) as unknown as DongTinhSeries[];

    return { success: true, data: buildSeries(rows, year, month) };
  }

  /**
   * Báo cáo KQKD của số KẾ HOẠCH — cùng bản đồ chỉ tiêu với báo cáo KQKD bên
   * Báo cáo tài chính, chỉ khác nguồn: đọc `ke_hoach` thay vì `chung_tu`.
   *
   * Trả về 12 số tháng cho mỗi dòng; năm, 6 tháng, quý và % do phía hiển thị cộng.
   */
  async getKqkd(
    nam: number,
    loaiKeHoach: string,
    phienBan?: string,
    authToken?: string,
  ): Promise<{ success: boolean; data: KqkdKeHoachReport }> {
    const match = this.theoTenant({
      loaiKeHoach,
      ...(phienBan ? { phienBan } : {}),
      ngay: {
        $gte: new Date(Date.UTC(nam, 0, 1)),
        $lte: new Date(Date.UTC(nam, 11, 31, 23, 59, 59, 999)),
      },
    });

    const tenantId = this.tenantContext.getCurrentTenantId();

    const [rows, danhMuc] = await Promise.all([
      this.keHoachRepository
        .aggregate([
          { $match: match },
          {
            $project: {
              ngay: 1,
              soTien: 1,
              'danhMuc.taiKhoanNo.ma': 1,
              'danhMuc.taiKhoanCo.ma': 1,
              'danhMuc.sanPham.ma': 1,
              'danhMuc.sanPham.ten': 1,
              'danhMuc.khoanMuc.ma': 1,
              'danhMuc.khoanMuc.ten': 1,
              'danhMuc.khoanMuc.nhom': 1,
            },
          },
        ])
        .toArray() as Promise<unknown[]>,
      this.napDanhMucKqkd(authToken, tenantId),
    ]);

    return {
      success: true,
      data: buildKqkdKeHoach(rows as DongKeHoachKqkd[], danhMuc, nam),
    };
  }

  /**
   * Master-data chết thì báo cáo vẫn phải ra: số ở các mục La Mã không phụ thuộc
   * danh mục, chỉ có dòng con dồn hết vào "Chưa phân nhóm".
   */
  private async napDanhMucKqkd(
    authToken?: string,
    tenantId?: string,
  ): Promise<DanhMucTraCuuKqkd> {
    const lay = async <T>(
      goi: () => Promise<{ success: boolean; data?: T[] }>,
    ): Promise<T[]> => {
      try {
        const res = await goi();
        return res.success ? res.data ?? [] : [];
      } catch {
        return [];
      }
    };

    const [sanPham, nhomSanPham, nhomKhoanMuc, khoanMuc] = await Promise.all([
      lay(() => this.serviceClient.getSanPham(authToken, tenantId)),
      lay(() => this.serviceClient.getNhomSanPham(authToken, tenantId)),
      lay(() => this.serviceClient.getNhomKhoanMuc(authToken, tenantId)),
      lay(() => this.serviceClient.getKhoanMucTatCa(authToken, tenantId)),
    ]);

    return { sanPham, nhomSanPham, nhomKhoanMuc, khoanMuc };
  }

  async findById(id: string): Promise<{ success: boolean; data: KeHoachDong }> {
    // Có tenantId thì phải khoá theo tenant: nếu không, biết id là sửa/xóa được
    // dòng kế hoạch của công ty khác.
    const dong = await this.keHoachRepository.findOne({
      where: this.theoTenant({ _id: new ObjectId(id) }) as never,
    });
    if (!dong) throw new NotFoundException(`Không tìm thấy dòng kế hoạch ${id}`);
    return { success: true, data: dong };
  }

  private dungDong(dto: CreateKeHoachDto, nguoiTaoId: string): KeHoachDong {
    return this.keHoachRepository.create({
      loaiKeHoach: dto.loaiKeHoach,
      phienBan: dto.phienBan?.trim() || PHIEN_BAN_MAC_DINH,
      ngay: new Date(dto.ngay),
      soTien: dto.soTien,
      noiDung: dto.noiDung ?? '',
      danhMuc: dto.danhMuc,
      ghiChu: dto.ghiChu,
      nguoiTaoId,
    });
  }

  async create(
    dto: CreateKeHoachDto,
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: KeHoachDong }> {
    const saved = await this.keHoachRepository.save(
      this.dungDong(dto, nguoiTaoId),
    );
    return { success: true, data: saved };
  }

  async createBatch(
    items: CreateKeHoachDto[],
    nguoiTaoId: string,
  ): Promise<{ success: boolean; data: KeHoachDong[] }> {
    const saved = await this.keHoachRepository.save(
      items.map((dto) => this.dungDong(dto, nguoiTaoId)),
    );
    return { success: true, data: saved };
  }

  private apDung(dong: KeHoachDong, dto: UpdateKeHoachDto): KeHoachDong {
    if (dto.loaiKeHoach !== undefined) dong.loaiKeHoach = dto.loaiKeHoach;
    if (dto.phienBan !== undefined)
      dong.phienBan = dto.phienBan.trim() || PHIEN_BAN_MAC_DINH;
    if (dto.ngay !== undefined) dong.ngay = new Date(dto.ngay);
    if (dto.soTien !== undefined) dong.soTien = dto.soTien;
    if (dto.noiDung !== undefined) dong.noiDung = dto.noiDung;
    if (dto.danhMuc !== undefined) dong.danhMuc = dto.danhMuc;
    if (dto.ghiChu !== undefined) dong.ghiChu = dto.ghiChu;
    return dong;
  }

  async update(
    id: string,
    dto: UpdateKeHoachDto,
  ): Promise<{ success: boolean; data: KeHoachDong }> {
    const { data } = await this.findById(id);
    const saved = await this.keHoachRepository.save(this.apDung(data, dto));
    return { success: true, data: saved };
  }

  async updateBatch(
    items: BatchUpdateKeHoachItemDto[],
  ): Promise<{ success: boolean; data: KeHoachDong[] }> {
    const saved: KeHoachDong[] = [];
    for (const item of items) {
      const { id, ...dto } = item;
      const { data } = await this.update(id, dto);
      saved.push(data);
    }
    return { success: true, data: saved };
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    await this.findById(id);
    await this.keHoachRepository.deleteOne({ _id: new ObjectId(id) });
    return { success: true, message: 'Đã xóa dòng kế hoạch' };
  }

  async removeBatch(
    ids: string[],
  ): Promise<{ success: boolean; deleted: number }> {
    if (!ids?.length) return { success: true, deleted: 0 };
    const match = this.theoTenant({
      _id: { $in: ids.map((id) => new ObjectId(id)) },
    });
    const res = await this.keHoachRepository.deleteMany(match);
    return { success: true, deleted: res.deletedCount ?? 0 };
  }
}
