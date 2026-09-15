import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Một mã số thuế đã khai báo để tải hóa đơn từ cổng Thuế.
 *
 * Mật khẩu là TÙY CHỌN, ứng với hai chế độ vận hành:
 *  - Có lưu   : lưu mã hóa, về sau chỉ cần captcha là đăng nhập được. Bắt buộc
 *               nếu muốn máy tự tải theo lịch.
 *  - Không lưu: kế toán nhập mật khẩu mỗi phiên, hệ thống không giữ lại gì.
 *
 * Lịch tải nằm ngay trên từng công ty chứ không phải một lịch chung: mỗi doanh
 * nghiệp một kỳ kê khai và một thói quen khác nhau, và dồn tất cả vào cùng một
 * giờ là tự tạo một đợt dồn ứ về phía cổng Thuế.
 */
@Entity('cong_ty_cong_thue')
export class CongTyCongThue extends BaseEntity {
  @Index()
  @Column()
  mst: string;

  @Column({ default: '' }) tenCongTy: string;

  @Column() tenDangNhap: string;

  /** AES-256-GCM. NULL = chế độ không lưu mật khẩu. Không bao giờ trả ra API. */
  @Column({ nullable: true }) matKhauMaHoa: string;

  /** 'thang' | 'quy' — quyết định mốc chốt sổ và cách gom kỳ. */
  @Column({ default: 'thang' }) kyKeKhai: string;

  // ------------------------------------------------------- Lịch tải riêng

  @Column({ default: false }) tuDongTai: boolean;

  /** Giờ chạy trong ngày, dạng 'HH:MM' theo giờ máy chủ. */
  @Column({ default: '07:00' }) gioChay: string;

  /**
   * Mỗi lần chạy kéo lại bao nhiêu ngày gần nhất.
   *
   * Kéo chồng lấn là có chủ đích: hóa đơn lên cổng Thuế trễ vài ngày so với
   * ngày lập, và hóa đơn bị thay thế hay điều chỉnh về sau cũng cần cập nhật
   * lại. Cơ chế chống trùng lo phần còn lại.
   */
  @Column({ default: 7 }) soNgayKeoLai: number;

  @Column({ type: 'date', nullable: true }) lanChayCuoi: Date;

  @Column({ default: true }) isActive: boolean;
}

export interface CongTyCongThueEntities {
  CongTyCongThue: typeof CongTyCongThue;
}
declare module '../entities' {
  interface Entities extends CongTyCongThueEntities {}
}
