import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Chi phí cố định (định phí) hay biến đổi (biến phí). */
export enum LoaiChiPhi {
  CO_DINH = 'CO_DINH',
  BIEN_DOI = 'BIEN_DOI',
}

@Entity('quy_chuan')
export class QuyChuan extends BaseEntity {
  @Column()
  loaiGiaoDich: string;

  @Column()
  nghiepVu: string;

  @Column()
  taiKhoanNo: string;

  @Column()
  taiKhoanCo: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ type: 'simple-json', nullable: true })
  hoSoChungTu?: { id: string; ma: string; ten: string }[];

  // Bốn trường phân bổ, lưu MÃ (giống taiKhoanNo/taiKhoanCo) chứ không lưu id.
  // Đều nullable: bắt buộc hay không do `fieldRules` của TK Nợ/TK Có quyết định,
  // và quy chuẩn cũ tạo trước thay đổi này vẫn phải đọc được.
  @Column({ nullable: true })
  nhomKhoanMuc?: string;

  @Column({ nullable: true })
  khoanMuc?: string;

  @Column({ nullable: true })
  dongTien?: string;

  @Column({ type: 'enum', enum: LoaiChiPhi, nullable: true })
  loaiChiPhi?: LoaiChiPhi;

  @Column({ default: true })
  isActive: boolean;
}

export interface QuyChaunEntities {
  QuyChuan: typeof QuyChuan;
}

declare module '../entities' {
  interface Entities extends QuyChaunEntities {}
}
