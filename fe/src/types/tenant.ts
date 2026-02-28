export interface Tenant {
  id: string;
  name: string;
  slug: string;
  maSoThue?: string;
  diaChi?: string;
  dienThoai?: string;
  email?: string;
  nguoiDaiDien?: string;
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
