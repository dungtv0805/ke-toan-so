import { Module, Global } from '@nestjs/common';
import { JwtService } from './services/jwt.service';
import { JwtGuard } from './guards/jwt.guard';
import { RoleGuard } from './guards/role.guard';
import { PermissionGuard } from './guards/permission.guard';
import { TenantActiveGuard } from './guards/tenant-active.guard';

@Global()
@Module({
  providers: [JwtService, JwtGuard, RoleGuard, PermissionGuard, TenantActiveGuard],
  exports: [JwtService, JwtGuard, RoleGuard, PermissionGuard, TenantActiveGuard],
})
export class AuthModule {}
