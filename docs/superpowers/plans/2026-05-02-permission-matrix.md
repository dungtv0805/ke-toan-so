# Permission Matrix Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan. Steps use checkbox syntax for tracking.

**Goal:** Build a permission matrix UI (module x action checkboxes) with role management page and BE guard bypass.

**Architecture:** Two new FE pages using CHanlder pattern — "Quản lý Vai trò" for CRUD roles and "Phân quyền" for the permission matrix. BE guards bypassed with early return true.

**Tech Stack:** React 18, TypeScript, Ant Design, CHanlder pattern, NestJS guards

**Spec:** `docs/superpowers/specs/2026-05-02-permission-matrix-design.md`

---

## Task 1: BE Guard Bypass

**Files:**
- Modify: `be/libs/auth/src/guards/role.guard.ts`
- Modify: `be/libs/auth/src/guards/permission.guard.ts`

- [ ] **Step 1: Bypass RoleGuard**

Add `return true` at the top of `canActivate()` in `be/libs/auth/src/guards/role.guard.ts`:

```typescript
canActivate(context: ExecutionContext): boolean {
  // TEMPORARY: Bypass all role checks until permission system is complete
  return true;

  const requiredRoles = this.reflector.getAllAndOverride<string[]>(
    ROLES_KEY,
    [context.getHandler(), context.getClass()],
  );
  // ... rest unchanged
}
```

- [ ] **Step 2: Bypass PermissionGuard**

Add `return true` at the top of `canActivate()` in `be/libs/auth/src/guards/permission.guard.ts`:

```typescript
canActivate(context: ExecutionContext): boolean {
  // TEMPORARY: Bypass all permission checks until permission system is complete
  return true;

  const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
    PERMISSIONS_KEY,
    [context.getHandler(), context.getClass()],
  );
  // ... rest unchanged
}
```

- [ ] **Step 3: Commit**

```bash
git add be/libs/auth/src/guards/role.guard.ts be/libs/auth/src/guards/permission.guard.ts
git commit -m "[phan-quyen] bypass RoleGuard and PermissionGuard temporarily"
```

---
