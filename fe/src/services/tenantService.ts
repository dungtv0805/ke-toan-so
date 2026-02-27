import { ServiceBase } from './base/service-base';

export interface TenantAdmin {
  id: string;
  email: string;
  hoTen: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  admins?: TenantAdmin[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTenantDto {
  name: string;
  slug: string;
  isActive?: boolean;
  admin?: {
    email: string;
    hoTen: string;
    password?: string;
  };
  adminUserId?: string; // Use existing user as admin
}

export interface UpdateTenantDto {
  name?: string;
  slug?: string;
  isActive?: boolean;
}

export interface UserOption {
  id: string;
  email: string;
  hoTen: string;
}

export interface CreateTenantResponse {
  tenant: Tenant;
  admin?: TenantAdmin;
}

export interface TenantMember {
  id: string;
  email: string;
  hoTen: string;
  role: string;
  isActive: boolean;
  membershipId: string;
}

export interface AddMemberDto {
  userId?: string;
  email?: string;
  hoTen?: string;
  password?: string;
  role: string;
}

export interface UpdateMemberDto {
  role?: string;
  isActive?: boolean;
}

class TenantService extends ServiceBase {
  constructor() {
    super({ endpoint: '/master-data/tenants' });
  }

  async getAll(): Promise<Tenant[]> {
    const response = await this.get<Tenant[]>({});
    return response.map(this.transformTenant);
  }

  async getById(id: string): Promise<Tenant> {
    const response = await this.get<Tenant>({ endpoint: `/${id}` });
    return this.transformTenant(response);
  }

  async create(data: CreateTenantDto): Promise<CreateTenantResponse> {
    const response = await this.post<{ tenant: Record<string, unknown>; admin?: Record<string, unknown> }>(data, {});
    return {
      tenant: this.transformTenant(response.tenant),
      admin: response.admin ? {
        id: (response.admin._id as string) || (response.admin.id as string),
        email: response.admin.email as string,
        hoTen: response.admin.hoTen as string,
      } : undefined,
    };
  }

  async update(id: string, data: UpdateTenantDto): Promise<Tenant> {
    const response = await this.put<Tenant>(data, { endpoint: `/${id}` });
    return this.transformTenant(response);
  }

  async delete(id: string): Promise<void> {
    await this.remove({ endpoint: `/${id}` });
  }

  async getAllUsers(): Promise<UserOption[]> {
    const response = await this.get<Array<Record<string, unknown>>>({ endpoint: '/users' });
    return response.map((u) => ({
      id: (u._id as string) || (u.id as string),
      email: u.email as string,
      hoTen: u.hoTen as string,
    }));
  }

  async getMembers(tenantId: string): Promise<TenantMember[]> {
    const response = await this.get<Array<Record<string, unknown>>>({ endpoint: `/${tenantId}/members` });
    return response.map((m) => ({
      id: (m._id as string) || (m.id as string),
      email: m.email as string,
      hoTen: m.hoTen as string,
      role: m.role as string,
      isActive: m.isActive as boolean,
      membershipId: m.membershipId as string,
    }));
  }

  async addMember(tenantId: string, data: AddMemberDto): Promise<{ user: { id: string; email: string; hoTen: string }; role: string; isNew: boolean }> {
    return this.post(data, { endpoint: `/${tenantId}/members` });
  }

  async updateMember(tenantId: string, userId: string, data: UpdateMemberDto): Promise<void> {
    await this.put(data, { endpoint: `/${tenantId}/members/${userId}` });
  }

  async removeMember(tenantId: string, userId: string): Promise<void> {
    await this.remove({ endpoint: `/${tenantId}/members/${userId}` });
  }

  private transformTenant(tenant: Record<string, unknown>): Tenant {
    const admins = tenant.admins as Array<Record<string, unknown>> | undefined;
    return {
      id: (tenant._id as string) || (tenant.id as string),
      name: tenant.name as string,
      slug: tenant.slug as string,
      isActive: tenant.isActive as boolean,
      admins: admins?.map((a) => ({
        id: (a._id as string) || (a.id as string),
        email: a.email as string,
        hoTen: a.hoTen as string,
      })),
      createdAt: tenant.createdAt as string,
      updatedAt: tenant.updatedAt as string,
    };
  }
}

export const tenantService = new TenantService();
