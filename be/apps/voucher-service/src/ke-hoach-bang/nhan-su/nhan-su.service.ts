import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { KeHoachNhanSu } from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  BatchKeHoachNhanSuDto,
  CreateKeHoachNhanSuDto,
  UpdateKeHoachNhanSuDto,
} from './dto';
import { kiemTraTrungKhoa, LOAI_KE_HOACH_MAC_DINH } from '../helpers';
import { KeHoachBangBaseService } from '../base';
import {
  DongBoHachToanKeHoachService,
  type NguonDongKeHoach,
} from '../dong-bo';

/**
 * CRUD bảng kế hoạch nhân sự. Mỗi dòng là một chức vụ trong một bộ phận,
 * trong một năm. CỘNG, quý, %, hàng bộ phận, hàng tổng do phía hiển thị tính.
 */
/** Khoá định danh một dòng nhân sự trong một năm. */
const khoaNhanSu = (boPhanId: string, maViTri: string) =>
  `${boPhanId}|${maViTri}`;

@Injectable()
export class KeHoachNhanSuService extends KeHoachBangBaseService<KeHoachNhanSu> {
  protected readonly tenBang = 'kế hoạch nhân sự';
  protected readonly thuTuDoc = {
    'boPhan.ma': 'ASC',
    maViTri: 'ASC',
  } as const as Record<string, 'ASC' | 'DESC'>;

  constructor(
    @InjectRepository(KeHoachNhanSu)
    repo: MongoRepository<KeHoachNhanSu>,
    tenantContext: TenantContextService,
    dongBo: DongBoHachToanKeHoachService,
  ) {
    super(repo, tenantContext, dongBo);
  }

  protected readonly nguonLoai = 'NHAN_SU' as const;

  protected moTaNguon(d: KeHoachNhanSu): NguonDongKeHoach {
    return {
      nguonLoai: this.nguonLoai,
      nguonId: d.id,
      nam: d.nam,
      loaiKeHoach: d.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
      ghiChu: d.ghiChu,
      tenMacDinh: d.tenChucVu || d.maViTri,
      thang: d.thang,
      danhMuc: { boPhan: { ma: d.boPhan.ma, ten: d.boPhan.ten } },
    };
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
    const daLuu = await this.repo.save(dong);
    await this.dongBoSauKhiLuu([daLuu]);
    return daLuu;
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
      where: this.phamVi(dto.nam, dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH),
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
    if (tatCa.length > 0) {
      const daLuu = await this.repo.save(tatCa);
      await this.dongBoSauKhiLuu(daLuu);
    }

    return { daThem: dongThem.length, daSua: dongSua.length };
  }

  async capNhat(
    id: string,
    dto: UpdateKeHoachNhanSuDto,
  ): Promise<KeHoachNhanSu> {
    const dong = await this.timTheoId(id);
    Object.assign(dong, dto);
    const daLuu = await this.repo.save(dong);
    await this.dongBoSauKhiLuu([daLuu]);
    return daLuu;
  }

}
