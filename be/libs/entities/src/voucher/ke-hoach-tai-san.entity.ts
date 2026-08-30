import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { SO_THANG, type MucDanhMucKeHoach } from './ke-hoach-ban-hang.entity';
import type { LoaiKeHoach } from './ke-hoach.entity';

/**
 * Một dòng kế hoạch tài sản = một TÀI SẢN dự kiến trang bị cho một bộ phận,
 * trong một năm.
 *
 * Mã và tên tài sản gõ tự do, giống `maViTri` của bảng Nhân sự: master-data
 * không có danh mục tài sản, mà kế hoạch tài sản chủ yếu là thứ SẼ mua nên
 * chưa tồn tại trong bất kỳ danh mục nào.
 *
 * Cấp cha là bộ phận, nhưng cột hiển thị mang nhãn "NƠI SỬ DỤNG".
 */
@Entity('ke_hoach_tai_san')
export class KeHoachTaiSan extends BaseEntity {
  @Column({ default: 'KE_HOACH' })
  loaiKeHoach: LoaiKeHoach;

  @Column()
  nam: number;

  @Column({ type: 'simple-json' })
  boPhan: MucDanhMucKeHoach;

  @Column()
  maTaiSan: string;

  @Column({ nullable: true })
  tenTaiSan?: string;

  @Column({ default: 0 })
  soLuong: number;

  @Column({ default: 0 })
  giaBinhQuan: number;

  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  @Column({ type: 'json', default: Array(SO_THANG).fill(0) })
  thang: number[];

  /** Cột DIỄN GIẢI. */
  @Column({ nullable: true })
  ghiChu?: string;

  @Column()
  nguoiTaoId: string;
}

export interface KeHoachTaiSanEntities {
  KeHoachTaiSan: typeof KeHoachTaiSan;
}

declare module '../entities' {
  interface Entities extends KeHoachTaiSanEntities {}
}
