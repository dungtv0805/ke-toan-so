import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SUPER_ADMIN_EMAIL } from '@app/entities';
import { TenantAdminGuard } from './tenant-admin.guard';

const TENANT_ID = 'tenant-1';

function ctx(user: any, params: any = { id: TENANT_ID }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user, params }) }),
  } as unknown as ExecutionContext;
}

describe('TenantAdminGuard', () => {
  let repo: any;
  let guard: TenantAdminGuard;

  beforeEach(() => {
    repo = { findOne: jest.fn() };
    guard = new TenantAdminGuard(repo);
  });

  it('cho phép Super Admin bỏ qua kiểm tra', async () => {
    await expect(guard.canActivate(ctx({ email: SUPER_ADMIN_EMAIL, id: 'u1' }))).resolves.toBe(true);
    expect(repo.findOne).not.toHaveBeenCalled();
  });

  it('cho phép user là Admin (role "Admin") của tenant', async () => {
    repo.findOne.mockResolvedValue({ userId: 'u1', tenantId: TENANT_ID, role: 'Admin', isActive: true });
    await expect(guard.canActivate(ctx({ email: 'a@b.com', id: 'u1' }))).resolves.toBe(true);
    // xác nhận query dùng role 'Admin' (đúng casing), không phải 'ADMIN'
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ role: 'Admin', tenantId: TENANT_ID, userId: 'u1', isActive: true }) }),
    );
  });

  it('chặn user không phải admin trong tenant', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(guard.canActivate(ctx({ email: 'a@b.com', id: 'u1' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('chặn Admin của tenant khác (IDOR)', async () => {
    // caller is Admin of tenant-B, but acts on tenant-A (params.id = TENANT_ID)
    // guard queries { tenantId: TENANT_ID, ... } → no membership → null
    repo.findOne.mockResolvedValue(null);
    await expect(
      guard.canActivate(ctx({ email: 'a@b.com', id: 'u1' }, { id: TENANT_ID })),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ tenantId: TENANT_ID }) }),
    );
  });

  it('chặn khi không có thông tin user', async () => {
    await expect(guard.canActivate(ctx(undefined))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
