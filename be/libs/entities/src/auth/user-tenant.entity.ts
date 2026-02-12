import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../base.entity';
import { UserRole } from './user.entity';

/**
 * UserTenant - Stores user membership in tenants
 * Each record represents a user's role in a specific tenant
 * Note: This entity uses tenantId differently - it references the tenant the user belongs to,
 * not for multi-tenant filtering (this entity is tenant-exempt)
 */
@Entity('user_tenants')
@Index('IDX_user_tenant_unique', ['userId', 'tenantId'], { unique: true })
export class UserTenant extends BaseEntity {
  @Column()
  userId: string;

  // Override base tenantId - here it means "which tenant this user belongs to"
  @Column()
  declare tenantId: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.KIEM_SOAT })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;
}

export interface UserTenantEntities {
  UserTenant: typeof UserTenant;
}

declare module '../entities' {
  interface Entities extends UserTenantEntities {}
}
