import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Nhóm gom các dòng tiền lại thành cây 2 cấp trên danh mục Dòng tiền.
 *
 * Cố ý KHÔNG có `loai` (Kinh doanh / Đầu tư / Tài chính): loại hoạt động vẫn là
 * thuộc tính của từng dòng tiền (`DongTien.loai`) vì báo cáo lưu chuyển tiền tệ
 * đọc ở đó — nhóm chỉ phục vụ cách người dùng tự sắp xếp danh mục.
 */
@Entity('nhom_dong_tien')
export class NhomDongTien extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface NhomDongTienEntities {
  NhomDongTien: typeof NhomDongTien;
}

declare module '../entities' {
  interface Entities extends NhomDongTienEntities {}
}
