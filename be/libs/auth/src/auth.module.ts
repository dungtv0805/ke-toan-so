import { Module, Global } from '@nestjs/common';
import { JwtService } from './services/jwt.service';
import { JwtGuard } from './guards/jwt.guard';
import { RoleGuard } from './guards/role.guard';
import { PermissionGuard } from './guards/permission.guard';

@Global()
@Module({
  providers: [JwtService, JwtGuard, RoleGuard, PermissionGuard],
  exports: [JwtService, JwtGuard, RoleGuard, PermissionGuard],
})
export class AuthModule {}
