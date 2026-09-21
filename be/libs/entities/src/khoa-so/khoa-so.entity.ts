import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type NguonKhoaSo = 'TU_DONG' | 'THU_CONG';

@Entity('khoa_so')
export class KhoaSo extends BaseEntity {
  @Column({ nullable: true })
  loaiChungTuMa?: string;

  @Column({ nullable: true })
  chiNhanhId?: string;

  @Column()
  ngayKhoaSo: Date;

  @Column({ type: 'simple-json', nullable: true })
  nguoiDungBiKhoa?: string[];

  @Column({ nullable: true })
  dienGiai?: string;

  @Column({ default: false })
  coXuLyChuaGhiSo: boolean;

  @Column()
  nguon: NguonKhoaSo;

  @Column()
  nguoiTaoId: string;
}

export interface KhoaSoEntities {
  KhoaSo: typeof KhoaSo;
}

declare module '../entities' {
  interface Entities extends KhoaSoEntities {}
}
