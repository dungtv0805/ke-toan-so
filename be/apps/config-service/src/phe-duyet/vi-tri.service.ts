import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ViTriPheDuyetNguoiDung, VaiTro } from '@app/entities';

export interface GanViTriDto {
  viTriTen: string;
  nguoiDung: { userId: string; hoTen?: string; email?: string }[];
}

/**
 * Ai đang đảm nhiệm Vị trí phân quyền nào — mục 3.
 *
 * Mục 3: "Khi thay nhân sự, chỉ thay người dùng đảm nhiệm Vị trí phân quyền;
 * không phải sửa lại luồng nếu vị trí không đổi." Vì vậy luồng phê duyệt chỉ
 * lưu TÊN VỊ TRÍ, còn ánh xạ sang người thật nằm ở đây và tra lúc chạy.
 */
@Injectable()
export class ViTriPheDuyetService {
  constructor(
    @InjectRepository(ViTriPheDuyetNguoiDung)
    private readonly repo: Repository<ViTriPheDuyetNguoiDung>,
    @InjectRepository(VaiTro)
    private readonly vaiTroRepo: Repository<VaiTro>,
  ) {}

  /** Danh sách vị trí của công ty = danh mục vai trò — mục 2, không hard-code. */
  async danhSachViTri(): Promise<string[]> {
    const vaiTro = await this.vaiTroRepo.find({ where: { isActive: true } });
    return vaiTro.map((v) => v.ten);
  }

  async danhSachGan(): Promise<ViTriPheDuyetNguoiDung[]> {
    return this.repo.find({ where: { isActive: true } });
  }

  /**
   * Người đang giữ một vị trí. Trả nhiều người: mục 13 bắn thông báo cho tất
   * cả, ai xử lý trước thì thôi — một vị trí chỉ có một người mà người đó nghỉ
   * thì cả luồng đứng.
   */
  async nguoiGiuViTri(viTriTen: string): Promise<ViTriPheDuyetNguoiDung[]> {
    return this.repo.find({ where: { viTriTen, isActive: true } });
  }

  /** Các vị trí một người đang giữ — dùng để lọc "Chờ tôi duyệt" (mục 6). */
  async viTriCuaNguoi(userId: string): Promise<string[]> {
    const ds = await this.repo.find({ where: { userId, isActive: true } });
    return ds.map((d) => d.viTriTen);
  }

  /**
   * Ghi đè toàn bộ danh sách người của MỘT vị trí.
   *
   * Ghi đè chứ không merge: màn cấu hình gửi lên đúng những người còn lại sau
   * khi người dùng bỏ tick, merge thì bỏ tick không bao giờ có tác dụng.
   */
  async ganViTri(dto: GanViTriDto): Promise<ViTriPheDuyetNguoiDung[]> {
    const dangCo = await this.repo.find({ where: { viTriTen: dto.viTriTen } });
    const giuLai = new Set(dto.nguoiDung.map((n) => n.userId));

    for (const cu of dangCo) {
      if (!giuLai.has(cu.userId)) {
        cu.isActive = false;
        await this.repo.save(cu);
      }
    }

    const ra: ViTriPheDuyetNguoiDung[] = [];
    for (const n of dto.nguoiDung) {
      const cu = dangCo.find((d) => d.userId === n.userId);
      if (cu) {
        cu.isActive = true;
        cu.hoTen = n.hoTen ?? cu.hoTen;
        cu.email = n.email ?? cu.email;
        ra.push(await this.repo.save(cu));
      } else {
        ra.push(
          await this.repo.save(
            this.repo.create({
              viTriTen: dto.viTriTen,
              userId: n.userId,
              hoTen: n.hoTen,
              email: n.email,
              isActive: true,
            }),
          ),
        );
      }
    }
    return ra;
  }
}
