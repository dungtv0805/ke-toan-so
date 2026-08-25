import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Bên số dư của TK nguồn được đem đi kết chuyển. */
export type BenKetChuyen = 'NO' | 'CO' | 'HAI_BEN';

/** Loại kết chuyển. Hiện chỉ chạy XAC_DINH_KQKD; để enum cho lần mở rộng sau. */
export type LoaiKetChuyen = 'XAC_DINH_KQKD';

/**
 * Một dòng khai báo "kết chuyển từ TK nào sang TK nào".
 *
 * Tên tài khoản được snapshot tại thời điểm khai để đổi tên trong danh mục Tài khoản
 * không làm sai chứng từ đã lập; mọi phép tính số tiền vẫn tra theo MÃ.
 */
@Entity('tai_khoan_ket_chuyen')
export class TaiKhoanKetChuyen extends BaseEntity {
  /** Thứ tự chạy. Nhỏ chạy trước — dòng 911 phải có thứ tự lớn nhất. */
  @Column()
  thuTu: number;

  @Column()
  ma: string;

  @Column()
  taiKhoanTu: string;

  @Column({ nullable: true })
  tenTaiKhoanTu: string;

  @Column()
  taiKhoanDen: string;

  @Column({ nullable: true })
  tenTaiKhoanDen: string;

  @Column()
  ben: BenKetChuyen;

  @Column({ default: 'XAC_DINH_KQKD' })
  loai: LoaiKetChuyen;

  @Column({ nullable: true })
  dienGiai: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface TaiKhoanKetChuyenEntities {
  TaiKhoanKetChuyen: typeof TaiKhoanKetChuyen;
}

declare module '../entities' {
  interface Entities extends TaiKhoanKetChuyenEntities {}
}
