import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { Glossary } from '../nganh/nganh.entity';

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

  // Lĩnh vực (module) công ty được cấp, vd ['KE_TOAN','KHO'].
  // Tầng entitlement (công ty đã mua gì) — độc lập với role/permission.
  @Column({ type: 'json', default: ['KE_TOAN'] })
  modules: string[];

  // Ngành (vd 'XAY_DUNG') — quyết định nhãn hiển thị.
  @Column({ nullable: true })
  nganh?: string | null;

  // Từ điển nhãn của công ty (clone từ Nganh khi gán ngành, sửa riêng được).
  @Column({ type: 'json', default: {} })
  glossary: Glossary;
}
