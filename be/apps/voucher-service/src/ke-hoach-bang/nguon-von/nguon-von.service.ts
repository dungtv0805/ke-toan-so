import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { KeHoachNguonVon } from '@app/entities';
import { TenantContextService } from '@app/core';
import {
  BatchKeHoachNguonVonDto,
  CreateKeHoachNguonVonDto,
  UpdateKeHoachNguonVonDto,
} from './dto';
import { kiemTraTrungKhoa, LOAI_KE_HOACH_MAC_DINH } from '../helpers';
import { KeHoachBangBaseService } from '../base';
import {
  DongBoHachToanKeHoachService,
  type NguonDongKeHoach,
} from '../dong-bo';

/** Khoá định danh một chỉ tiêu nguồn vốn trong một bản kế hoạch. */
const khoaNguonVon = (nhom: string, maChiTieu: string) =>
  `${nhom}|${maChiTieu}`;

/**
 * CRUD bảng kế hoạch nguồn vốn. Mỗi dòng là một chỉ tiêu trong một năm.
 *
 * `thang` là BIẾN ĐỘNG, không phải số dư — số dư từng kỳ do phía hiển thị cộng
 * dồn từ `soDuDauNam`.
 */
@Injectable()
export class KeHoachNguonVonService extends KeHoachBangBaseService<KeHoachNguonVon> {
  protected readonly tenBang = 'kế hoạch nguồn vốn';
  protected readonly thuTuDoc = {
    nhom: 'ASC',
    maChiTieu: 'ASC',
  } as const as Record<string, 'ASC' | 'DESC'>;

  constructor(
    @InjectRepository(KeHoachNguonVon)
    repo: MongoRepository<KeHoachNguonVon>,
    tenantContext: TenantContextService,
    dongBo: DongBoHachToanKeHoachService,
  ) {
    super(repo, tenantContext, dongBo);
  }

  protected readonly nguonLoai = 'NGUON_VON' as const;

  protected moTaNguon(d: KeHoachNguonVon): NguonDongKeHoach {
    return {
      nguonLoai: this.nguonLoai,
      nguonId: d.id,
      nam: d.nam,
      loaiKeHoach: d.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH,
      ghiChu: d.ghiChu,
      tenMacDinh: d.tenChiTieu || d.maChiTieu,
      thang: d.thang,
      // Nợ phải trả và Vốn chủ sở hữu định khoản khác nhau.
      phanLoai: d.nhom,
    };
  }

  async taoMoi(
    dto: CreateKeHoachNguonVonDto,
    nguoiTaoId: string,
  ): Promise<KeHoachNguonVon> {
    const loaiKeHoach = dto.loaiKeHoach ?? LOAI_KE_HOACH_MAC_DINH;
    const trung = await this.repo.countDocuments(
      this.theoTenant({
        nam: dto.nam,
        loaiKeHoach,
        nhom: dto.nhom,
        maChiTieu: dto.maChiTieu,
      }),
    );
    if (trung > 0) {
      throw new BadRequestException(
        `Chỉ tiêu ${dto.maChiTieu} đã có trong nhóm này, năm ${dto.nam}`,
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
   * Lưu một thể. Khoá gồm nhóm + mã chỉ tiêu, mà sửa đổi được CẢ HAI — nên khoá
   * của dòng sửa phải ghép từ giá trị mới (nếu có) với giá trị cũ.
   */
  async luuHangLoat(
    dto: BatchKeHoachNguonVonDto,
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
        khoa: khoaNguonVon(d.nhom, d.maChiTieu),
      })),
      them: them.map((t) => khoaNguonVon(t.nhom, t.maChiTieu)),
      sua: sua.map((s) => {
        const cu = theoId.get(s.id);
        if (!cu) return { id: s.id };
        return {
          id: s.id,
          khoa: khoaNguonVon(s.nhom ?? cu.nhom, s.maChiTieu ?? cu.maChiTieu),
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
        `Mã chỉ tiêu bị lặp trong cùng nhóm, năm ${dto.nam}: ${nhan.join(', ')}`,
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
    dto: UpdateKeHoachNguonVonDto,
  ): Promise<KeHoachNguonVon> {
    const dong = await this.timTheoId(id);
    Object.assign(dong, dto);
    const daLuu = await this.repo.save(dong);
    await this.dongBoSauKhiLuu([daLuu]);
    return daLuu;
  }
}
