import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { LichSuPheDuyet } from '@app/entities';
import { gomTocDo, KetQuaTocDo } from './helpers';

/** Báo cáo tốc độ xử lý — mục 15. Đọc lịch sử, gom nhóm ở helper thuần. */
@Injectable()
export class TocDoService {
  constructor(
    @InjectRepository(LichSuPheDuyet)
    private readonly repo: MongoRepository<LichSuPheDuyet>,
  ) {}

  async baoCao(khoang: {
    tuNgay?: string;
    denNgay?: string;
  }): Promise<KetQuaTocDo & { soDangCho: number }> {
    const dieuKien: Record<string, unknown> = {
      ketQua: { $in: ['DUYET', 'TRA_LAI', 'TU_CHOI'] },
    };
    if (khoang.tuNgay || khoang.denNgay) {
      const khoangNgay: Record<string, Date> = {};
      if (khoang.tuNgay) khoangNgay.$gte = new Date(khoang.tuNgay);
      if (khoang.denNgay) khoangNgay.$lte = new Date(khoang.denNgay);
      dieuKien.thoiDiemXuLy = khoangNgay;
    }

    const ds = await this.repo.find({ where: dieuKien as never });
    const soDangCho = await this.repo.count({
      where: { ketQua: 'GUI_DUYET' } as never,
    });

    return { ...gomTocDo(ds), soDangCho };
  }
}
