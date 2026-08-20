import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Số tháng trong một bản kế hoạch năm. */
export const SO_THANG = 12;

/**
 * Một mục danh mục được chụp lại lúc lưu — giữ mã/tên để bảng vẫn đọc được
 * kể cả khi danh mục gốc đổi tên về sau.
 */
export interface MucDanhMucKeHoach {
  id: string;
  ma: string;
  ten: string;
}

/**
 * Một dòng kế hoạch bán hàng = một SẢN PHẨM trong một năm.
 *
 * Cấp 1 (nhóm sản phẩm) không có bản ghi riêng — nhóm hiện ra vì có sản phẩm
 * thuộc nhóm đó. Doanh thu, quý, %, hàng nhóm, hàng tổng đều tính khi đọc.
 */
@Entity('ke_hoach_ban_hang')
export class KeHoachBanHang extends BaseEntity {
  @Column()
  nam: number;

  @Column({ type: 'simple-json' })
  nhomSanPham: MucDanhMucKeHoach;

  @Column({ type: 'simple-json' })
  sanPham: MucDanhMucKeHoach;

  @Column()
  luong: number;

  @Column()
  giaBinhQuan: number;

  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  @Column({ type: 'json', default: Array(SO_THANG).fill(0) })
  thang: number[];

  @Column({ nullable: true })
  ghiChu?: string;

  @Column()
  nguoiTaoId: string;
}

export interface KeHoachBanHangEntities {
  KeHoachBanHang: typeof KeHoachBanHang;
}

declare module '../entities' {
  interface Entities extends KeHoachBanHangEntities {}
}
