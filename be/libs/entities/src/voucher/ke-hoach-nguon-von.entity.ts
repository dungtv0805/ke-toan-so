import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { SO_THANG } from './ke-hoach-ban-hang.entity';
import type { LoaiKeHoach } from './ke-hoach.entity';

/** Hai nhóm nguồn vốn tối thiểu theo tài liệu — cố định, không dựng danh mục. */
export const NHOM_NGUON_VON = ['NO_PHAI_TRA', 'VON_CHU_SO_HUU'] as const;

export type NhomNguonVon = (typeof NHOM_NGUON_VON)[number];

/**
 * Một dòng kế hoạch nguồn vốn = một CHỈ TIÊU nguồn vốn trong một năm.
 *
 * `thang` là BIẾN ĐỘNG trong tháng (âm = giảm), không phải số dư. Nhờ vậy quy
 * tắc chung của mọi bảng kế hoạch — Quý = tổng 3 tháng, Cả năm = tổng 12 tháng
 * — vẫn đúng nguyên. Số dư từng kỳ = `soDuDauNam` + luỹ kế biến động, tính khi
 * đọc và hiển thị ở dòng phụ dưới mỗi hàng chi tiết.
 */
@Entity('ke_hoach_nguon_von')
export class KeHoachNguonVon extends BaseEntity {
  @Column({ default: 'KE_HOACH' })
  loaiKeHoach: LoaiKeHoach;

  @Column()
  nam: number;

  @Column()
  nhom: NhomNguonVon;

  @Column()
  maChiTieu: string;

  @Column({ nullable: true })
  tenChiTieu?: string;

  /** Số dư tại 01/01 — gốc để cộng ra số dư từng kỳ. */
  @Column({ default: 0 })
  soDuDauNam: number;

  /** Cột "Giá trị/Mục tiêu" — mục tiêu biến động cả năm của chỉ tiêu. */
  @Column({ default: 0 })
  giaTriMucTieu: number;

  /** Đúng 12 phần tử, chỉ số 0 là T1. Cho phép ÂM. */
  @Column({ type: 'json', default: Array(SO_THANG).fill(0) })
  thang: number[];

  /** Cột DIỄN GIẢI. */
  @Column({ nullable: true })
  ghiChu?: string;

  @Column()
  nguoiTaoId: string;
}

export interface KeHoachNguonVonEntities {
  KeHoachNguonVon: typeof KeHoachNguonVon;
}

declare module '../entities' {
  interface Entities extends KeHoachNguonVonEntities {}
}
