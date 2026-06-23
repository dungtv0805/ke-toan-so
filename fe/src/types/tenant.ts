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
  // Lĩnh vực (module) công ty được cấp, vd ['KE_TOAN','KHO'].
  modules?: string[];
}

export interface TenantInfo {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
  // Lĩnh vực (module) công ty được cấp. BE luôn trả; optional để chịu data cũ.
  modules?: string[];
}

export interface UserTenant {
  tenantId: string;
  role: string;
}
