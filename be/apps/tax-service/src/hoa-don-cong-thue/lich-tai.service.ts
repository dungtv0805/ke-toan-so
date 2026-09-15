import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CongTyCongThue } from '@app/entities';
import { TaiHangLoatService } from './tai-hang-loat.service';
import { PhienCongThueService } from './cong-thue/phien.service';

const MOT_PHUT = 60_000;

const pad = (n: number) => String(n).padStart(2, '0');
const ngayLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Lịch tải hóa đơn, RIÊNG cho từng công ty.
 *
 * Mỗi doanh nghiệp một giờ chạy và một số ngày kéo lại riêng. Dồn tất cả vào
 * cùng một giờ là tự tạo một đợt dồn ứ về phía cổng Thuế — hệ thống nhà nước
 * dùng chung cả nước, và cách nhanh nhất để bị chặn IP.
 *
 * Kéo lại một khoảng CHỒNG LẤN (mặc định 7 ngày) là có chủ đích: hóa đơn lên
 * cổng Thuế trễ vài ngày so với ngày lập, và hóa đơn bị thay thế hay điều chỉnh
 * về sau cũng cần cập nhật lại. Cơ chế chống trùng đảm bảo không sinh bản ghi
 * thừa.
 *
 * GIỚI HẠN CẦN BIẾT: bộ đếm chạy trong tiến trình tax-service, nên lịch chỉ
 * hoạt động khi service còn sống. PM2 đã cấu hình `autorestart` nên bình thường
 * không sao, nhưng service chết cả đêm thì lịch đêm đó không chạy — lần chạy kế
 * tiếp sẽ kéo bù nhờ khoảng chồng lấn.
 */
@Injectable()
export class LichTaiService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LichTaiService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(CongTyCongThue)
    private readonly congTyRepo: Repository<CongTyCongThue>,
    private readonly taiHangLoat: TaiHangLoatService,
    private readonly phien: PhienCongThueService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.dapUng().catch((err) => this.logger.error(`Lịch tải lỗi: ${err?.message ?? err}`));
    }, MOT_PHUT);
    this.timer.unref?.();
    this.logger.log('Đã bật lịch tải hóa đơn cổng Thuế, kiểm tra mỗi phút');
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Đã tới giờ chạy của công ty này chưa, và hôm nay đã chạy chưa. */
  daToiGio(congTy: CongTyCongThue, moc = new Date()): boolean {
    if (!congTy.tuDongTai) return false;

    const [gio, phut] = String(congTy.gioChay || '07:00').split(':').map(Number);
    const gioChay = new Date(moc);
    gioChay.setHours(gio || 0, phut || 0, 0, 0);

    if (moc < gioChay) return false;
    if (!congTy.lanChayCuoi) return true;
    return new Date(congTy.lanChayCuoi) < gioChay;
  }

  /**
   * Quét mọi công ty tới giờ và chạy cho từng cái.
   *
   * Chạy TỪNG công ty một lượt riêng chứ không gom chung: giờ chạy khác nhau
   * nên gom lại cũng vô nghĩa, và tách ra thì một công ty hỏng không kéo theo
   * công ty khác.
   */
  async dapUng(moc = new Date()): Promise<{ daChay: string[] }> {
    // Lịch chạy nền, ngoài mọi request nên KHÔNG có tenant context. Phải tự đọc
    // tenantId từ bản ghi và truyền xuống, không dựa vào proxy tự chèn.
    const moi = await this.congTyRepo.find();
    const tatCa = moi.filter((c) => c.isActive !== false && c.tuDongTai === true);
    const daChay: string[] = [];

    for (const congTy of tatCa) {
      if (!this.daToiGio(congTy, moc)) continue;

      // Không lưu mật khẩu thì máy không tự đăng nhập được. Đáng lẽ đã chặn từ
      // lúc bật lịch, nhưng mật khẩu có thể bị xóa sau đó.
      if (!congTy.matKhauMaHoa) {
        this.logger.warn(`MST ${congTy.mst} bật lịch nhưng không còn mật khẩu — bỏ qua`);
        continue;
      }

      const den = new Date(moc);
      const tu = new Date(moc);
      tu.setDate(tu.getDate() - (congTy.soNgayKeoLai - 1));

      try {
        await this.taiHangLoat.batDau(congTy.tenantId, {
          dsMst: [congTy.mst],
          tuNgay: ngayLocal(tu),
          denNgay: ngayLocal(den),
          nguon: 'lich',
        });

        congTy.lanChayCuoi = moc;
        await this.congTyRepo.save(congTy);
        daChay.push(congTy.mst);
      } catch (err: any) {
        this.logger.error(`Không chạy được lịch cho MST ${congTy.mst}: ${err?.message ?? err}`);
      }
    }

    return { daChay };
  }
}
