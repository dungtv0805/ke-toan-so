import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/**
 * Mirror of identity's tenant_apps collection.
 * Records which apps (e.g. 'ke-toan') a tenant/company has been granted.
 * Read-only from ke-toan-so — entitlement is managed by the Portal.
 */
@Entity('tenant_apps')
export class TenantApp extends BaseEntity {
  @Column() declare tenantId: string;
  @Column() appId: string;
  @Column({ default: true }) isActive: boolean;
}
