import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoaiThongBao, ThongBao } from '@app/entities';

export interface TaoThongBaoDto {
  userId: string;
  loai: LoaiThongBao;
  tieuDe: string;
  noiDung?: string;
  duongDan?: string;
  quyTrinhId?: string;
}

/**
 * Thông báo trong ứng dụng — mục 13.
 *
 * Quy tắc quan trọng nhất của mục 13 KHÔNG nằm ở đây mà ở chỗ gọi: chỉ bắn
 * cho vị trí đang đến lượt, tuyệt đối không bắn cho cấp sau. Service này chỉ
 * ghi và đọc.
 */
@Injectable()
export class ThongBaoService {
  constructor(
    @InjectRepository(ThongBao)
    private readonly repo: Repository<ThongBao>,
  ) {}

  async tao(dto: TaoThongBaoDto): Promise<ThongBao> {
    return this.repo.save(this.repo.create({ ...dto, daDoc: false }));
  }

  async taoNhieu(ds: TaoThongBaoDto[]): Promise<void> {
    for (const dto of ds) await this.tao(dto);
  }

  async cuaToi(userId: string, limit = 30): Promise<ThongBao[]> {
    const ds = await this.repo.find({ where: { userId } });
    return ds
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async demChuaDoc(userId: string): Promise<number> {
    return this.repo.count({ where: { userId, daDoc: false } });
  }

  async danhDauDaDoc(id: string, userId: string): Promise<void> {
    const { ObjectId } = await import('mongodb');
    const tb = await this.repo.findOne({
      where: { _id: new ObjectId(id) as never },
    });
    if (!tb || tb.userId !== userId) return;
    tb.daDoc = true;
    tb.ngayDoc = new Date();
    await this.repo.save(tb);
  }

  async danhDauTatCa(userId: string): Promise<void> {
    const ds = await this.repo.find({ where: { userId, daDoc: false } });
    for (const tb of ds) {
      tb.daDoc = true;
      tb.ngayDoc = new Date();
      await this.repo.save(tb);
    }
  }
}
