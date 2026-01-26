import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('loai_giao_dich')
export class LoaiGiaoDich extends BaseEntity {
  @Column({ unique: true })
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface LoaiGiaoDichEntities {
  LoaiGiaoDich: typeof LoaiGiaoDich;
}

declare module '../entities' {
  interface Entities extends LoaiGiaoDichEntities {}
}
