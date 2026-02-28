import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ unique: true, nullable: true })
  maSoThue: string;

  @Column({ nullable: true })
  diaChi: string;

  @Column({ nullable: true })
  dienThoai: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  nguoiDaiDien: string;

  @Column({ default: true })
  isActive: boolean;
}
