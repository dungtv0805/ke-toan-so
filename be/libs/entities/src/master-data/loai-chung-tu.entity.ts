import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('loai_chung_tu')
export class LoaiChungTuMaster extends BaseEntity {
  @Column()
  ma: string;

  @Column()
  ten: string;

  @Column({ nullable: true })
  moTa: string;

  @Column({ default: true })
  isActive: boolean;
}

export interface LoaiChungTuMasterEntities {
  LoaiChungTuMaster: typeof LoaiChungTuMaster;
}

declare module '../entities' {
  interface Entities extends LoaiChungTuMasterEntities {}
}
