import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { ChungTu, LoaiChungTu } from '@app/entities';
import { CreateChungTuDto, UpdateChungTuDto } from '../dto';
import { VoucherNumberService } from '../shared';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

/**
 * TODO: Các API cần thêm lại sau khi refactor:
 *
 * 1. submitForApproval(id) - NHAP → CHO_DUYET
 * 2. approve(id, nguoiDuyetId) - CHO_DUYET → DA_DUYET
 * 3. reject(id, nguoiDuyetId, rejectDto) - CHO_DUYET → TU_CHOI
 * 4. getPhieuThuStats() - Thống kê phiếu thu
 * 5. getPhieuChiStats() - Thống kê phiếu chi
 * 6. getNhatKyChungStats() - Thống kê nhật ký chung
 * 7. getSummaryByAccount() - Tổng hợp theo tài khoản
 * 8. getSummaryByTeam() - Tổng hợp theo đội
 * 9. getSummaryByEmployee() - Tổng hợp theo nhân viên
 * 10. getSummaryByProject() - Tổng hợp theo dự án
 * 11. getSummaryByChuDauTu() - Tổng hợp theo chủ đầu tư
 * 12. getSummaryBySanPham() - Tổng hợp theo sản phẩm
 * 13. getSummaryByDongTien() - Tổng hợp theo dòng tiền
 */

@Injectable()
export class ChungTuService {
  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepository: Repository<ChungTu>,
    private readonly voucherNumberService: VoucherNumberService,
  ) {}

  async findAllPaginated(
    loai: LoaiChungTu,
    query: PaginationQueryDto,
  ): Promise<{
    success: boolean;
    data: ChungTu[];
    meta: PaginatedResult<ChungTu>['meta'];
  }> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const allItems = await this.chungTuRepository.find({
      where: { loai },
      order: { createdAt: 'DESC' },
    });

    let filteredItems = allItems;

    if (search) {
      const searchLower = search.toLowerCase();
      filteredItems = filteredItems.filter(
        (item) =>
          item.soPhieu.toLowerCase().includes(searchLower) ||
          item.noiDung.toLowerCase().includes(searchLower) ||
          item.danhMuc?.doiTuong?.ten?.toLowerCase().includes(searchLower),
      );
    }

    const total = filteredItems.length;
    const data = filteredItems.slice(skip, skip + limit);

    return {
      success: true,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(loai?: LoaiChungTu): Promise<ChungTu[]> {
    const where = loai ? { loai } : {};
    return this.chungTuRepository.find({ where, order: { createdAt: 'DESC' } });
  }

  async findByDateRange(
    startDate: Date,
    endDate: Date,
    loai?: LoaiChungTu,
  ): Promise<ChungTu[]> {
    const where: any = {
      ngay: Between(startDate, endDate),
    };
    if (loai) where.loai = loai;
    return this.chungTuRepository.find({ where, order: { ngay: 'ASC' } });
  }

  async findOne(id: string): Promise<ChungTu> {
    const { ObjectId } = await import('mongodb');
    const chungTu = await this.chungTuRepository.findOne({
      where: { _id: new ObjectId(id) as any },
    });

    if (!chungTu) {
      throw new NotFoundException(`Không tìm thấy chứng từ với ID ${id}`);
    }

    return chungTu;
  }

  async create(
    createDto: CreateChungTuDto,
    nguoiTaoId: string,
  ): Promise<ChungTu> {
    const soPhieu = await this.voucherNumberService.generateVoucherNumber(
      createDto.loai,
    );

    const chungTu = this.chungTuRepository.create({
      ...createDto,
      ngay: new Date(createDto.ngay),
      soPhieu,
      nguoiTaoId,
    });

    return this.chungTuRepository.save(chungTu);
  }

  async update(id: string, updateDto: UpdateChungTuDto): Promise<ChungTu> {
    const chungTu = await this.findOne(id);

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

    return this.chungTuRepository.save(chungTu);
  }

  async delete(id: string): Promise<void> {
    const chungTu = await this.findOne(id);
    await this.chungTuRepository.remove(chungTu);
  }

  async search(keyword: string, loai?: LoaiChungTu): Promise<ChungTu[]> {
    const vouchers = await this.findAll(loai);
    const lowerKeyword = keyword.toLowerCase();
    return vouchers.filter(
      (v) =>
        v.soPhieu.toLowerCase().includes(lowerKeyword) ||
        v.noiDung.toLowerCase().includes(lowerKeyword) ||
        v.danhMuc?.doiTuong?.ten?.toLowerCase().includes(lowerKeyword),
    );
  }
}
