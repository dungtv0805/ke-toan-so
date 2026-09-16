import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import {
  ChungTu,
  LoaiDoiTuongPheDuyet,
  TrangThaiPheDuyet,
} from '@app/entities';

/**
 * Chép trạng thái phê duyệt xuống bản ghi nghiệp vụ gốc — phục vụ mục 12.
 *
 * Vì sao denormalize thay vì để báo cáo join sang `quy_trinh_phe_duyet`: mọi
 * báo cáo tài chính đều chạy qua các pipeline aggregate ở
 * `voucher-service/nhat-ky-chung`. Thêm `$lookup` vào từng pipeline là trả giá
 * trên mọi lần mở báo cáo, chỉ để đọc một chuỗi trạng thái.
 *
 * Vì sao ghi thẳng vào collection thay vì gọi HTTP sang voucher-service: các
 * service dùng CHUNG một MongoDB. Thêm một hop HTTP ở đây là thêm một kiểu lỗi
 * (service sập → trạng thái lệch giữa hai bảng) mà không đổi lại được gì.
 *
 * Thêm loại nghiệp vụ mới (phiếu kho, đề xuất mua...) — mục 17 — chỉ cần đăng
 * ký entity và thêm một nhánh vào `BANG_THEO_LOAI`.
 */
@Injectable()
export class DongBoTrangThaiService {
  private readonly logger = new Logger(DongBoTrangThaiService.name);

  constructor(
    @InjectRepository(ChungTu)
    private readonly chungTuRepo: MongoRepository<ChungTu>,
  ) {}

  private bang(loaiDoiTuong: LoaiDoiTuongPheDuyet) {
    const BANG_THEO_LOAI: Record<
      LoaiDoiTuongPheDuyet,
      MongoRepository<{ _id: ObjectId }>
    > = {
      CHUNG_TU: this.chungTuRepo as unknown as MongoRepository<{ _id: ObjectId }>,
    };
    return BANG_THEO_LOAI[loaiDoiTuong];
  }

  async ghi(
    loaiDoiTuong: LoaiDoiTuongPheDuyet,
    doiTuongId: string,
    trangThai: TrangThaiPheDuyet,
    phienBan: number,
  ): Promise<void> {
    const repo = this.bang(loaiDoiTuong);
    if (!repo) {
      this.logger.warn(`Chưa hỗ trợ đồng bộ trạng thái cho ${loaiDoiTuong}`);
      return;
    }
    if (!ObjectId.isValid(doiTuongId)) {
      this.logger.warn(`ID nghiệp vụ không hợp lệ: ${doiTuongId}`);
      return;
    }

    await repo.updateOne(
      { _id: new ObjectId(doiTuongId) },
      {
        $set: {
          trangThaiPheDuyet: trangThai,
          phienBanPheDuyet: phienBan,
        },
      },
    );
  }

  /** Đọc bản ghi nghiệp vụ để chụp thông tin hiển thị và so trường trọng yếu. */
  async doc(
    loaiDoiTuong: LoaiDoiTuongPheDuyet,
    doiTuongId: string,
  ): Promise<Record<string, unknown> | null> {
    const repo = this.bang(loaiDoiTuong);
    if (!repo || !ObjectId.isValid(doiTuongId)) return null;
    const bg = await repo.findOne({
      where: { _id: new ObjectId(doiTuongId) as never },
    });
    return (bg as unknown as Record<string, unknown>) ?? null;
  }
}
