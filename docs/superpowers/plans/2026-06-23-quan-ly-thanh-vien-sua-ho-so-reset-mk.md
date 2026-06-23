# Quản lý thành viên: sửa họ tên/email + reset mật khẩu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép admin sửa họ tên/email của thành viên và reset mật khẩu thành viên về mặc định (123456) ngay trên trang Cấu hình → Thành viên.

**Architecture:** Toàn bộ logic backend nằm trong `master-data-service/tenant` (service đã có sẵn `userRepository` + `credentialRepository`, và trang đang gọi đúng các API `master-data/tenants/:id/members`). Frontend mở rộng modal "Sửa" và thêm icon reset trong cột thao tác, gate bằng `hasPermission`.

**Tech Stack:** NestJS 11 + TypeORM (MongoDB raw repositories), bcrypt, Jest; React 18 + TypeScript + Ant Design.

## Global Constraints

- BE microservice: master-data-service. Repos inject qua raw token `RAW_${Entity}` (`RAW_REPOSITORY_TOKEN_PREFIX = 'RAW_'`).
- Mật khẩu mặc định: `123456`. Hash bằng `bcrypt`, `SALT_ROUNDS = 10` (đã khai báo trong `tenant.service.ts`).
- Email luôn lưu lowercase.
- Endpoint mới giữ `JwtGuard` (theo đúng các endpoint member hiện có). Phân quyền thực thi ở FE bằng `hasPermission('/cau-hinh/thanh-vien:sua')`.
- DTO tenant tự động được export qua `libs/dto/src/tenant/index.ts` (`export * from './tenant-member.dto'`).
- Chạy lệnh BE từ thư mục `be/`; lệnh FE từ thư mục `fe/`.

---

### Task 1: DTO + service `updateMemberProfile` (sửa họ tên/email)

**Files:**
- Modify: `be/libs/dto/src/tenant/tenant-member.dto.ts`
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.ts`
- Test: `be/apps/master-data-service/src/tenant/tenant.service.spec.ts` (create)

**Interfaces:**
- Consumes: `User`, `UserTenant` entities; `RAW_REPOSITORY_TOKEN_PREFIX` từ `@app/database`.
- Produces:
  - `class UpdateMemberProfileDto { hoTen?: string; email?: string }`
  - `TenantService.updateMemberProfile(tenantId: string, userId: string, dto: UpdateMemberProfileDto): Promise<{ id: string; email: string; hoTen: string }>`

- [ ] **Step 1: Thêm DTO**

Vào cuối `be/libs/dto/src/tenant/tenant-member.dto.ts`, thêm class mới (file đã import sẵn `IsString`, `IsOptional`, `IsEmail`, `IsNotEmpty`):

```ts
export class UpdateMemberProfileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  hoTen?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
```

- [ ] **Step 2: Viết test thất bại**

Tạo `be/apps/master-data-service/src/tenant/tenant.service.spec.ts`:

```ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { RAW_REPOSITORY_TOKEN_PREFIX } from '@app/database';
import { TenantService } from './tenant.service';

const USER_ID = '507f1f77bcf86cd799439011';
const OTHER_USER_ID = '507f1f77bcf86cd799439099';
const TENANT_ID = 'tenant-1';

function makeUser(overrides: any = {}) {
  return {
    _id: { toString: () => USER_ID },
    email: 'old@example.com',
    hoTen: 'Old Name',
    isActive: true,
    ...overrides,
  };
}

describe('TenantService - member profile & password', () => {
  let service: TenantService;
  let userRepo: any;
  let credentialRepo: any;
  let userTenantRepo: any;

  beforeEach(async () => {
    userRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    credentialRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    userTenantRepo = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
    const stub = { find: jest.fn(), findOne: jest.fn(), create: jest.fn(), save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantService,
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}Tenant`, useValue: stub },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}User`, useValue: userRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}UserCredential`, useValue: credentialRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}UserTenant`, useValue: userTenantRepo },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}VaiTro`, useValue: stub },
        { provide: `${RAW_REPOSITORY_TOKEN_PREFIX}PhanQuyen`, useValue: stub },
      ],
    }).compile();

    service = module.get<TenantService>(TenantService);
  });

  describe('updateMemberProfile', () => {
    it('cập nhật hoTen và email (lowercase)', async () => {
      userTenantRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, isActive: true });
      const user = makeUser();
      userRepo.findOne
        .mockResolvedValueOnce(user)        // load user by _id
        .mockResolvedValueOnce(null);       // email dup check -> none
      userRepo.save.mockImplementation(async (u: any) => u);

      const result = await service.updateMemberProfile(TENANT_ID, USER_ID, {
        hoTen: 'New Name',
        email: 'NEW@Example.com',
      });

      expect(user.hoTen).toBe('New Name');
      expect(user.email).toBe('new@example.com');
      expect(result).toEqual({ id: USER_ID, email: 'new@example.com', hoTen: 'New Name' });
    });

    it('ném NotFound khi không phải thành viên của tenant', async () => {
      userTenantRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateMemberProfile(TENANT_ID, USER_ID, { hoTen: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ném Conflict khi email đã thuộc user khác', async () => {
      userTenantRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, isActive: true });
      userRepo.findOne
        .mockResolvedValueOnce(makeUser())  // load user
        .mockResolvedValueOnce({ _id: { toString: () => OTHER_USER_ID }, email: 'taken@example.com' });
      await expect(
        service.updateMemberProfile(TENANT_ID, USER_ID, { email: 'taken@example.com' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
```

- [ ] **Step 3: Chạy test để xác nhận FAIL**

Run: `cd be && yarn jest tenant.service --silent`
Expected: FAIL — `service.updateMemberProfile is not a function`.

- [ ] **Step 4: Cài đặt service method**

Trong `be/apps/master-data-service/src/tenant/tenant.service.ts`, thêm import DTO ở dòng import từ `@app/dto`:

```ts
import {
  CreateTenantDto,
  UpdateTenantDto,
  AddUserToTenantDto,
  UpdateTenantMemberDto,
  UpdateMemberProfileDto,
} from '@app/dto';
```

Thêm method (đặt ngay sau `updateTenantMember`):

```ts
async updateMemberProfile(
  tenantId: string,
  userId: string,
  dto: UpdateMemberProfileDto,
): Promise<{ id: string; email: string; hoTen: string }> {
  const membership = await this.userTenantRepository.findOne({
    where: { tenantId, userId, isActive: true },
  });
  if (!membership) {
    throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
  }

  const { ObjectId } = await import('mongodb');
  const user = await this.userRepository.findOne({
    where: { _id: new ObjectId(userId) as any },
  });
  if (!user) {
    throw new NotFoundException('Không tìm thấy người dùng');
  }

  if (dto.email) {
    const email = dto.email.toLowerCase();
    if (email !== user.email) {
      const existing = await this.userRepository.findOne({ where: { email } });
      if (existing && existing._id.toString() !== userId) {
        throw new ConflictException('Email đã được sử dụng');
      }
      user.email = email;
    }
  }
  if (dto.hoTen !== undefined) {
    user.hoTen = dto.hoTen;
  }

  const saved = await this.userRepository.save(user);
  return { id: saved._id.toString(), email: saved.email, hoTen: saved.hoTen };
}
```

- [ ] **Step 5: Chạy test để xác nhận PASS**

Run: `cd be && yarn jest tenant.service --silent`
Expected: PASS (3 test trong `updateMemberProfile`).

- [ ] **Step 6: Commit**

```bash
git add be/libs/dto/src/tenant/tenant-member.dto.ts be/apps/master-data-service/src/tenant/tenant.service.ts be/apps/master-data-service/src/tenant/tenant.service.spec.ts
git commit -m "feat(tenant): updateMemberProfile - sửa họ tên/email thành viên"
```

---

### Task 2: Service `resetMemberPassword`

**Files:**
- Modify: `be/apps/master-data-service/src/tenant/tenant.service.ts`
- Test: `be/apps/master-data-service/src/tenant/tenant.service.spec.ts` (thêm describe)

**Interfaces:**
- Consumes: `UserCredential`, `UserTenant` entities; hằng `DEFAULT_PASSWORD`, `SALT_ROUNDS` đã có trong file.
- Produces: `TenantService.resetMemberPassword(tenantId: string, userId: string): Promise<{ defaultPassword: string }>`

- [ ] **Step 1: Viết test thất bại**

Thêm vào trong `describe('TenantService - member profile & password', ...)` của `tenant.service.spec.ts` (sau describe `updateMemberProfile`):

```ts
describe('resetMemberPassword', () => {
  it('reset credential hiện có về mật khẩu mặc định 123456', async () => {
    userTenantRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, isActive: true });
    const credential = { userId: USER_ID, password: 'old-hash', isActive: true };
    credentialRepo.findOne.mockResolvedValue(credential);
    credentialRepo.save.mockImplementation(async (c: any) => c);

    const result = await service.resetMemberPassword(TENANT_ID, USER_ID);

    expect(result).toEqual({ defaultPassword: '123456' });
    expect(credentialRepo.save).toHaveBeenCalledWith(credential);
    await expect(bcrypt.compare('123456', credential.password)).resolves.toBe(true);
  });

  it('tạo credential mới nếu user chưa có', async () => {
    userTenantRepo.findOne.mockResolvedValue({ userId: USER_ID, tenantId: TENANT_ID, isActive: true });
    credentialRepo.findOne.mockResolvedValue(null);
    credentialRepo.create.mockImplementation((c: any) => c);
    credentialRepo.save.mockImplementation(async (c: any) => c);

    await service.resetMemberPassword(TENANT_ID, USER_ID);

    expect(credentialRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: USER_ID, isActive: true }),
    );
    expect(credentialRepo.save).toHaveBeenCalled();
  });

  it('ném NotFound khi không phải thành viên của tenant', async () => {
    userTenantRepo.findOne.mockResolvedValue(null);
    await expect(
      service.resetMemberPassword(TENANT_ID, USER_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận FAIL**

Run: `cd be && yarn jest tenant.service --silent`
Expected: FAIL — `service.resetMemberPassword is not a function`.

- [ ] **Step 3: Cài đặt service method**

Trong `tenant.service.ts`, thêm method ngay sau `updateMemberProfile`:

```ts
async resetMemberPassword(
  tenantId: string,
  userId: string,
): Promise<{ defaultPassword: string }> {
  const membership = await this.userTenantRepository.findOne({
    where: { tenantId, userId, isActive: true },
  });
  if (!membership) {
    throw new NotFoundException('Không tìm thấy thành viên trong công ty này');
  }

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  let credential = await this.credentialRepository.findOne({
    where: { userId },
  });
  if (credential) {
    credential.password = hashedPassword;
  } else {
    credential = this.credentialRepository.create({
      userId,
      password: hashedPassword,
      isActive: true,
    });
  }
  await this.credentialRepository.save(credential);

  return { defaultPassword: DEFAULT_PASSWORD };
}
```

- [ ] **Step 4: Chạy test để xác nhận PASS**

Run: `cd be && yarn jest tenant.service --silent`
Expected: PASS (toàn bộ 6 test).

- [ ] **Step 5: Commit**

```bash
git add be/apps/master-data-service/src/tenant/tenant.service.ts be/apps/master-data-service/src/tenant/tenant.service.spec.ts
git commit -m "feat(tenant): resetMemberPassword - reset mật khẩu thành viên về 123456"
```

---

### Task 3: Controller endpoints

**Files:**
- Modify: `be/apps/master-data-service/src/tenant/tenant.controller.ts`

**Interfaces:**
- Consumes: `TenantService.updateMemberProfile`, `TenantService.resetMemberPassword`; `UpdateMemberProfileDto` từ `@app/dto`.
- Produces:
  - `PUT  /tenants/:id/members/:userId/profile` → `{ success, data: { id, email, hoTen } }`
  - `POST /tenants/:id/members/:userId/reset-password` → `{ success, data: { defaultPassword } }`

- [ ] **Step 1: Thêm import DTO**

Sửa dòng import `@app/dto` trong `tenant.controller.ts`:

```ts
import {
  CreateTenantDto,
  UpdateTenantDto,
  AddUserToTenantDto,
  UpdateTenantMemberDto,
  UpdateMemberProfileDto,
} from '@app/dto';
```

- [ ] **Step 2: Thêm 2 endpoint**

Thêm vào `TenantController` ngay sau method `updateMember` (trước `removeMember`):

```ts
@Put(':id/members/:userId/profile')
@UseGuards(JwtGuard)
async updateMemberProfile(
  @Param('id') id: string,
  @Param('userId') userId: string,
  @Body() dto: UpdateMemberProfileDto,
) {
  const data = await this.tenantService.updateMemberProfile(id, userId, dto);
  return { success: true, data };
}

@Post(':id/members/:userId/reset-password')
@UseGuards(JwtGuard)
async resetMemberPassword(
  @Param('id') id: string,
  @Param('userId') userId: string,
) {
  const data = await this.tenantService.resetMemberPassword(id, userId);
  return { success: true, message: 'Đã reset mật khẩu về mặc định', data };
}
```

(`Post`, `Put`, `Body`, `Param`, `UseGuards`, `JwtGuard` đã được import sẵn trong file.)

- [ ] **Step 3: Verify build**

Run: `cd be && yarn jest tenant.service --silent && npx tsc -p apps/master-data-service/tsconfig.app.json --noEmit`
Expected: test PASS và không có lỗi TypeScript.

- [ ] **Step 4: Commit**

```bash
git add be/apps/master-data-service/src/tenant/tenant.controller.ts
git commit -m "feat(tenant): API sửa hồ sơ + reset mật khẩu thành viên"
```

---

### Task 4: Frontend service methods

**Files:**
- Modify: `fe/src/services/tenantService.ts`

**Interfaces:**
- Consumes: `ServiceBase` (`this.put`, `this.post`).
- Produces:
  - `interface UpdateMemberProfileDto { hoTen?: string; email?: string }`
  - `tenantService.updateMemberProfile(tenantId, userId, data): Promise<{ id; email; hoTen }>`
  - `tenantService.resetMemberPassword(tenantId, userId): Promise<{ defaultPassword: string }>`

- [ ] **Step 1: Thêm interface DTO**

Trong `fe/src/services/tenantService.ts`, sau `interface UpdateMemberDto`, thêm:

```ts
export interface UpdateMemberProfileDto {
  hoTen?: string;
  email?: string;
}
```

- [ ] **Step 2: Thêm 2 method vào class `TenantService`**

Thêm sau method `updateMember`:

```ts
async updateMemberProfile(
  tenantId: string,
  userId: string,
  data: UpdateMemberProfileDto,
): Promise<{ id: string; email: string; hoTen: string }> {
  return this.put(data, { endpoint: `/${tenantId}/members/${userId}/profile` });
}

async resetMemberPassword(
  tenantId: string,
  userId: string,
): Promise<{ defaultPassword: string }> {
  return this.post({}, { endpoint: `/${tenantId}/members/${userId}/reset-password` });
}
```

- [ ] **Step 3: Verify build**

Run: `cd fe && npx tsc --noEmit`
Expected: Không có lỗi TypeScript.

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/tenantService.ts
git commit -m "feat(fe): tenantService - updateMemberProfile + resetMemberPassword"
```

---

### Task 5: Trang Thành viên — sửa họ tên/email + icon reset mật khẩu

**Files:**
- Modify: `fe/src/pages/cau-hinh/thanh-vien/ThanhVienPage.tsx`

**Interfaces:**
- Consumes: `tenantService.updateMemberProfile`, `tenantService.resetMemberPassword`, `tenantService.updateMember`; `useAuth().hasPermission`.

- [ ] **Step 1: Cập nhật import**

Đổi import icon (thêm `KeyOutlined`) và lấy `hasPermission` từ `useAuth`:

```ts
import { UserAddOutlined, DeleteOutlined, EditOutlined, UserOutlined, TeamOutlined, KeyOutlined } from '@ant-design/icons';
```

Trong component, đổi:

```ts
const { currentTenant, hasPermission } = useAuth();
```

Và thêm hằng quyền gần đầu component (sau dòng `const tenantId = ...`):

```ts
const canEdit = hasPermission('/cau-hinh/thanh-vien:sua');
```

- [ ] **Step 2: Thay handler sửa (profile + role) và thêm handler reset**

Thay nguyên hàm `handleEditRole` bằng `handleEdit` xử lý cả hồ sơ và vai trò:

```ts
const handleEdit = async () => {
  if (!editingMember) return;
  try {
    const values = editForm.getFieldsValue() as { hoTen: string; email: string; role: string };
    if (values.hoTen !== editingMember.hoTen || values.email !== editingMember.email) {
      await tenantService.updateMemberProfile(tenantId, editingMember.id, {
        hoTen: values.hoTen,
        email: values.email,
      });
    }
    if (values.role !== editingMember.role) {
      await tenantService.updateMember(tenantId, editingMember.id, { role: values.role });
    }
    message.success('Đã cập nhật thành viên');
    setEditingMember(null);
    fetchMembers();
  } catch {
    message.error('Không thể cập nhật thành viên');
  }
};

const handleResetPassword = async (userId: string) => {
  try {
    const res = await tenantService.resetMemberPassword(tenantId, userId);
    message.success(`Đã reset mật khẩu về ${res.defaultPassword}`);
  } catch {
    message.error('Không thể reset mật khẩu');
  }
};
```

- [ ] **Step 3: Khởi tạo form sửa với đủ field**

Trong cột "Thao tác", nút Edit `onClick` set thêm hoTen/email; và bọc nút Sửa/Reset trong điều kiện `canEdit`. Thay block render cột actions:

```tsx
{
  title: 'Thao tác',
  key: 'actions',
  render: (_: unknown, record: TenantMember) => (
    <Space>
      {canEdit && (
        <Button
          type="text"
          icon={<EditOutlined />}
          onClick={() => {
            setEditingMember(record);
            editForm.setFieldsValue({
              hoTen: record.hoTen,
              email: record.email,
              role: record.role,
            });
          }}
        />
      )}
      {canEdit && (
        <Popconfirm
          title="Reset mật khẩu về mặc định?"
          description="Mật khẩu sẽ được đặt lại thành 123456."
          onConfirm={() => handleResetPassword(record.id)}
          okText="Reset"
          cancelText="Hủy"
        >
          <Button type="text" icon={<KeyOutlined />} title="Reset mật khẩu" />
        </Popconfirm>
      )}
      <Popconfirm
        title="Xác nhận xóa thành viên?"
        onConfirm={() => handleRemove(record.id)}
        okText="Xóa"
        cancelText="Hủy"
      >
        <Button type="text" danger icon={<DeleteOutlined />} />
      </Popconfirm>
    </Space>
  ),
},
```

- [ ] **Step 4: Mở rộng modal Sửa**

Thay block `{/* Edit Role Modal */}` (Modal + Form) bằng modal có họ tên/email/vai trò:

```tsx
{/* Edit Member Modal */}
<Modal
  title={`Sửa thành viên - ${editingMember?.hoTen || ''}`}
  open={!!editingMember}
  onCancel={() => setEditingMember(null)}
  onOk={handleEdit}
  okText="Cập nhật"
  cancelText="Hủy"
>
  <Form form={editForm} layout="vertical">
    <Form.Item
      name="hoTen"
      label="Họ tên"
      rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
    >
      <Input placeholder="VD: Nguyễn Văn A" />
    </Form.Item>
    <Form.Item
      name="email"
      label="Email"
      rules={[
        { required: true, message: 'Vui lòng nhập email' },
        { type: 'email', message: 'Email không hợp lệ' },
      ]}
    >
      <Input placeholder="VD: user@congty.com" />
    </Form.Item>
    <Form.Item name="role" label="Vai trò">
      <Select options={roles} />
    </Form.Item>
  </Form>
</Modal>
```

- [ ] **Step 5: Verify build + lint**

Run: `cd fe && npx tsc --noEmit && npm run lint`
Expected: Không lỗi TypeScript; lint pass (chỉ cảnh báo sẵn có nếu repo vốn có).

- [ ] **Step 6: Commit**

```bash
git add fe/src/pages/cau-hinh/thanh-vien/ThanhVienPage.tsx
git commit -m "feat(fe): trang thành viên - sửa họ tên/email + icon reset mật khẩu"
```

---

## Verification cuối

- [ ] `cd be && yarn jest tenant.service --silent` → tất cả PASS.
- [ ] `cd fe && npx tsc --noEmit` → sạch.
- [ ] Manual (sau deploy/dev): mở Cấu hình → Thành viên → bấm Sửa, đổi tên + email, lưu → danh sách cập nhật. Bấm icon chìa khóa → xác nhận → thông báo "Đã reset mật khẩu về 123456" → đăng nhập lại bằng 123456 thành công.

## Self-Review

- Spec coverage: sửa họ tên (Task 1/5), sửa email + check trùng (Task 1/5), reset mật khẩu mặc định (Task 2/5), quyền admin gate FE bằng `hasPermission` (Task 5), giữ `JwtGuard` BE (Task 3), email lowercase (Task 1), tạo credential nếu chưa có (Task 2), icon reset trong cột thao tác (Task 5). Đủ.
- Placeholder scan: không có TBD/TODO; mọi step có code/lệnh cụ thể.
- Type consistency: `updateMemberProfile`/`resetMemberPassword` đồng nhất tên & kiểu giữa BE service, controller, FE service, và page.
