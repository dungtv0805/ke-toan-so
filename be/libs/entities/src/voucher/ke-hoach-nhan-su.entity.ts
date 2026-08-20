import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { MucDanhMucKeHoach } from './ke-hoach-ban-hang.entity';

/** Sáu loại chi phí nhân sự — cố định, khớp cột LCHINH…THUONGCN của sheet thiết kế. */
export interface ChiPhiNhanSu {
  luongChinh: number;
  luongKpi: number;
  thuongDoanhSo: number;
  baoHiem: number;
  daoTao: number;
  thuongCongNhan: number;
}

export const CHI_PHI_NHAN_SU_KEYS: (keyof ChiPhiNhanSu)[] = [
  'luongChinh',
  'luongKpi',
  'thuongDoanhSo',
  'baoHiem',
  'daoTao',
  'thuongCongNhan',
];

/**
 * Một dòng kế hoạch nhân sự = một CHỨC VỤ trong một bộ phận, trong một năm.
 *
 * Cấp 1 (bộ phận) không có bản ghi riêng — suy ra từ `boPhan` của các dòng con.
 * CỘNG, quý, %, hàng bộ phận, hàng tổng đều tính khi đọc.
 */
@Entity('ke_hoach_nhan_su')
export class KeHoachNhanSu extends BaseEntity {
  @Column()
  nam: number;

  @Column({ type: 'simple-json' })
  boPhan: MucDanhMucKeHoach;

  /** Mã vị trí gõ tự do: GD, PGD, TROLY… */
  @Column()
  maViTri: string;

  @Column({ nullable: true })
  tenChucVu?: string;

  @Column({ type: 'simple-json' })
  chiPhi: ChiPhiNhanSu;

  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  @Column({ type: 'simple-array' })
  thang: number[];

  @Column({ nullable: true })
  ghiChu?: string;

  @Column()
  nguoiTaoId: string;
}

export interface KeHoachNhanSuEntities {
  KeHoachNhanSu: typeof KeHoachNhanSu;
}

declare module '../entities' {
  interface Entities extends KeHoachNhanSuEntities {}
}
