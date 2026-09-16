import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BuocCauHinh,
  CauHinhPheDuyet,
  LoaiDoiTuongPheDuyet,
} from '@app/entities';

export interface LuuCauHinhDto {
  loaiDoiTuong: LoaiDoiTuongPheDuyet;
  loaiNghiepVuMa: string;
  loaiNghiepVuTen?: string;
  buoc: BuocCauHinh[];
}

/**
 * Thiết lập phê duyệt theo loại nghiệp vụ — mục 4.
 *
 * Không tạo danh mục nghiệp vụ mới (mục 2): `loaiNghiepVuMa` trỏ thẳng vào
 * `loai_giao_dich.ma` đã có. Một loại nghiệp vụ = một dòng ở đây.
 */
@Injectable()
export class CauHinhPheDuyetService {
  constructor(
    @InjectRepository(CauHinhPheDuyet)
    private readonly repo: Repository<CauHinhPheDuyet>,
  ) {}

  async danhSach(
    loaiDoiTuong: LoaiDoiTuongPheDuyet = 'CHUNG_TU',
  ): Promise<CauHinhPheDuyet[]> {
    return this.repo.find({ where: { loaiDoiTuong, isActive: true } });
  }

  async tim(
    loaiDoiTuong: LoaiDoiTuongPheDuyet,
    loaiNghiepVuMa: string,
  ): Promise<CauHinhPheDuyet | null> {
    return this.repo.findOne({
      where: { loaiDoiTuong, loaiNghiepVuMa, isActive: true },
    });
  }

  /**
   * Chuẩn hoá ma trận người dùng nhập.
   *
   * Ô trống trên ma trận = vị trí không tham gia (mục 4) → FE gửi lên mảng đã
   * bỏ ô trống. Ở đây chỉ dồn lại thứ tự cho liền mạch: người dùng gõ 1, 3, 7
   * thì lưu thành 1, 2, 3 — engine đi tuần tự theo chỉ số mảng nên số nhảy cóc
   * không sai, nhưng màn hình hiển thị "cấp 7" giữa luồng 3 cấp thì khó hiểu.
   */
  private chuanHoaBuoc(buoc: BuocCauHinh[]): BuocCauHinh[] {
    const sach = buoc
      .filter((b) => b.viTriTen && Number.isFinite(b.thuTu))
      .sort((a, b) => a.thuTu - b.thuTu);

    const trung = sach.filter(
      (b, i) => sach.findIndex((x) => x.viTriTen === b.viTriTen) !== i,
    );
    if (trung.length) {
      throw new BadRequestException(
        `Vị trí "${trung[0].viTriTen}" được khai hai lần trong cùng một luồng`,
      );
    }

    return sach.map((b, i) => ({
      thuTu: i + 1,
      viTriTen: b.viTriTen,
      batBuoc: b.batBuoc !== false,
    }));
  }

  async luu(dto: LuuCauHinhDto): Promise<CauHinhPheDuyet> {
    const buoc = this.chuanHoaBuoc(dto.buoc ?? []);
    const dangCo = await this.repo.findOne({
      where: {
        loaiDoiTuong: dto.loaiDoiTuong,
        loaiNghiepVuMa: dto.loaiNghiepVuMa,
      },
    });

    if (dangCo) {
      dangCo.buoc = buoc;
      dangCo.loaiNghiepVuTen = dto.loaiNghiepVuTen ?? dangCo.loaiNghiepVuTen;
      dangCo.isActive = true;
      return this.repo.save(dangCo);
    }

    return this.repo.save(
      this.repo.create({
        loaiDoiTuong: dto.loaiDoiTuong,
        loaiNghiepVuMa: dto.loaiNghiepVuMa,
        loaiNghiepVuTen: dto.loaiNghiepVuTen,
        buoc,
        isActive: true,
      }),
    );
  }

  /**
   * Đổi tên một vị trí thì mọi cấu hình đang trỏ tên cũ phải đổi theo, nếu
   * không luồng trỏ vào vị trí không còn ai giữ và đứng im.
   */
  async doiTenViTri(tenCu: string, tenMoi: string): Promise<void> {
    const ds = await this.repo.find({ where: { isActive: true } });
    for (const ch of ds) {
      if (!ch.buoc?.some((b) => b.viTriTen === tenCu)) continue;
      ch.buoc = ch.buoc.map((b) =>
        b.viTriTen === tenCu ? { ...b, viTriTen: tenMoi } : b,
      );
      await this.repo.save(ch);
    }
  }
}
