import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { DanhMucTaiKhoan } from './chung-tu.entity';
import type { BangKeHoachNguon } from './ke-hoach.entity';

/**
 * Cặp tài khoản Nợ/Có dùng khi sinh dòng hạch toán kế hoạch từ một bảng chi tiết.
 *
 * Tài liệu yêu cầu không quy định cặp tài khoản nào — nên đây là CẤU HÌNH theo
 * công ty, có bộ mặc định seed sẵn để hệ thống chạy được ngay, nghiệp vụ chỉnh
 * sau mà không phải sửa code.
 *
 * `phanLoai` chỉ dùng cho bảng có nhiều chiều định khoản khác nhau:
 *   DONG_TIEN  → 'THU' | 'CHI'
 *   NGUON_VON  → 'NO_PHAI_TRA' | 'VON_CHU_SO_HUU'
 * Ba bảng còn lại để trống.
 */
@Entity('cau_hinh_dinh_khoan_ke_hoach')
export class CauHinhDinhKhoanKeHoach extends BaseEntity {
  @Column()
  bang: BangKeHoachNguon;

  @Column({ nullable: true })
  phanLoai?: string;

  @Column({ type: 'simple-json' })
  taiKhoanNo: DanhMucTaiKhoan;

  @Column({ type: 'simple-json' })
  taiKhoanCo: DanhMucTaiKhoan;
}

export interface CauHinhDinhKhoanKeHoachEntities {
  CauHinhDinhKhoanKeHoach: typeof CauHinhDinhKhoanKeHoach;
}

declare module '../entities' {
  interface Entities extends CauHinhDinhKhoanKeHoachEntities {}
}
