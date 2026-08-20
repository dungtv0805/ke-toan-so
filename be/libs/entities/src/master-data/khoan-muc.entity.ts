import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { LoaiChiPhi } from '../config/quy-chuan.entity';

export enum KhoanMucLoai {
  CHI_PHI = 'CHI_PHI',
  DOANH_THU = 'DOANH_THU',
}

@Entity('khoan_muc')
export class KhoanMuc extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ type: 'enum', enum: KhoanMucLoai })
  loai: KhoanMucLoai;

  @Column({ nullable: true })
  nhom: string;

  /**
   * Định phí hay biến phí. Dùng chung enum với Quy chuẩn hạch toán — quy chuẩn
   * tự điền theo khoản mục đã chọn, hai chỗ lệch kiểu là số liệu lệch theo.
   */
  @Column({ type: 'enum', enum: LoaiChiPhi, nullable: true })
  loaiChiPhi?: LoaiChiPhi;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface KhoanMucEntities {
  KhoanMuc: typeof KhoanMuc;
}

declare module '../entities' {
  interface Entities extends KhoanMucEntities {}
}
