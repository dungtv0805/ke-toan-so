import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { KeHoachNhanSu, type LoaiKeHoach } from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  BatchKeHoachNhanSuDto,
  CreateKeHoachNhanSuDto,
  UpdateKeHoachNhanSuDto,
} from './dto';
import {
  dieuKienLoaiKeHoach,
  kiemTraTrungKhoa,
  LOAI_KE_HOACH_MAC_DINH,
} from '../helpers';

/**
 * CRUD bảng kế hoạch nhân sự. Mỗi dòng là một chức vụ trong một bộ phận,
 * trong một năm. CỘNG, quý, %, hàng bộ phận, hàng tổng do phía hiển thị tính.
 */
/** Khoá định danh một dòng nhân sự trong một năm. */
const khoaNhanSu = (boPhanId: string, maViTri: string) =>
  `${boPhanId}|${maViTri}`;

@Injectable()
export class KeHoachNhanSuService {
  constructor(
    @InjectRepository(KeHoachNhanSu)
    private readonly repo: MongoRepository<KeHoachNhanSu>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private theoTenant(where: Record<string, unknown>): Record<string, unknown> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) where.tenantId = tenantId;
    return where;
  }

  /** Vài chục dòng mỗi năm nên trả hết, không phân trang. */
  async layTheoNam(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<KeHoachNhanSu[]> {
    return this.repo.find({
      where: this.theoTenant({ nam, ...dieuKienLoaiKeHoach(loaiKeHoach) }),
      order: { 'boPhan.ma': 'ASC', maViTri: 'ASC' } as never,
    });
  }

  async taoMoi(
    dto: CreateKeHoachNhanSuDto,
    nguoiTaoId: string,
  ): Promise<KeHoachNhanSu> {
    // Trùng tính theo cả bộ phận: cùng mã vị trí ở hai bộ phận khác nhau là hợp lệ.
    // Dùng thẳng `dto.loaiKeHoach` chứ không qua `dieuKienLoaiKeHoach`: dòng mới
    // luôn có trường này, mà nới bằng $or sẽ khiến một chức vụ đã có bên Kế
    // hoạch chặn mất việc thêm chính nó vào Dự báo.
    const trung = await this.repo.countDocuments(
      this.theoTenant({
        nam: dto.nam,
        loaiKeHoach: dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
        'boPhan.id': dto.boPhan.id,
        maViTri: dto.maViTri,
      }),
    );
    if (trung > 0) {
      throw new BadRequestException(
        `Mã vị trí ${dto.maViTri} đã có trong bộ phận ${dto.boPhan.ten} năm ${dto.nam}`,
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
   * Khoá gồm bộ phận + mã vị trí, mà sửa đổi được CẢ HAI — nên khoá của dòng sửa
   * phải ghép từ giá trị mới (nếu có) với giá trị cũ, rồi mới soi trùng.
   */
  async luuHangLoat(
    dto: BatchKeHoachNhanSuDto,
    nguoiTaoId: string,
  ): Promise<{ daThem: number; daSua: number }> {
    const them = dto.them ?? [];
    const sua = dto.sua ?? [];
    if (them.length === 0 && sua.length === 0) {
      return { daThem: 0, daSua: 0 };
    }

    // Lọc theo loại: lô Dự báo không được soi trùng với dòng Kế hoạch.
    const hienCo = await this.repo.find({
      where: this.theoTenant({
        nam: dto.nam,
        ...dieuKienLoaiKeHoach(dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH),
      }),
    });
    const theoId = new Map(hienCo.map((d) => [d.id, d]));

    const kiemTra = kiemTraTrungKhoa({
      hienCo: hienCo.map((d) => ({
        id: d.id,
        khoa: khoaNhanSu(d.boPhan.id, d.maViTri),
      })),
      them: them.map((t) => khoaNhanSu(t.boPhan.id, t.maViTri)),
      sua: sua.map((s) => {
        const cu = theoId.get(s.id);
        if (!cu) return { id: s.id };
        return {
          id: s.id,
          khoa: khoaNhanSu(
            s.boPhan?.id ?? cu.boPhan.id,
            s.maViTri ?? cu.maViTri,
          ),
        };
      }),
    });

    if (kiemTra.idKhongTonTai.length > 0) {
      throw new NotFoundException(
        `Không tìm thấy dòng kế hoạch nhân sự: ${kiemTra.idKhongTonTai.join(', ')}`,
      );
    }

    if (kiemTra.trung.length > 0) {
      const nhan = kiemTra.trung.map((k) => k.split('|')[1] ?? k);
      throw new BadRequestException(
        `Mã vị trí bị lặp trong cùng bộ phận, năm ${dto.nam}: ${nhan.join(', ')}`,
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
    dto: UpdateKeHoachNhanSuDto,
  ): Promise<KeHoachNhanSu> {
    const dong = await this.timTheoId(id);
    Object.assign(dong, dto);
    return this.repo.save(dong);
  }

  async xoa(id: string): Promise<void> {
    const dong = await this.timTheoId(id);
    await this.repo.deleteOne({ _id: dong._id });
  }

  private async timTheoId(id: string): Promise<KeHoachNhanSu> {
    if (!ObjectId.isValid(id)) {
      throw new BadRequestException('Mã dòng không hợp lệ');
    }
    const dong = await this.repo.findOne({
      where: this.theoTenant({ _id: new ObjectId(id) }),
    });
    if (!dong) {
      throw new NotFoundException('Không tìm thấy dòng kế hoạch nhân sự');
    }
    return dong;
  }
}
