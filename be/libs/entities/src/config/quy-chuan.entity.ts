import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

// Legacy enum - kept for backward compatibility
export enum LoaiGiaoDich {
  PHIEU_THU = 'PHIEU_THU',
  PHIEU_CHI = 'PHIEU_CHI',
  BAO_CO = 'BAO_CO',
  BAO_NO = 'BAO_NO',
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

  @Column({ default: true })
  isActive: boolean;
}

export interface QuyChaunEntities {
  QuyChuan: typeof QuyChuan;
}

declare module '../entities' {
  interface Entities extends QuyChaunEntities {}
}
