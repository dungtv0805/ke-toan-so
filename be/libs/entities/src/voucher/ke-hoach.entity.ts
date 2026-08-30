import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { DanhMuc } from './chung-tu.entity';

// KE_HOACH: số kế hoạch chốt đầu kỳ. DU_BAO: số dự báo cập nhật trong kỳ.
// Hai màn hình /trung-tam-du-lieu/ke-hoach và /du-bao dùng chung collection này.
export type LoaiKeHoach = 'KE_HOACH' | 'DU_BAO';

/** Năm bảng chi tiết có thể sinh ra dòng hạch toán kế hoạch. */
export const BANG_KE_HOACH_NGUON = [
  'BAN_HANG',
  'NHAN_SU',
  'DONG_TIEN',
  'TAI_SAN',
  'NGUON_VON',
] as const;

export type BangKeHoachNguon = (typeof BANG_KE_HOACH_NGUON)[number];

/** Phiên bản mặc định khi người dùng không đặt tên bản kế hoạch. */
export const PHIEN_BAN_MAC_DINH = 'Mặc định';

/**
 * Một dòng kế hoạch — cấu trúc soi gương `ChungTu` (mỗi dòng là một bút toán dự kiến:
 * TK Nợ / TK Có / số tiền + đủ các chiều phân tích) để báo cáo kế hoạch và báo cáo
 * thực hiện gom được bằng cùng một logic.
 *
 * KHÔNG có `soPhieu`, `hoSoChungTu`, `kiemSoat` — kế hoạch không phát sinh chứng từ.
 */
@Entity('ke_hoach')
export class KeHoachDong extends BaseEntity {
  @Column()
  loaiKeHoach: LoaiKeHoach;

  // Nhiều bản kế hoạch cho cùng một kỳ: "KH 2026 gốc", "KH điều chỉnh Q3"...
  @Column()
  phienBan: string;

  // Ngày phát sinh dự kiến.
  @Column()
  ngay: Date;

  @Column()
  soTien: number;

  // Diễn giải.
  @Column()
  noiDung: string;

  @Column({ nullable: true })
  ghiChu?: string;

  @Column()
  nguoiTaoId: string;

  /**
   * Bảng chi tiết đã SINH RA dòng này. Không có = người dùng tự nhập ở tab
   * Chi tiết.
   *
   * Engine đồng bộ chỉ được đụng vào dòng CÓ `nguonId`: dòng nhập tay không
   * bao giờ bị xoá khi lưu lại một bảng chi tiết.
   */
  @Column({ nullable: true })
  nguonLoai?: BangKeHoachNguon;

  /** Id của dòng trong bảng chi tiết tương ứng. */
  @Column({ nullable: true })
  nguonId?: string;

  // Dùng lại nguyên interface danh mục của chứng từ (nghiệp vụ, TK Nợ/Có, đối tượng,
  // chủ đầu tư, dự án, sản phẩm, bộ phận, đội, nhân viên, dòng tiền, khoản mục,
  // nhóm quản lý). Nhóm khoản mục suy từ `khoanMuc.nhom`, không lưu riêng.
  @Column({ type: 'simple-json', nullable: true })
  danhMuc: DanhMuc;
}

export interface KeHoachEntities {
  KeHoachDong: typeof KeHoachDong;
}

declare module '../entities' {
  interface Entities extends KeHoachEntities {}
}
