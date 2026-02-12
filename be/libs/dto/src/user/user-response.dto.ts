import { UserRole, UserStatus } from '@app/entities';

export class UserTenantResponseDto {
  tenantId: string;
  role: UserRole;
}

export class UserResponseDto {
  id: string;
  email: string;
  hoTen: string;
  tenants: UserTenantResponseDto[];
  trangThai: UserStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
