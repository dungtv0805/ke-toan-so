import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Ai đang đảm nhiệm một Vị trí phân quyền — mục 3.
 *
 * KHÔNG dùng `app_user_roles` vì bảng đó ràng buộc unique (userId, tenantId):
 * một người chỉ giữ được đúng một vai trò trong một công ty. Công ty nhỏ có
 * giám đốc kiêm kiểm soát kế toán thì luồng 3 cấp sẽ đứng ở cấp không ai giữ.
 * Bảng này là quan hệ nhiều–nhiều nên một người giữ được nhiều vị trí, và một
 * vị trí có nhiều người (ai đi vắng vẫn còn người duyệt).
 *
 * Mục 3 cũng nói: thay nhân sự thì chỉ đổi dòng ở đây, luồng giữ nguyên.
 */
@Entity('vi_tri_phe_duyet_nguoi_dung')
@Index('IDX_vi_tri_phe_duyet_nguoi_dung', ['tenantId', 'viTriTen'])
export class ViTriPheDuyetNguoiDung extends BaseEntity {
  /** Tên vai trò của công ty (`vai_tro.ten`). */
  @Column() viTriTen: string;

  @Column() userId: string;

  /** Chụp lại để danh sách không phải join sang bảng người dùng mỗi lần đọc. */
  @Column({ nullable: true }) hoTen?: string;

  @Column({ nullable: true }) email?: string;

  @Column({ default: true }) isActive: boolean;
}

export interface ViTriPheDuyetNguoiDungEntities {
  ViTriPheDuyetNguoiDung: typeof ViTriPheDuyetNguoiDung;
}
declare module '../entities' {
  interface Entities extends ViTriPheDuyetNguoiDungEntities {}
}
