import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
// Dùng lại type đã có ở entity Kế hoạch dòng tiền thay vì khai bản sao — khai
// trùng tên thì `libs/entities/src/index.ts` (export * cả hai thư mục) hỏng build.
import type { ChieuDongTien } from '../voucher/ke-hoach-dong-tien.entity';

/**
 * Nhóm gom các dòng tiền lại thành cây 2 cấp trên danh mục Dòng tiền.
 *
 * Cố ý KHÔNG có `loai` (Kinh doanh / Đầu tư / Tài chính): loại hoạt động vẫn là
 * thuộc tính của từng dòng tiền (`DongTien.loai`) vì báo cáo lưu chuyển tiền tệ
 * đọc ở đó — nhóm chỉ phục vụ cách người dùng tự sắp xếp danh mục.
 *
 * NHƯNG có `chieu` (Thu / Chi) — đây là thứ KHÁC HẲN `loai`. Trước 02/09/2026
 * không danh mục nào mang chiều tiền, nên bảng Kế hoạch dòng tiền phải bắt người
 * dùng chọn Thu/Chi lại trên TỪNG DÒNG kế hoạch. Chiều là thuộc tính cố hữu của
 * nhóm ("Thu từ bán hàng" không bao giờ là chi), khai một lần ở đây thì mọi kỳ
 * kế hoạch sau đó tự suy ra.
 *
 * Không suy được từ mã hay tên: 76 nhóm đang có tiền tố lẫn lộn C/N/NC/NT/T và
 * có nhóm `N01 "Chi cho nhà cung cấp"` — tiền tố N nhưng là Chi.
 */
@Entity('nhom_dong_tien')
export class NhomDongTien extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  /** Chiều tiền của nhóm. Bỏ trống = chưa khai, phía dùng phải tự có phương án dự phòng. */
  @Column({ nullable: true })
  chieu?: ChieuDongTien;

  @Column({ default: true })
  isActive: boolean;
}

export interface NhomDongTienEntities {
  NhomDongTien: typeof NhomDongTien;
}

declare module '../entities' {
  interface Entities extends NhomDongTienEntities {}
}
