import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { SO_THANG, type MucDanhMucKeHoach } from './ke-hoach-ban-hang.entity';
import type { LoaiKeHoach } from './ke-hoach.entity';

/**
 * Chiều của một dòng tiền kế hoạch.
 *
 * KHÔNG suy được từ danh mục: `DongTien.loai` là Kinh doanh / Đầu tư / Tài chính
 * (phục vụ báo cáo lưu chuyển tiền tệ), không phải Thu / Chi. Vì vậy người lập
 * kế hoạch chọn chiều ngay trên từng dòng.
 */
export type ChieuDongTien = 'THU' | 'CHI';

/**
 * Một dòng kế hoạch dòng tiền = một DÒNG TIỀN trong một năm, một loại kế hoạch.
 *
 * Năm dòng tổng hợp của bảng (Tồn đầu kỳ, Thu trong kỳ, Chi trong kỳ, Tồn cuối
 * kỳ, Thặng dư/Thâm hụt) KHÔNG có bản ghi — chúng được tính khi đọc, xem
 * `dongTongHopDongTien` phía hiển thị.
 */
@Entity('ke_hoach_dong_tien')
export class KeHoachDongTien extends BaseEntity {
  @Column({ default: 'KE_HOACH' })
  loaiKeHoach: LoaiKeHoach;

  @Column()
  nam: number;

  @Column({ type: 'simple-json' })
  nhomDongTien: MucDanhMucKeHoach;

  @Column({ type: 'simple-json' })
  dongTien: MucDanhMucKeHoach;

  @Column()
  chieu: ChieuDongTien;

  /** Cột "Giá trị/Mục tiêu" — mục tiêu năm của dòng. */
  @Column({ default: 0 })
  giaTriMucTieu: number;

  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  @Column({ type: 'json', default: Array(SO_THANG).fill(0) })
  thang: number[];

  /** Cột DIỄN GIẢI. */
  @Column({ nullable: true })
  ghiChu?: string;

  @Column()
  nguoiTaoId: string;
}

export interface KeHoachDongTienEntities {
  KeHoachDongTien: typeof KeHoachDongTien;
}

declare module '../entities' {
  interface Entities extends KeHoachDongTienEntities {}
}
