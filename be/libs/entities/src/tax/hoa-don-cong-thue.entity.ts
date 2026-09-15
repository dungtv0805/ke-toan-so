import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Hóa đơn tải về từ cổng Thuế, giữ nguyên như cổng trả.
 *
 * Đây là kho dữ liệu THÔ, tách khỏi `bang_ke_mua_vao`: bảng kê là sổ sách kế
 * toán do người dùng làm chủ, còn bảng này là bản chụp của cổng Thuế. Trộn hai
 * thứ vào nhau thì mỗi lần đồng bộ lại ghi đè lên chỉnh sửa của kế toán.
 *
 * Một kỳ "đầy đủ" nằm rải ở 4 chỗ trên cổng: mua vào / bán ra × hóa đơn thường
 * / hóa đơn máy tính tiền. Bỏ sót nhóm máy tính tiền là lỗi hay gặp nhất khi tự
 * viết công cụ, và không có dấu hiệu gì báo cho biết.
 */
@Entity('hoa_don_cong_thue')
export class HoaDonCongThue extends BaseEntity {
  /** MST của chính doanh nghiệp đang tra cứu. */
  @Index()
  @Column()
  mst: string;

  /** 'mua-vao' | 'ban-ra' */
  @Column() chieu: string;

  /** 'thuong' | 'may-tinh-tien' */
  @Column({ default: 'thuong' }) nhom: string;

  /**
   * Khóa tự nhiên của hóa đơn, ghép sẵn để chống trùng.
   * mst + chieu + nhom + mstNguoiBan + mauSo + kyHieu + soHoaDon
   */
  @Index()
  @Column()
  khoaHoaDon: string;

  @Column({ nullable: true }) mstNguoiBan: string;
  @Column({ nullable: true }) tenNguoiBan: string;
  @Column({ nullable: true }) mstNguoiMua: string;
  @Column({ nullable: true }) tenNguoiMua: string;

  @Column({ nullable: true }) mauSo: string;
  @Column({ nullable: true }) kyHieu: string;
  @Column({ nullable: true }) soHoaDon: string;

  @Index()
  @Column({ type: 'date', nullable: true })
  ngayLap: Date;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) giaTriChuaThue: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tienThue: number;
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tongThanhToan: number;

  /** Mã trạng thái hóa đơn của cổng: 1 mới, 2 thay thế, 3 điều chỉnh, 4/5 đã hủy. */
  @Column({ nullable: true }) trangThai: string;

  /** Mã trạng thái xử lý của cổng. */
  @Column({ nullable: true }) trangThaiXuLy: string;

  /** Đường dẫn file gốc (ZIP chứa XML có chữ ký số) đã tải về đĩa. */
  @Column({ nullable: true }) duongDanFileGoc: string;

  /** Nguyên văn cổng trả về, giữ lại để không mất thông tin khi cổng đổi trường. */
  @Column({ type: 'text' }) duLieuGoc: string;

  @Column() daTaiLuc: Date;

  @Column({ default: true }) isActive: boolean;
}

export interface HoaDonCongThueEntities {
  HoaDonCongThue: typeof HoaDonCongThue;
}
declare module '../entities' {
  interface Entities extends HoaDonCongThueEntities {}
}
