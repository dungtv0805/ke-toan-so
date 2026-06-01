import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('so_du_dau_ky')
export class SoDuDauKy extends BaseEntity {
  @Column()
  maTaiKhoan: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  duNo: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  duCo: number;

  @Column({ type: 'timestamp', nullable: true })
  ngayApDung: Date;
}

export interface SoDuDauKyEntities {
  SoDuDauKy: typeof SoDuDauKy;
}

declare module '../entities' {
  interface Entities extends SoDuDauKyEntities {}
}
