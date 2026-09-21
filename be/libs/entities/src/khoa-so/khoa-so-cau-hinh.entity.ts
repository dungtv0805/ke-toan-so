import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type KyKhoaSo = 'NGAY' | 'TUAN' | 'THANG' | 'QUY' | 'NAM';

@Entity('khoa_so_cau_hinh')
export class KhoaSoCauHinh extends BaseEntity {
  @Column({ nullable: true })
  chiNhanhId?: string;

  @Column()
  kyKhoaSo: KyKhoaSo;

  @Column()
  gioThucHien: string;

  @Column({ default: false })
  isActive: boolean;
}

export interface KhoaSoCauHinhEntities {
  KhoaSoCauHinh: typeof KhoaSoCauHinh;
}

declare module '../entities' {
  interface Entities extends KhoaSoCauHinhEntities {}
}
