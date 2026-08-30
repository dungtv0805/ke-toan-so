import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { KeHoachTaiSan } from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  BatchKeHoachTaiSanDto,
  CreateKeHoachTaiSanDto,
  UpdateKeHoachTaiSanDto,
} from './dto';
import { kiemTraTrungKhoa, LOAI_KE_HOACH_MAC_DINH } from '../helpers';
import { KeHoachBangBaseService } from '../base';
import {
  DongBoHachToanKeHoachService,
  type NguonDongKeHoach,
} from '../dong-bo';

/** Khoá định danh một dòng tài sản trong một bản kế hoạch. */
const khoaTaiSan = (boPhanId: string, maTaiSan: string) =>
  `${boPhanId}|${maTaiSan}`;

/**
 * CRUD bảng kế hoạch tài sản. Mỗi dòng là một tài sản dự kiến trang bị cho một
 * bộ phận, trong một năm. Thành tiền, quý, %, hàng nhóm, hàng tổng do phía hiển
 * thị tính.
 */
@Injectable()
export class KeHoachTaiSanService extends KeHoachBangBaseService<KeHoachTaiSan> {
  protected readonly tenBang = 'kế hoạch tài sản';
  protected readonly thuTuDoc = {
    'boPhan.ma': 'ASC',
    maTaiSan: 'ASC',
  } as const as Record<string, 'ASC' | 'DESC'>;

  constructor(
    @InjectRepository(KeHoachTaiSan)
    repo: MongoRepository<KeHoachTaiSan>,
    tenantContext: TenantContextService,
    dongBo: DongBoHachToanKeHoachService,
  ) {
    super(repo, tenantContext, dongBo);
  }

  protected readonly nguonLoai = 'TAI_SAN' as const;

  protected moTaNguon(d: KeHoachTaiSan): NguonDongKeHoach {
    return {
      nguonLoai: this.nguonLoai,
      nguonId: d.id,
      nam: d.nam,
      loaiKeHoach: d.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
      ghiChu: d.ghiChu,
      tenMacDinh: d.tenTaiSan || d.maTaiSan,
      thang: d.thang,
      danhMuc: { boPhan: { ma: d.boPhan.ma, ten: d.boPhan.ten } },
    };
  }

  async taoMoi(
    dto: CreateKeHoachTaiSanDto,
    nguoiTaoId: string,
  ): Promise<KeHoachTaiSan> {
    const loaiKeHoach = dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH;
    // Trùng tính theo cả bộ phận: cùng mã tài sản ở hai nơi sử dụng là hợp lệ.
    const trung = await this.repo.countDocuments(
      this.theoTenant({
        nam: dto.nam,
        loaiKeHoach,
        'boPhan.id': dto.boPhan.id,
        maTaiSan: dto.maTaiSan,
      }),
    );
    if (trung > 0) {
      throw new BadRequestException(
        `Tài sản ${dto.maTaiSan} đã có ở ${dto.boPhan.ten} năm ${dto.nam}`,
      );
    }

    const dong = this.repo.create({
      ...dto,
      loaiKeHoach,
      nguoiTaoId,
      tenantId: this.tenantContext.getCurrentTenantId(),
    });
    const daLuu = await this.repo.save(dong);
    await this.dongBoSauKhiLuu([daLuu]);
    return daLuu;
  }

  /**
   * Lưu một thể. Khoá gồm bộ phận + mã tài sản, mà sửa đổi được CẢ HAI — nên
   * khoá của dòng sửa phải ghép từ giá trị mới (nếu có) với giá trị cũ.
   */
  async luuHangLoat(
    dto: BatchKeHoachTaiSanDto,
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
    const theoId = new Map(hienCo.map((d) => [d.id, d]));

    const kiemTra = kiemTraTrungKhoa({
      hienCo: hienCo.map((d) => ({
        id: d.id,
        khoa: khoaTaiSan(d.boPhan.id, d.maTaiSan),
      })),
      them: them.map((t) => khoaTaiSan(t.boPhan.id, t.maTaiSan)),
      sua: sua.map((s) => {
        const cu = theoId.get(s.id);
        if (!cu) return { id: s.id };
        return {
          id: s.id,
          khoa: khoaTaiSan(
            s.boPhan?.id ?? cu.boPhan.id,
            s.maTaiSan ?? cu.maTaiSan,
          ),
        };
      }),
    });

    if (kiemTra.idKhongTonTai.length > 0) {
      throw new NotFoundException(
        `Không tìm thấy dòng ${this.tenBang}: ${kiemTra.idKhongTonTai.join(', ')}`,
      );
    }

    if (kiemTra.trung.length > 0) {
      const nhan = kiemTra.trung.map((k) => k.split('|')[1] ?? k);
      throw new BadRequestException(
        `Mã tài sản bị lặp trong cùng nơi sử dụng, năm ${dto.nam}: ${nhan.join(', ')}`,
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
    dto: UpdateKeHoachTaiSanDto,
  ): Promise<KeHoachTaiSan> {
    const dong = await this.timTheoId(id);
    Object.assign(dong, dto);
    const daLuu = await this.repo.save(dong);
    await this.dongBoSauKhiLuu([daLuu]);
    return daLuu;
  }
}
