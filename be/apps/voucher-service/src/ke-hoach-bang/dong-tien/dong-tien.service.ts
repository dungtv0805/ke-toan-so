import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { KeHoachDongTien, KeHoachTonDau } from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  BatchKeHoachDongTienDto,
  CreateKeHoachDongTienDto,
  LuuTonDauDto,
  TonDauQueryDto,
  UpdateKeHoachDongTienDto,
} from './dto';
import { kiemTraTrungKhoa, LOAI_KE_HOACH_MAC_DINH } from '../helpers';
import { KeHoachBangBaseService } from '../base';

/**
 * CRUD bảng kế hoạch dòng tiền. Mỗi dòng là một dòng tiền trong một năm.
 *
 * Năm dòng tổng hợp (Tồn đầu kỳ, Thu/Chi trong kỳ, Tồn cuối kỳ, Thặng dư) do
 * phía hiển thị tính — service chỉ giữ các ô người dùng nhập, cộng với tồn quỹ
 * đầu năm ở collection riêng.
 */
@Injectable()
export class KeHoachDongTienService extends KeHoachBangBaseService<KeHoachDongTien> {
  protected readonly tenBang = 'kế hoạch dòng tiền';
  protected readonly thuTuDoc = {
    'nhomDongTien.ma': 'ASC',
    'dongTien.ma': 'ASC',
  } as const as Record<string, 'ASC' | 'DESC'>;

  constructor(
    @InjectRepository(KeHoachDongTien)
    repo: MongoRepository<KeHoachDongTien>,
    @InjectRepository(KeHoachTonDau)
    private readonly tonDauRepo: MongoRepository<KeHoachTonDau>,
    tenantContext: TenantContextService,
  ) {
    super(repo, tenantContext);
  }

  async taoMoi(
    dto: CreateKeHoachDongTienDto,
    nguoiTaoId: string,
  ): Promise<KeHoachDongTien> {
    const loaiKeHoach = dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH;
    // Trùng soi trong PHẠM VI loại: cùng dòng tiền ở Kế hoạch không cản Dự báo.
    const trung = await this.repo.countDocuments(
      this.theoTenant({
        nam: dto.nam,
        loaiKeHoach,
        'dongTien.id': dto.dongTien.id,
      }),
    );
    if (trung > 0) {
      throw new BadRequestException(
        `Dòng tiền ${dto.dongTien.ma} đã có trong kế hoạch năm ${dto.nam}`,
      );
    }

    const dong = this.repo.create({
      ...dto,
      loaiKeHoach,
      nguoiTaoId,
      tenantId: this.tenantContext.getCurrentTenantId(),
    });
    return this.repo.save(dong);
  }

  /**
   * Lưu một thể: thêm và sửa trong cùng một lần bấm Lưu của bảng.
   *
   * Soi trùng trên trạng thái SAU KHI LƯU, không soi từng dòng — nếu không sẽ
   * lọt hai dòng mới cùng dòng tiền trong cùng payload.
   */
  async luuHangLoat(
    dto: BatchKeHoachDongTienDto,
    nguoiTaoId: string,
  ): Promise<{ daThem: number; daSua: number }> {
    const them = dto.them ?? [];
    const sua = dto.sua ?? [];
    if (them.length === 0 && sua.length === 0) {
      return { daThem: 0, daSua: 0 };
    }

    const loaiKeHoach = dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH;
    const hienCo = await this.repo.find({
      where: this.phamVi(dto.nam, loaiKeHoach),
    });

    const kiemTra = kiemTraTrungKhoa({
      hienCo: hienCo.map((d) => ({ id: d.id, khoa: d.dongTien.id })),
      them: them.map((t) => t.dongTien.id),
      // Sửa không đổi được dòng tiền nên khoá của dòng sửa luôn giữ nguyên.
      sua: sua.map((s) => ({ id: s.id })),
    });

    if (kiemTra.idKhongTonTai.length > 0) {
      throw new NotFoundException(
        `Không tìm thấy dòng ${this.tenBang}: ${kiemTra.idKhongTonTai.join(', ')}`,
      );
    }

    if (kiemTra.trung.length > 0) {
      const maTheoId = new Map<string, string>();
      for (const d of hienCo) maTheoId.set(d.dongTien.id, d.dongTien.ma);
      for (const t of them) maTheoId.set(t.dongTien.id, t.dongTien.ma);
      const ma = kiemTra.trung.map((id) => maTheoId.get(id) ?? id);
      throw new BadRequestException(
        `Dòng tiền bị lặp trong kế hoạch năm ${dto.nam}: ${ma.join(', ')}`,
      );
    }

    const tenantId = this.tenantContext.getCurrentTenantId();
    const dongThem = them.map((t) =>
      this.repo.create({
        ...t,
        nam: dto.nam,
        loaiKeHoach,
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
    dto: UpdateKeHoachDongTienDto,
  ): Promise<KeHoachDongTien> {
    const dong = await this.timTheoId(id);
    Object.assign(dong, dto);
    return this.repo.save(dong);
  }

  /** Tồn quỹ đầu năm — chưa khai thì coi như 0. */
  async layTonDau(query: TonDauQueryDto): Promise<{ soTien: number }> {
    const ban = await this.timTonDau(
      query.nam,
      query.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
    );
    return { soTien: ban?.soTien ?? 0 };
  }

  /** Ghi đè tồn quỹ đầu năm — một bản ghi cho mỗi cặp (năm, loại). */
  async luuTonDau(
    dto: LuuTonDauDto,
    nguoiTaoId: string,
  ): Promise<{ soTien: number }> {
    const loaiKeHoach = dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH;
    const dangCo = await this.timTonDau(dto.nam, loaiKeHoach);
    if (dangCo) {
      dangCo.soTien = dto.soTien;
      await this.tonDauRepo.save(dangCo);
      return { soTien: dangCo.soTien };
    }
    const ban = this.tonDauRepo.create({
      nam: dto.nam,
      loaiKeHoach,
      soTien: dto.soTien,
      nguoiTaoId,
      tenantId: this.tenantContext.getCurrentTenantId(),
    });
    await this.tonDauRepo.save(ban);
    return { soTien: ban.soTien };
  }

  private async timTonDau(
    nam: number,
    loaiKeHoach: string,
  ): Promise<KeHoachTonDau | null> {
    return this.tonDauRepo.findOne({
      where: this.theoTenant({ nam, loaiKeHoach }),
    });
  }
}
