import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('nhom_san_pham')
export class NhomSanPham extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface NhomSanPhamEntities {
  NhomSanPham: typeof NhomSanPham;
}

declare module '../entities' {
  interface Entities extends NhomSanPhamEntities {}
}
