export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
}

export interface UserTenant {
  tenantId: string;
  role: string;
}
