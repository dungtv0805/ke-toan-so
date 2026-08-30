import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { KeHoachBanHang } from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  BatchKeHoachBanHangDto,
  CreateKeHoachBanHangDto,
  UpdateKeHoachBanHangDto,
} from './dto';
import { kiemTraTrungKhoa, LOAI_KE_HOACH_MAC_DINH } from '../helpers';
import { KeHoachBangBaseService } from '../base';

/**
 * CRUD bảng kế hoạch bán hàng. Mỗi dòng là một sản phẩm trong một năm.
 * Doanh thu, quý, %, hàng nhóm, hàng tổng đều do phía hiển thị tính — service
 * chỉ giữ các ô người dùng nhập.
 */
@Injectable()
export class KeHoachBanHangService extends KeHoachBangBaseService<KeHoachBanHang> {
  protected readonly tenBang = 'kế hoạch bán hàng';
  protected readonly thuTuDoc = {
    'nhomSanPham.ma': 'ASC',
    'sanPham.ma': 'ASC',
  } as const as Record<string, 'ASC' | 'DESC'>;

  constructor(
    @InjectRepository(KeHoachBanHang)
    repo: MongoRepository<KeHoachBanHang>,
    tenantContext: TenantContextService,
  ) {
    super(repo, tenantContext);
  }

  async taoMoi(
    dto: CreateKeHoachBanHangDto,
    nguoiTaoId: string,
  ): Promise<KeHoachBanHang> {
    // Dùng thẳng `dto.loaiKeHoach` chứ không qua `dieuKienLoaiKeHoach`: dòng mới
    // luôn có trường này, mà nới bằng $or sẽ khiến một sản phẩm đã có bên Kế
    // hoạch chặn mất việc thêm chính nó vào Dự báo.
    const trung = await this.repo.countDocuments(
      this.theoTenant({
        nam: dto.nam,
        loaiKeHoach: dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
        'sanPham.id': dto.sanPham.id,
      }),
    );
    if (trung > 0) {
      throw new BadRequestException(
        `Sản phẩm ${dto.sanPham.ma} đã có trong kế hoạch năm ${dto.nam}`,
      );
    }

    const dong = this.repo.create({
      ...dto,
      // `dto.loaiKeHoach` có thể trống (bản FE cũ) — không để undefined lọt vào kho.
      loaiKeHoach: dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
      nguoiTaoId,
      tenantId: this.tenantContext.getCurrentTenantId(),
    });
    return this.repo.save(dong);
  }

  /**
   * Lưu một thể: thêm và sửa trong cùng một lần bấm Lưu của bảng.
   *
   * Soi trùng trên trạng thái SAU KHI LƯU, không soi từng dòng — nếu không sẽ lọt
   * hai dòng mới cùng sản phẩm trong cùng payload.
   */
  async luuHangLoat(
    dto: BatchKeHoachBanHangDto,
    nguoiTaoId: string,
  ): Promise<{ daThem: number; daSua: number }> {
    const them = dto.them ?? [];
    const sua = dto.sua ?? [];
    if (them.length === 0 && sua.length === 0) {
      return { daThem: 0, daSua: 0 };
    }

    // Lọc theo loại: lô Dự báo không được soi trùng với dòng Kế hoạch.
    const hienCo = await this.repo.find({
      where: this.phamVi(dto.nam, dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH),
    });

    const kiemTra = kiemTraTrungKhoa({
      hienCo: hienCo.map((d) => ({ id: d.id, khoa: d.sanPham.id })),
      them: them.map((t) => t.sanPham.id),
      // Sửa không đổi được sản phẩm nên khoá của dòng sửa luôn giữ nguyên.
      sua: sua.map((s) => ({ id: s.id })),
    });

    if (kiemTra.idKhongTonTai.length > 0) {
      throw new NotFoundException(
        `Không tìm thấy dòng kế hoạch bán hàng: ${kiemTra.idKhongTonTai.join(', ')}`,
      );
    }

    if (kiemTra.trung.length > 0) {
      const tenTheoId = new Map<string, string>();
      for (const d of hienCo) tenTheoId.set(d.sanPham.id, d.sanPham.ma);
      for (const t of them) tenTheoId.set(t.sanPham.id, t.sanPham.ma);
      const ma = kiemTra.trung.map((id) => tenTheoId.get(id) ?? id);
      throw new BadRequestException(
        `Sản phẩm bị lặp trong kế hoạch năm ${dto.nam}: ${ma.join(', ')}`,
      );
    }

    const tenantId = this.tenantContext.getCurrentTenantId();
    const dongThem = them.map((t) =>
      this.repo.create({
        ...t,
        nam: dto.nam,
        loaiKeHoach: dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
        nguoiTaoId,
        tenantId,
      }),
    );

    const theoId = new Map(hienCo.map((d) => [d.id, d]));
    const dongSua = sua.map((s) => {
      const { id: _id, ...thayDoi } = s;
      return Object.assign(theoId.get(s.id)!, thayDoi);
    });

    const tatCa = [...dongThem, ...dongSua];
    if (tatCa.length > 0) await this.repo.save(tatCa);

    return { daThem: dongThem.length, daSua: dongSua.length };
  }

  async capNhat(
    id: string,
    dto: UpdateKeHoachBanHangDto,
  ): Promise<KeHoachBanHang> {
    const dong = await this.timTheoId(id);
    Object.assign(dong, dto);
    return this.repo.save(dong);
  }

}
