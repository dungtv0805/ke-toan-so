# Kế hoạch 7 tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biến `/trung-tam-du-lieu/ke-hoach` thành trang 7 tab và làm đầy đủ hai bảng nhập liệu hai cấp Bán hàng và Nhân sự.

**Architecture:** Hai collection MongoDB chuyên biệt trong voucher-service (`ke_hoach_ban_hang`, `ke_hoach_nhan_su`), mỗi dòng là cấp 2 (sản phẩm / chức vụ) kèm khoá cấp 1 và mảng 12 tháng. Mọi giá trị suy ra — quý, năm, %, hàng nhóm, hàng tổng — tính ở FE bằng hàm thuần đã kiểm thử. FE theo khuôn CHanlder.

**Tech Stack:** NestJS 11 + TypeORM/MongoDB (BE), React 18 + antd + Vite + vitest (FE).

**Spec:** `docs/superpowers/specs/2026-08-20-ke-hoach-tabs-design.md`

## Global Constraints

- Sáu cột chi phí nhân sự cố định: `luongChinh`, `luongKpi`, `thuongDoanhSo`, `baoHiem`, `daoTao`, `thuongCongNhan`.
- `thang` luôn đúng 12 phần tử, chỉ số 0 = T1.
- Không lưu giá trị suy ra (Doanh thu, CỘNG, quý, %, hàng nhóm, hàng tổng).
- Không ghim cột trong bảng — commit `db51ad9` đã revert việc này vì vỡ tiêu đề bảng.
- Vai trò xem: `ADMIN, KE_TOAN_TRUONG, KE_TOAN_QUY, KE_TOAN_TONG_HOP, MANAGER, KIEM_SOAT`. Vai trò sửa: `ADMIN, KE_TOAN_TRUONG, KE_TOAN_QUY, KE_TOAN_TONG_HOP`.
- Mọi truy vấn BE lọc theo tenant qua `TenantContextService`.
- Lệch giữa tổng 12 tháng và Doanh thu / CỘNG chỉ cảnh báo, không chặn lưu.
- Chạy test FE: `cd fe && npx vitest run <path>`. Chạy test BE: `cd be && npx jest <path>`.

## File Structure

**Backend**
- `be/libs/entities/src/voucher/ke-hoach-ban-hang.entity.ts` — entity Bán hàng.
- `be/libs/entities/src/voucher/ke-hoach-nhan-su.entity.ts` — entity Nhân sự.
- `be/libs/entities/src/voucher/index.ts` — đăng ký hai entity.
- `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/{ban-hang.controller.ts,ban-hang.service.ts,dto/}` — CRUD Bán hàng.
- `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/{nhan-su.controller.ts,nhan-su.service.ts,dto/}` — CRUD Nhân sự.
- `be/apps/voucher-service/src/ke-hoach-bang/ke-hoach-bang.module.ts` — gom hai module con.
- `be/apps/voucher-service/src/voucher-service.module.ts` — nhập module mới.

**Frontend**
- `fe/src/services/keHoachBanHangService.ts`, `keHoachNhanSuService.ts` — gọi API.
- `fe/src/pages/ke-hoach/tabs/lib/tongHop.ts` — hàm thuần dựng cây hàng + tính quý/%/lệch. Dùng chung cho cả hai bảng.
- `fe/src/pages/ke-hoach/tabs/lib/tongHop.test.ts` — kiểm thử hàm trên.
- `fe/src/pages/ke-hoach/tabs/TabComingSoon.tsx` — khung "Sắp có" trong tab.
- `fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx` — Segmented + chọn năm + điều phối tab.
- `fe/src/pages/ke-hoach/tabs/ban-hang/*` — handler + bảng Bán hàng.
- `fe/src/pages/ke-hoach/tabs/nhan-su/*` — handler + bảng Nhân sự.
- `fe/src/App.tsx` — đổi element của route `ke-hoach`.

---

### Task 1: Entity và đăng ký

**Files:**
- Create: `be/libs/entities/src/voucher/ke-hoach-ban-hang.entity.ts`
- Create: `be/libs/entities/src/voucher/ke-hoach-nhan-su.entity.ts`
- Modify: `be/libs/entities/src/voucher/index.ts`

**Interfaces:**
- Consumes: `BaseEntity` từ `../base.entity`.
- Produces: `KeHoachBanHang`, `KeHoachNhanSu`, `MucDanhMucKeHoach`, `ChiPhiNhanSu`, `CHI_PHI_NHAN_SU_KEYS`, `SO_THANG = 12` — export qua `@app/entities`.

- [ ] **Step 1: Tạo entity Bán hàng**

```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

/** Số tháng trong một bản kế hoạch năm. */
export const SO_THANG = 12;

/** Một mục danh mục được chụp lại lúc lưu — giữ mã/tên để bảng đọc được cả khi danh mục đổi. */
export interface MucDanhMucKeHoach {
  id: string;
  ma: string;
  ten: string;
}

/**
 * Một dòng kế hoạch bán hàng = một SẢN PHẨM trong một năm.
 * Cấp 1 (nhóm sản phẩm) không có bản ghi riêng — suy ra từ `nhomSanPham` của các dòng.
 * Doanh thu, quý, %, hàng tổng đều tính khi đọc, không lưu.
 */
@Entity('ke_hoach_ban_hang')
export class KeHoachBanHang extends BaseEntity {
  @Column()
  nam: number;

  @Column({ type: 'simple-json' })
  nhomSanPham: MucDanhMucKeHoach;

  @Column({ type: 'simple-json' })
  sanPham: MucDanhMucKeHoach;

  @Column()
  luong: number;

  @Column()
  giaBinhQuan: number;

  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  @Column({ type: 'simple-array' })
  thang: number[];

  @Column({ nullable: true })
  ghiChu?: string;

  @Column()
  nguoiTaoId: string;
}

export interface KeHoachBanHangEntities {
  KeHoachBanHang: typeof KeHoachBanHang;
}

declare module '../entities' {
  interface Entities extends KeHoachBanHangEntities {}
}
```

- [ ] **Step 2: Tạo entity Nhân sự**

```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';
import type { MucDanhMucKeHoach } from './ke-hoach-ban-hang.entity';

/** Sáu loại chi phí nhân sự — cố định, khớp cột LCHINH…THUONGCN của sheet. */
export interface ChiPhiNhanSu {
  luongChinh: number;
  luongKpi: number;
  thuongDoanhSo: number;
  baoHiem: number;
  daoTao: number;
  thuongCongNhan: number;
}

export const CHI_PHI_NHAN_SU_KEYS: (keyof ChiPhiNhanSu)[] = [
  'luongChinh',
  'luongKpi',
  'thuongDoanhSo',
  'baoHiem',
  'daoTao',
  'thuongCongNhan',
];

/**
 * Một dòng kế hoạch nhân sự = một CHỨC VỤ trong một bộ phận, trong một năm.
 * Cấp 1 (bộ phận) không có bản ghi riêng — suy ra từ `boPhan` của các dòng.
 */
@Entity('ke_hoach_nhan_su')
export class KeHoachNhanSu extends BaseEntity {
  @Column()
  nam: number;

  @Column({ type: 'simple-json' })
  boPhan: MucDanhMucKeHoach;

  /** Mã vị trí gõ tự do: GD, PGD, TROLY… */
  @Column()
  maViTri: string;

  @Column({ nullable: true })
  tenChucVu?: string;

  @Column({ type: 'simple-json' })
  chiPhi: ChiPhiNhanSu;

  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  @Column({ type: 'simple-array' })
  thang: number[];

  @Column({ nullable: true })
  ghiChu?: string;

  @Column()
  nguoiTaoId: string;
}

export interface KeHoachNhanSuEntities {
  KeHoachNhanSu: typeof KeHoachNhanSu;
}

declare module '../entities' {
  interface Entities extends KeHoachNhanSuEntities {}
}
```

- [ ] **Step 3: Đăng ký ở `voucher/index.ts`**

Thêm `import './ke-hoach-ban-hang.entity';` và `import './ke-hoach-nhan-su.entity';` vào khối import, thêm hai dòng `export * from ...` tương ứng.

- [ ] **Step 4: Biên dịch thử**

Run: `cd be && npx tsc --noEmit -p tsconfig.json`
Expected: không lỗi liên quan hai file mới.

- [ ] **Step 5: Commit**

```bash
git add be/libs/entities/src/voucher
git commit -m "feat(ke-hoach): entity ke_hoach_ban_hang va ke_hoach_nhan_su"
```

---

### Task 2: API Bán hàng

**Files:**
- Create: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/dto/{index.ts,ban-hang-query.dto.ts,create-ban-hang.dto.ts,update-ban-hang.dto.ts}`
- Create: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/ban-hang.service.ts`
- Create: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/ban-hang.controller.ts`
- Test: `be/apps/voucher-service/src/ke-hoach-bang/ban-hang/ban-hang.service.spec.ts`

**Interfaces:**
- Consumes: `KeHoachBanHang`, `SO_THANG` từ `@app/entities`; `TenantContextService` từ `@app/core`.
- Produces: `KeHoachBanHangService` với `layTheoNam(nam)`, `taoMoi(dto, nguoiTaoId)`, `capNhat(id, dto)`, `xoa(id)`. Controller ở prefix `ke-hoach-ban-hang`.

- [ ] **Step 1: Viết DTO**

`create-ban-hang.dto.ts`:

```ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';

export class MucDanhMucDto {
  @IsNotEmpty() @IsString() id: string;
  @IsNotEmpty() @IsString() ma: string;
  @IsNotEmpty() @IsString() ten: string;
}

export class CreateKeHoachBanHangDto {
  @IsNotEmpty() @IsInt() @Min(1900) nam: number;

  @IsNotEmpty() @ValidateNested() @Type(() => MucDanhMucDto)
  nhomSanPham: MucDanhMucDto;

  @IsNotEmpty() @ValidateNested() @Type(() => MucDanhMucDto)
  sanPham: MucDanhMucDto;

  @IsNumber() @Min(0) luong: number;

  @IsNumber() @Min(0) giaBinhQuan: number;

  // Đúng 12 phần tử — bảng luôn gửi đủ, thiếu là lỗi phía gọi.
  @IsArray() @ArrayMinSize(12) @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  thang: number[];

  @IsOptional() @IsString() ghiChu?: string;
}
```

`update-ban-hang.dto.ts`:

```ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateKeHoachBanHangDto } from './create-ban-hang.dto';

// Không cho đổi năm/sản phẩm khi sửa — muốn đổi thì xoá rồi thêm lại.
export class UpdateKeHoachBanHangDto extends PartialType(
  OmitType(CreateKeHoachBanHangDto, ['nam', 'sanPham'] as const),
) {}
```

`ban-hang-query.dto.ts`:

```ts
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class KeHoachBanHangQueryDto {
  @Type(() => Number) @IsInt() @Min(1900) nam: number;
}
```

`index.ts` re-export cả ba.

- [ ] **Step 2: Viết test thất bại cho service**

`ban-hang.service.spec.ts` — dựng repo giả và tenant giả:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KeHoachBanHang } from '@app/entities';
import { TenantContextService } from '@app/core';
import { KeHoachBanHangService } from './ban-hang.service';

const repo = {
  find: jest.fn(),
  findOne: jest.fn(),
  countDocuments: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  deleteOne: jest.fn(),
};
const tenant = { getCurrentTenantId: jest.fn(() => 't1') };

describe('KeHoachBanHangService', () => {
  let service: KeHoachBanHangService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        KeHoachBanHangService,
        { provide: getRepositoryToken(KeHoachBanHang), useValue: repo },
        { provide: TenantContextService, useValue: tenant },
      ],
    }).compile();
    service = mod.get(KeHoachBanHangService);
  });

  it('lọc theo năm và tenant', async () => {
    repo.find.mockResolvedValue([]);
    await service.layTheoNam(2026);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nam: 2026, tenantId: 't1' } }),
    );
  });

  it('chặn trùng sản phẩm trong cùng năm', async () => {
    repo.countDocuments.mockResolvedValue(1);
    await expect(
      service.taoMoi(
        {
          nam: 2026,
          nhomSanPham: { id: 'n1', ma: 'N1', ten: 'Nhóm 1' },
          sanPham: { id: 's1', ma: 'SP1', ten: 'Sản phẩm 1' },
          luong: 1,
          giaBinhQuan: 1,
          thang: Array(12).fill(0),
        },
        'u1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sửa dòng không tồn tại thì 404', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      service.capNhat('507f1f77bcf86cd799439011', { luong: 5 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 3: Chạy test để chắc nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach-bang/ban-hang`
Expected: FAIL — không tìm thấy module `./ban-hang.service`.

- [ ] **Step 4: Viết service**

```ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MongoRepository } from 'typeorm';
import { ObjectId } from 'mongodb';
import { KeHoachBanHang } from '@app/entities';
import { TenantContextService } from '@app/core';
import { CreateKeHoachBanHangDto, UpdateKeHoachBanHangDto } from './dto';

@Injectable()
export class KeHoachBanHangService {
  constructor(
    @InjectRepository(KeHoachBanHang)
    private readonly repo: MongoRepository<KeHoachBanHang>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private theoTenant(where: Record<string, unknown>): Record<string, unknown> {
    const tenantId = this.tenantContext.getCurrentTenantId();
    if (tenantId) where.tenantId = tenantId;
    return where;
  }

  async layTheoNam(nam: number): Promise<KeHoachBanHang[]> {
    return this.repo.find({
      where: this.theoTenant({ nam }),
      order: { 'nhomSanPham.ma': 'ASC', 'sanPham.ma': 'ASC' } as never,
    });
  }

  async taoMoi(dto: CreateKeHoachBanHangDto, nguoiTaoId: string): Promise<KeHoachBanHang> {
    const trung = await this.repo.countDocuments(
      this.theoTenant({ nam: dto.nam, 'sanPham.id': dto.sanPham.id }),
    );
    if (trung > 0) {
      throw new BadRequestException(
        `Sản phẩm ${dto.sanPham.ma} đã có trong kế hoạch năm ${dto.nam}`,
      );
    }
    const dong = this.repo.create({
      ...dto,
      nguoiTaoId,
      tenantId: this.tenantContext.getCurrentTenantId(),
    });
    return this.repo.save(dong);
  }

  async capNhat(id: string, dto: UpdateKeHoachBanHangDto): Promise<KeHoachBanHang> {
    const dong = await this.timTheoId(id);
    Object.assign(dong, dto);
    return this.repo.save(dong);
  }

  async xoa(id: string): Promise<void> {
    const dong = await this.timTheoId(id);
    await this.repo.deleteOne({ _id: dong._id });
  }

  private async timTheoId(id: string): Promise<KeHoachBanHang> {
    if (!ObjectId.isValid(id)) throw new BadRequestException('Mã dòng không hợp lệ');
    const dong = await this.repo.findOne({
      where: this.theoTenant({ _id: new ObjectId(id) }),
    });
    if (!dong) throw new NotFoundException('Không tìm thấy dòng kế hoạch bán hàng');
    return dong;
  }
}
```

- [ ] **Step 5: Chạy lại test**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach-bang/ban-hang`
Expected: PASS 3 test.

- [ ] **Step 6: Viết controller**

```ts
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtGuard, RoleGuard, Roles, type UserPayload } from '@app/auth';
import { KeHoachBanHangService } from './ban-hang.service';
import {
  CreateKeHoachBanHangDto, KeHoachBanHangQueryDto, UpdateKeHoachBanHangDto,
} from './dto';

const XEM = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'];
const SUA = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY', 'KE_TOAN_TONG_HOP'];

@Controller('ke-hoach-ban-hang')
@UseGuards(JwtGuard, RoleGuard)
export class KeHoachBanHangController {
  constructor(private readonly service: KeHoachBanHangService) {}

  @Get()
  @Roles(...XEM)
  async layTheoNam(@Query() query: KeHoachBanHangQueryDto) {
    return { success: true, data: await this.service.layTheoNam(query.nam) };
  }

  @Post()
  @Roles(...SUA)
  async taoMoi(
    @Body() dto: CreateKeHoachBanHangDto,
    @CurrentUser() user: UserPayload,
  ) {
    return { success: true, data: await this.service.taoMoi(dto, user.userId) };
  }

  @Patch(':id')
  @Roles(...SUA)
  async capNhat(@Param('id') id: string, @Body() dto: UpdateKeHoachBanHangDto) {
    return { success: true, data: await this.service.capNhat(id, dto) };
  }

  @Delete(':id')
  @Roles(...SUA)
  async xoa(@Param('id') id: string) {
    await this.service.xoa(id);
    return { success: true };
  }
}
```

Kiểm tra tên trường của `UserPayload` trong `be/libs/auth/src` trước khi dùng `user.userId`; dùng đúng tên trường mà `KeHoachController` đang dùng.

- [ ] **Step 7: Commit**

```bash
git add be/apps/voucher-service/src/ke-hoach-bang/ban-hang
git commit -m "feat(ke-hoach): API CRUD ke hoach ban hang"
```

---

### Task 3: API Nhân sự

**Files:**
- Create: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/dto/{index.ts,nhan-su-query.dto.ts,create-nhan-su.dto.ts,update-nhan-su.dto.ts}`
- Create: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/nhan-su.service.ts`
- Create: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/nhan-su.controller.ts`
- Test: `be/apps/voucher-service/src/ke-hoach-bang/nhan-su/nhan-su.service.spec.ts`

**Interfaces:**
- Consumes: `KeHoachNhanSu`, `ChiPhiNhanSu` từ `@app/entities`; `MucDanhMucDto` từ `../ban-hang/dto/create-ban-hang.dto`.
- Produces: `KeHoachNhanSuService` với `layTheoNam(nam)`, `taoMoi(dto, nguoiTaoId)`, `capNhat(id, dto)`, `xoa(id)`. Controller ở prefix `ke-hoach-nhan-su`.

- [ ] **Step 1: Viết DTO**

`create-nhan-su.dto.ts`:

```ts
import { Type } from 'class-transformer';
import {
  ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty,
  IsNumber, IsOptional, IsString, Min, ValidateNested,
} from 'class-validator';
import { MucDanhMucDto } from '../../ban-hang/dto/create-ban-hang.dto';

export class ChiPhiNhanSuDto {
  @IsNumber() @Min(0) luongChinh: number;
  @IsNumber() @Min(0) luongKpi: number;
  @IsNumber() @Min(0) thuongDoanhSo: number;
  @IsNumber() @Min(0) baoHiem: number;
  @IsNumber() @Min(0) daoTao: number;
  @IsNumber() @Min(0) thuongCongNhan: number;
}

export class CreateKeHoachNhanSuDto {
  @IsNotEmpty() @IsInt() @Min(1900) nam: number;

  @IsNotEmpty() @ValidateNested() @Type(() => MucDanhMucDto)
  boPhan: MucDanhMucDto;

  @IsNotEmpty() @IsString() maViTri: string;

  @IsOptional() @IsString() tenChucVu?: string;

  @IsNotEmpty() @ValidateNested() @Type(() => ChiPhiNhanSuDto)
  chiPhi: ChiPhiNhanSuDto;

  @IsArray() @ArrayMinSize(12) @ArrayMaxSize(12)
  @IsNumber({}, { each: true })
  thang: number[];

  @IsOptional() @IsString() ghiChu?: string;
}
```

`update-nhan-su.dto.ts` — `PartialType(OmitType(CreateKeHoachNhanSuDto, ['nam'] as const))`. Cho sửa `boPhan` và `maViTri` vì cả hai đều nhập tay, gõ sai phải chữa được.

`nhan-su-query.dto.ts` giống hệt query bên Bán hàng, đổi tên lớp thành `KeHoachNhanSuQueryDto`.

- [ ] **Step 2: Viết test thất bại**

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KeHoachNhanSu } from '@app/entities';
import { TenantContextService } from '@app/core';
import { KeHoachNhanSuService } from './nhan-su.service';

const repo = {
  find: jest.fn(), findOne: jest.fn(), countDocuments: jest.fn(),
  save: jest.fn(), create: jest.fn((v) => v), deleteOne: jest.fn(),
};
const tenant = { getCurrentTenantId: jest.fn(() => 't1') };

const dtoMau = {
  nam: 2026,
  boPhan: { id: 'b1', ma: 'BGD', ten: 'Ban giám đốc' },
  maViTri: 'GD',
  chiPhi: {
    luongChinh: 360000000, luongKpi: 0, thuongDoanhSo: 0,
    baoHiem: 0, daoTao: 0, thuongCongNhan: 0,
  },
  thang: Array(12).fill(30000000),
};

describe('KeHoachNhanSuService', () => {
  let service: KeHoachNhanSuService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        KeHoachNhanSuService,
        { provide: getRepositoryToken(KeHoachNhanSu), useValue: repo },
        { provide: TenantContextService, useValue: tenant },
      ],
    }).compile();
    service = mod.get(KeHoachNhanSuService);
  });

  it('lọc theo năm và tenant', async () => {
    repo.find.mockResolvedValue([]);
    await service.layTheoNam(2026);
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { nam: 2026, tenantId: 't1' } }),
    );
  });

  it('chặn trùng mã vị trí trong cùng bộ phận và năm', async () => {
    repo.countDocuments.mockResolvedValue(1);
    await expect(service.taoMoi(dtoMau, 'u1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sửa dòng không tồn tại thì 404', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(
      service.capNhat('507f1f77bcf86cd799439011', { maViTri: 'PGD' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
```

- [ ] **Step 3: Chạy test để chắc nó đỏ**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach-bang/nhan-su`
Expected: FAIL — không tìm thấy module.

- [ ] **Step 4: Viết service**

Sao đúng cấu trúc `KeHoachBanHangService` ở Task 2, thay:
- repo là `MongoRepository<KeHoachNhanSu>`
- `layTheoNam` sắp xếp `{ 'boPhan.ma': 'ASC', maViTri: 'ASC' }`
- điều kiện trùng: `{ nam, 'boPhan.id': dto.boPhan.id, maViTri: dto.maViTri }`, báo lỗi `Mã vị trí ${dto.maViTri} đã có trong bộ phận ${dto.boPhan.ten} năm ${dto.nam}`
- thông báo 404: `Không tìm thấy dòng kế hoạch nhân sự`

- [ ] **Step 5: Chạy lại test**

Run: `cd be && npx jest apps/voucher-service/src/ke-hoach-bang/nhan-su`
Expected: PASS 3 test.

- [ ] **Step 6: Viết controller**

Sao `KeHoachBanHangController`, đổi prefix thành `ke-hoach-nhan-su`, đổi service và DTO tương ứng. Giữ nguyên hai hằng `XEM` / `SUA`.

- [ ] **Step 7: Commit**

```bash
git add be/apps/voucher-service/src/ke-hoach-bang/nhan-su
git commit -m "feat(ke-hoach): API CRUD ke hoach nhan su"
```

---

### Task 4: Nối module vào voucher-service

**Files:**
- Create: `be/apps/voucher-service/src/ke-hoach-bang/ke-hoach-bang.module.ts`
- Modify: `be/apps/voucher-service/src/voucher-service.module.ts`

**Interfaces:**
- Consumes: hai controller và hai service ở Task 2, 3.
- Produces: `KeHoachBangModule`.

- [ ] **Step 1: Viết module**

```ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { KeHoachBanHang, KeHoachNhanSu } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { TenantModule } from '@app/core';
import { KeHoachBanHangService } from './ban-hang/ban-hang.service';
import { KeHoachBanHangController } from './ban-hang/ban-hang.controller';
import { KeHoachNhanSuService } from './nhan-su/nhan-su.service';
import { KeHoachNhanSuController } from './nhan-su/nhan-su.controller';

/** Hai bảng nhập liệu Bán hàng và Nhân sự của trang Kế hoạch. */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule.forFeature([KeHoachBanHang, KeHoachNhanSu]),
    TenantModule,
  ],
  controllers: [KeHoachBanHangController, KeHoachNhanSuController],
  providers: [KeHoachBanHangService, KeHoachNhanSuService],
  exports: [KeHoachBanHangService, KeHoachNhanSuService],
})
export class KeHoachBangModule {}
```

- [ ] **Step 2: Nhập vào `VoucherServiceModule`**

Thêm `import { KeHoachBangModule } from './ke-hoach-bang/ke-hoach-bang.module';` và thêm `KeHoachBangModule` vào mảng `imports` ngay sau `KeHoachModule`.

- [ ] **Step 3: Kiểm tra biên dịch và bộ test BE**

Run: `cd be && npx jest apps/voucher-service`
Expected: toàn bộ test voucher-service PASS.

- [ ] **Step 4: Commit**

```bash
git add be/apps/voucher-service/src
git commit -m "feat(ke-hoach): dang ky KeHoachBangModule vao voucher-service"
```

---

### Task 5: Service FE

**Files:**
- Create: `fe/src/services/keHoachBanHangService.ts`
- Create: `fe/src/services/keHoachNhanSuService.ts`

**Interfaces:**
- Consumes: `ServiceBase` từ `./base/service-base`.
- Produces:
  - `MucDanhMucKeHoach = { id: string; ma: string; ten: string }`
  - `KeHoachBanHangDong = { id, nam, nhomSanPham, sanPham, luong, giaBinhQuan, thang: number[], ghiChu? }`
  - `keHoachBanHangService.layTheoNam(nam): Promise<KeHoachBanHangDong[]>`, `.taoMoi(payload)`, `.capNhat(id, payload)`, `.xoa(id)`
  - `ChiPhiNhanSu`, `CHI_PHI_NHAN_SU_COLS`, `KeHoachNhanSuDong = { id, nam, boPhan, maViTri, tenChucVu?, chiPhi, thang, ghiChu? }`
  - `keHoachNhanSuService` với bốn phương thức cùng tên.

- [ ] **Step 1: Viết `keHoachBanHangService.ts`**

```ts
import { ServiceBase } from './base/service-base';

export interface MucDanhMucKeHoach {
  id: string;
  ma: string;
  ten: string;
}

export interface KeHoachBanHangDong {
  id: string;
  nam: number;
  nhomSanPham: MucDanhMucKeHoach;
  sanPham: MucDanhMucKeHoach;
  luong: number;
  giaBinhQuan: number;
  /** Đúng 12 phần tử, chỉ số 0 là T1. */
  thang: number[];
  ghiChu?: string;
}

export type KeHoachBanHangPayload = Omit<KeHoachBanHangDong, 'id'>;

interface DongResponse extends Omit<KeHoachBanHangDong, 'id' | 'thang'> {
  _id?: string;
  id?: string;
  // simple-array của TypeORM có thể trả về chuỗi "1,2,3".
  thang: number[] | string;
}

/** Chuẩn hoá về đúng 12 số — dòng cũ thiếu tháng thì bù 0. */
export const chuanHoaThang = (thang: number[] | string | undefined): number[] => {
  const raw = typeof thang === 'string'
    ? thang.split(',').filter((s) => s !== '')
    : (thang ?? []);
  return Array.from({ length: 12 }, (_, i) => Number(raw[i]) || 0);
};

class KeHoachBanHangService extends ServiceBase {
  constructor() {
    super({ endpoint: '/voucher/ke-hoach-ban-hang' });
  }

  private map(item: DongResponse): KeHoachBanHangDong {
    return {
      ...item,
      id: item._id || item.id || '',
      thang: chuanHoaThang(item.thang),
    } as KeHoachBanHangDong;
  }

  async layTheoNam(nam: number): Promise<KeHoachBanHangDong[]> {
    const res = await this.get<{ data: DongResponse[] }>({ params: { nam } });
    return res.data.map((d) => this.map(d));
  }

  async taoMoi(payload: KeHoachBanHangPayload): Promise<KeHoachBanHangDong> {
    const res = await this.post<{ data: DongResponse }>({ data: payload });
    return this.map(res.data);
  }

  async capNhat(
    id: string,
    payload: Partial<Omit<KeHoachBanHangPayload, 'nam' | 'sanPham'>>,
  ): Promise<KeHoachBanHangDong> {
    const res = await this.patch<{ data: DongResponse }>({
      endpoint: `/${id}`,
      data: payload,
    });
    return this.map(res.data);
  }

  async xoa(id: string): Promise<void> {
    await this.delete({ endpoint: `/${id}` });
  }
}

export const keHoachBanHangService = new KeHoachBanHangService();
```

Trước khi viết, mở `fe/src/services/base/service-base.ts` xác nhận tên và chữ ký của `get/post/patch/delete`; sửa lời gọi cho khớp nếu khác.

- [ ] **Step 2: Viết `keHoachNhanSuService.ts`**

Cùng khuôn, endpoint `/voucher/ke-hoach-nhan-su`, kiểu dòng:

```ts
export interface ChiPhiNhanSu {
  luongChinh: number;
  luongKpi: number;
  thuongDoanhSo: number;
  baoHiem: number;
  daoTao: number;
  thuongCongNhan: number;
}

/** Sáu cột chi phí, đúng thứ tự sheet. */
export const CHI_PHI_NHAN_SU_COLS: { key: keyof ChiPhiNhanSu; nhan: string }[] = [
  { key: 'luongChinh', nhan: 'Lương chính' },
  { key: 'luongKpi', nhan: 'Lương KPI' },
  { key: 'thuongDoanhSo', nhan: 'Thưởng doanh số' },
  { key: 'baoHiem', nhan: 'Bảo hiểm' },
  { key: 'daoTao', nhan: 'Đào tạo' },
  { key: 'thuongCongNhan', nhan: 'Thưởng công nhân' },
];

export interface KeHoachNhanSuDong {
  id: string;
  nam: number;
  boPhan: MucDanhMucKeHoach;
  maViTri: string;
  tenChucVu?: string;
  chiPhi: ChiPhiNhanSu;
  thang: number[];
  ghiChu?: string;
}
```

`chuanHoaThang` nhập lại từ `keHoachBanHangService`, không viết bản thứ hai. Thêm hàm chuẩn hoá `chiPhi` bù 0 cho khoá thiếu.

- [ ] **Step 3: Biên dịch thử**

Run: `cd fe && npx tsc --noEmit`
Expected: không lỗi ở hai file mới.

- [ ] **Step 4: Commit**

```bash
git add fe/src/services/keHoachBanHangService.ts fe/src/services/keHoachNhanSuService.ts
git commit -m "feat(ke-hoach): service FE cho bang Ban hang va Nhan su"
```

---

### Task 6: Hàm tổng hợp thuần + kiểm thử

**Files:**
- Create: `fe/src/pages/ke-hoach/tabs/lib/tongHop.ts`
- Test: `fe/src/pages/ke-hoach/tabs/lib/tongHop.test.ts`

**Interfaces:**
- Consumes: không phụ thuộc gì ngoài kiểu dữ liệu thuần.
- Produces:
  - `type LoaiHang = 'tong' | 'nhom' | 'chiTiet'`
  - `interface HangBang<T> { key: string; loai: LoaiHang; nhan: string; nhomKey?: string; thang: number[]; quy: number[]; namTheoThang: number; namKhaiBao: number; phanTram: number; lech: boolean; dong?: T }`
  - `tongMang(a, b): number[]`
  - `quyTuThang(thang: number[]): number[]` — trả 4 phần tử
  - `dungCayBang<T>(items, doc): HangBang<T>[]`

- [ ] **Step 1: Viết test thất bại**

```ts
import { describe, expect, it } from 'vitest';
import { dungCayBang, quyTuThang, tongMang } from './tongHop';

interface Mau {
  id: string;
  nhomKey: string;
  nhomNhan: string;
  nhan: string;
  thang: number[];
  namKhaiBao: number;
}

const doc = (m: Mau) => ({
  key: m.id,
  nhomKey: m.nhomKey,
  nhomNhan: m.nhomNhan,
  nhan: m.nhan,
  thang: m.thang,
  namKhaiBao: m.namKhaiBao,
});

const thang = (...v: number[]) => Array.from({ length: 12 }, (_, i) => v[i] ?? 0);

describe('quyTuThang', () => {
  it('mỗi quý là tổng đúng 3 tháng của quý đó', () => {
    expect(quyTuThang(thang(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12)))
      .toEqual([6, 15, 24, 33]);
  });

  it('mảng ngắn hơn 12 coi phần thiếu là 0', () => {
    expect(quyTuThang([1, 2])).toEqual([3, 0, 0, 0]);
  });
});

describe('tongMang', () => {
  it('cộng theo từng vị trí', () => {
    expect(tongMang([1, 2, 3], [10, 20, 30])).toEqual([11, 22, 33]);
  });
});

describe('dungCayBang', () => {
  const items: Mau[] = [
    { id: 'a', nhomKey: 'n1', nhomNhan: 'Nhóm 1', nhan: 'SP A', thang: thang(10, 10, 10), namKhaiBao: 30 },
    { id: 'b', nhomKey: 'n1', nhomNhan: 'Nhóm 1', nhan: 'SP B', thang: thang(0, 0, 0, 20), namKhaiBao: 20 },
    { id: 'c', nhomKey: 'n2', nhomNhan: 'Nhóm 2', nhan: 'SP C', thang: thang(50), namKhaiBao: 50 },
  ];

  it('hàng đầu là TỔNG CỘNG, gộp mọi dòng', () => {
    const rows = dungCayBang(items, doc);
    expect(rows[0].loai).toBe('tong');
    expect(rows[0].namTheoThang).toBe(100);
    expect(rows[0].namKhaiBao).toBe(100);
    expect(rows[0].quy).toEqual([80, 20, 0, 0]);
  });

  it('sau hàng tổng là từng nhóm kèm dòng con của nhóm đó', () => {
    const rows = dungCayBang(items, doc);
    expect(rows.map((r) => r.loai)).toEqual([
      'tong', 'nhom', 'chiTiet', 'chiTiet', 'nhom', 'chiTiet',
    ]);
    expect(rows[1].nhan).toBe('Nhóm 1');
    expect(rows[1].namKhaiBao).toBe(50);
  });

  it('phần trăm tính theo tổng cộng', () => {
    const rows = dungCayBang(items, doc);
    expect(rows[2].phanTram).toBeCloseTo(0.3);
    expect(rows[5].phanTram).toBeCloseTo(0.5);
  });

  it('tổng cộng bằng 0 thì phần trăm là 0, không chia cho 0', () => {
    const rong: Mau[] = [
      { id: 'z', nhomKey: 'n1', nhomNhan: 'Nhóm 1', nhan: 'SP Z', thang: thang(), namKhaiBao: 0 },
    ];
    const rows = dungCayBang(rong, doc);
    expect(rows.every((r) => r.phanTram === 0)).toBe(true);
  });

  it('đánh dấu lệch khi tổng 12 tháng khác số khai báo', () => {
    const lech: Mau[] = [
      { id: 'x', nhomKey: 'n1', nhomNhan: 'Nhóm 1', nhan: 'SP X', thang: thang(10), namKhaiBao: 99 },
    ];
    const rows = dungCayBang(lech, doc);
    expect(rows.find((r) => r.key === 'x')?.lech).toBe(true);
  });

  it('không lệch khi hai số khớp nhau', () => {
    const rows = dungCayBang(items, doc);
    expect(rows.filter((r) => r.loai === 'chiTiet').every((r) => !r.lech)).toBe(true);
  });
});
```

- [ ] **Step 2: Chạy test để chắc nó đỏ**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/tongHop.test.ts`
Expected: FAIL — không tìm thấy `./tongHop`.

- [ ] **Step 3: Viết `tongHop.ts`**

```ts
/**
 * Dựng cây hàng cho hai bảng kế hoạch hai cấp: TỔNG CỘNG → nhóm → chi tiết.
 * Thuần, không đụng React, để kiểm thử được.
 */

export type LoaiHang = 'tong' | 'nhom' | 'chiTiet';

export const SO_THANG = 12;

/** Dữ liệu tối thiểu mà mỗi bảng phải rút ra từ dòng của mình. */
export interface MoTaHang {
  key: string;
  nhomKey: string;
  nhomNhan: string;
  nhan: string;
  thang: number[];
  /** Số năm do người dùng khai (Doanh thu = Lượng × Giá, hoặc CỘNG 6 loại chi phí). */
  namKhaiBao: number;
}

export interface HangBang<T> {
  key: string;
  loai: LoaiHang;
  nhan: string;
  /** Khoá nhóm cha — có ở hàng nhóm và hàng chi tiết, không có ở hàng tổng. */
  nhomKey?: string;
  thang: number[];
  /** Đúng 4 phần tử: Q1…Q4. */
  quy: number[];
  namTheoThang: number;
  namKhaiBao: number;
  phanTram: number;
  lech: boolean;
  /** Dòng gốc — chỉ có ở hàng chi tiết, dùng để sửa. */
  dong?: T;
}

const mang12 = (thang: number[] = []): number[] =>
  Array.from({ length: SO_THANG }, (_, i) => Number(thang[i]) || 0);

export const tongMang = (a: number[], b: number[]): number[] => {
  const n = Math.max(a.length, b.length);
  return Array.from({ length: n }, (_, i) => (a[i] || 0) + (b[i] || 0));
};

export const quyTuThang = (thang: number[]): number[] => {
  const m = mang12(thang);
  return [0, 1, 2, 3].map((q) => m[q * 3] + m[q * 3 + 1] + m[q * 3 + 2]);
};

const cong = (xs: number[]): number => xs.reduce((s, x) => s + x, 0);

/** So khớp tiền: lệch dưới 1 đồng coi như bằng nhau. */
const bangNhau = (a: number, b: number): boolean => Math.abs(a - b) < 1;

export function dungCayBang<T>(
  items: T[],
  doc: (item: T) => MoTaHang,
): HangBang<T>[] {
  const moTa = items.map((item) => ({ item, m: doc(item) }));

  // Giữ đúng thứ tự nhóm xuất hiện lần đầu — dữ liệu về đã sắp theo mã.
  const thuTuNhom: string[] = [];
  const theoNhom = new Map<string, { nhan: string; con: typeof moTa }>();
  for (const x of moTa) {
    if (!theoNhom.has(x.m.nhomKey)) {
      thuTuNhom.push(x.m.nhomKey);
      theoNhom.set(x.m.nhomKey, { nhan: x.m.nhomNhan, con: [] });
    }
    theoNhom.get(x.m.nhomKey)!.con.push(x);
  }

  const tongThang = moTa.reduce(
    (acc, x) => tongMang(acc, mang12(x.m.thang)),
    mang12([]),
  );
  const tongKhaiBao = cong(moTa.map((x) => x.m.namKhaiBao));
  const mauSo = tongKhaiBao || 0;
  const tyLe = (v: number) => (mauSo === 0 ? 0 : v / mauSo);

  const rows: HangBang<T>[] = [
    {
      key: '__tong__',
      loai: 'tong',
      nhan: 'TỔNG CỘNG',
      thang: tongThang,
      quy: quyTuThang(tongThang),
      namTheoThang: cong(tongThang),
      namKhaiBao: tongKhaiBao,
      phanTram: mauSo === 0 ? 0 : 1,
      lech: !bangNhau(cong(tongThang), tongKhaiBao),
    },
  ];

  for (const nhomKey of thuTuNhom) {
    const nhom = theoNhom.get(nhomKey)!;
    const thangNhom = nhom.con.reduce(
      (acc, x) => tongMang(acc, mang12(x.m.thang)),
      mang12([]),
    );
    const khaiBaoNhom = cong(nhom.con.map((x) => x.m.namKhaiBao));

    rows.push({
      key: `__nhom__${nhomKey}`,
      loai: 'nhom',
      nhan: nhom.nhan,
      nhomKey,
      thang: thangNhom,
      quy: quyTuThang(thangNhom),
      namTheoThang: cong(thangNhom),
      namKhaiBao: khaiBaoNhom,
      phanTram: tyLe(khaiBaoNhom),
      lech: !bangNhau(cong(thangNhom), khaiBaoNhom),
    });

    for (const { item, m } of nhom.con) {
      const t = mang12(m.thang);
      rows.push({
        key: m.key,
        loai: 'chiTiet',
        nhan: m.nhan,
        nhomKey,
        thang: t,
        quy: quyTuThang(t),
        namTheoThang: cong(t),
        namKhaiBao: m.namKhaiBao,
        phanTram: tyLe(m.namKhaiBao),
        lech: !bangNhau(cong(t), m.namKhaiBao),
        dong: item,
      });
    }
  }

  return rows;
}
```

- [ ] **Step 4: Chạy lại test**

Run: `cd fe && npx vitest run src/pages/ke-hoach/tabs/lib/tongHop.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add fe/src/pages/ke-hoach/tabs/lib
git commit -m "feat(ke-hoach): ham dung cay bang hai cap + kiem thu"
```

---

### Task 7: Khung trang 7 tab

**Files:**
- Create: `fe/src/pages/ke-hoach/tabs/TabComingSoon.tsx`
- Create: `fe/src/pages/ke-hoach/tabs/KeHoachTabsPage.tsx`
- Modify: `fe/src/App.tsx` (route `trung-tam-du-lieu/ke-hoach`)

**Interfaces:**
- Consumes: `KeHoachPage` từ `@/pages/ke-hoach/KeHoachPage`; `BanHangTab`, `NhanSuTab` (Task 8, 9) nhận prop `{ nam: number }`.
- Produces: `KeHoachTabsPage` — export mặc định, không nhận prop.

- [ ] **Step 1: Viết `TabComingSoon.tsx`**

```tsx
import React from 'react';
import { Result } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

/**
 * Khung "Sắp có" dùng trong tab. Không dùng `pages/ComingSoon.tsx` vì component đó
 * tra tiêu đề theo `location.pathname` — trong tab thì pathname không đổi.
 */
export const TabComingSoon: React.FC<{ tieuDe: string }> = ({ tieuDe }) => (
  <Result
    icon={<RocketOutlined className="text-primary" />}
    title={tieuDe}
    subTitle="Bảng này đang được xây dựng."
  />
);
```

- [ ] **Step 2: Viết `KeHoachTabsPage.tsx`**

```tsx
import React, { useMemo, useState } from 'react';
import { ConfigProvider, Segmented, Select, Space, Typography } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import KeHoachPage from '../KeHoachPage';
import { TabComingSoon } from './TabComingSoon';
import { BanHangTab } from './ban-hang/BanHangTab';
import { NhanSuTab } from './nhan-su/NhanSuTab';

const { Text } = Typography;

const TAB_OPTIONS = [
  { label: 'Bán hàng', value: 'ban-hang' },
  { label: 'Nhân sự', value: 'nhan-su' },
  { label: 'KQKD', value: 'kqkd' },
  { label: 'Dòng tiền', value: 'dong-tien' },
  { label: 'Tài sản', value: 'tai-san' },
  { label: 'Nguồn vốn', value: 'nguon-von' },
  { label: 'Chi tiết', value: 'chi-tiet' },
];

const KeHoachTabsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('ban-hang');
  const [nam, setNam] = useState(() => new Date().getFullYear());

  const namOptions = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => now - 3 + i).map((y) => ({
      label: `Năm ${y}`,
      value: y,
    }));
  }, []);

  return (
    <div className="space-y-3">
      <div
        className="sticky z-20 flex flex-wrap items-center justify-between gap-2"
        style={{
          top: 0,
          marginInline: -12,
          padding: '10px 12px',
          background: 'hsl(var(--background))',
          borderBottom: '1px solid hsl(var(--border))',
        }}
      >
        <div className="flex items-center gap-2">
          <CheckCircleOutlined className="text-primary" />
          <Text strong className="text-sm sm:text-base">Kế hoạch</Text>
        </div>
        <ConfigProvider
          theme={{
            components: {
              Segmented: {
                itemSelectedBg: 'hsl(var(--primary))',
                itemSelectedColor: '#fff',
                itemColor: 'hsl(var(--primary))',
                itemHoverColor: 'hsl(var(--primary))',
                trackBg: 'hsl(var(--primary) / 0.08)',
                fontSize: 15,
              },
            },
          }}
        >
          <Segmented
            value={activeTab}
            onChange={(v) => setActiveTab(v as string)}
            options={TAB_OPTIONS}
            size="large"
            className="font-semibold"
          />
        </ConfigProvider>
        <Space wrap>
          {activeTab !== 'chi-tiet' && (
            <Select
              value={nam}
              onChange={setNam}
              options={namOptions}
              style={{ width: 140 }}
            />
          )}
        </Space>
      </div>

      {activeTab === 'ban-hang' && <BanHangTab nam={nam} />}
      {activeTab === 'nhan-su' && <NhanSuTab nam={nam} />}
      {activeTab === 'kqkd' && <TabComingSoon tieuDe="Kế hoạch kết quả kinh doanh" />}
      {activeTab === 'dong-tien' && <TabComingSoon tieuDe="Kế hoạch dòng tiền" />}
      {activeTab === 'tai-san' && <TabComingSoon tieuDe="Kế hoạch tài sản" />}
      {activeTab === 'nguon-von' && <TabComingSoon tieuDe="Kế hoạch nguồn vốn" />}
      {activeTab === 'chi-tiet' && <KeHoachPage loaiKeHoach="KE_HOACH" />}
    </div>
  );
};

export default KeHoachTabsPage;
```

- [ ] **Step 3: Đổi route**

Trong `fe/src/App.tsx`, tại `<Route path="ke-hoach" ...>` thay `<KeHoachPage loaiKeHoach="KE_HOACH" />` bằng `<KeHoachTabsPage />`. Thêm import lười theo đúng lối các trang khác đang dùng trong `App.tsx` (xem `fe/src/pages/loadable.tsx`). Giữ nguyên `requiredPermission`. Route `ke-hoach/tao-moi` và `du-bao` không đổi — `KeHoachPage` vẫn được nhập cho `du-bao`.

- [ ] **Step 4: Kiểm tra biên dịch**

Run: `cd fe && npx tsc --noEmit`
Expected: chỉ còn lỗi "không tìm thấy `./ban-hang/BanHangTab`" và `./nhan-su/NhanSuTab` — hai file này làm ở Task 8, 9.

- [ ] **Step 5: Commit**

Hoãn commit tới hết Task 9 vì trang chưa biên dịch được. Ghi chú lại và làm tiếp.

---

### Task 8: Tab Bán hàng

**Files:**
- Create: `fe/src/pages/ke-hoach/tabs/ban-hang/BanHangHandlerContext.tsx`
- Create: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/ban-hang.handler.ts`
- Create: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/index.ts`
- Create: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/init/{init.event.ts,init.state.ts,init.handler.ts}`
- Create: `fe/src/pages/ke-hoach/tabs/ban-hang/handler/sub-handler/row-edit/{row-edit.event.ts,row-edit.state.ts,row-edit.handler.ts}`
- Create: `fe/src/pages/ke-hoach/tabs/ban-hang/BanHangTable.tsx`
- Create: `fe/src/pages/ke-hoach/tabs/ban-hang/BanHangTab.tsx`

**Interfaces:**
- Consumes: `dungCayBang`, `HangBang` từ `../lib/tongHop`; `keHoachBanHangService` từ `@/services/keHoachBanHangService`; `nhomSanPhamService`, `sanPhamService`.
- Produces: `BanHangTab` nhận `{ nam: number }`.

**State keys:** `nam`, `data`, `loading`, `nhomSanPhamList`, `sanPhamList`, `masterDataLoaded`, `editingKey`, `formValues`, `saving`.

**Events:** `init { nam }`, `refresh {}`, `batDauSua { key }`, `huySua {}`, `luuDong {}`, `xoaDong { id }`, `themDong {}`.

- [ ] **Step 1: Dựng handler khung**

`ban-hang.handler.ts` sao khuôn `fe/src/pages/ke-hoach/handler/ke-hoach.handler.ts`, tên ngữ cảnh `"ke-hoach-ban-hang"`:

```ts
import { BaseEvents, CHanlder } from '@/common';
import { BaseStates } from '@/common/c-handler/core/actions/c-state.action';
import './sub-handler';

export interface BanHangEvents extends BaseEvents {}
export interface BanHangStates extends BaseStates {}

export class BanHangHandler extends CHanlder<BanHangEvents, BanHangStates> {
  constructor() {
    super('ke-hoach-ban-hang');
  }
}
```

`sub-handler/index.ts`:

```ts
import { loadModule } from '@/common';

loadModule(import.meta.glob('./**/*.handler.ts', { eager: true }));
```

`BanHangHandlerContext.tsx` sao `KeHoachHandlerContext.tsx`, đổi tên lớp và hook thành `useBanHangHandler` / `useBanHangState`.

- [ ] **Step 2: Viết `init` sub-handler**

`init.event.ts`:

```ts
import { BaseEvents } from '@/common';

export interface BanHangInitEvent extends BaseEvents {
  init: { params: { nam: number }; result: void };
  refresh: { params: {}; result: void };
}

declare module '../../ban-hang.handler' {
  interface BanHangEvents extends BanHangInitEvent {}
}
```

`init.state.ts` khai báo các khoá state ở trên theo đúng lối `fe/src/pages/ke-hoach/handler/sub-handler/init/init.state.ts` (mở file đó ra chép cấu trúc `declare module`).

`init.handler.ts`:

```ts
import { HandlerDecorator, RegisterHandler } from '@/common';
import { CSubHanlder } from '@/common/c-handler/core/sub-handler.ts/sub-handler';
import { keHoachBanHangService } from '@/services/keHoachBanHangService';
import { nhomSanPhamService } from '@/services/nhomSanPhamService';
import { sanPhamService } from '@/services/sanPhamService';
import type { BanHangEvents, BanHangStates } from '../../ban-hang.handler';
import './init.event';
import './init.state';

const DANH_MUC_LIMIT = 500;

@RegisterHandler('ke-hoach-ban-hang')
export class BanHangInitHandler extends CSubHanlder<BanHangEvents, BanHangStates> {
  @HandlerDecorator('init')
  async init(params: { nam: number }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState('nam', params.nam);
    await Promise.all([this.napDong(params.nam), this.napDanhMuc()]);
  }

  @HandlerDecorator('refresh')
  async refresh(): Promise<void> {
    await this.napDong(this.getState('nam') as number);
  }

  private async napDong(nam: number): Promise<void> {
    this.setState('loading', true);
    try {
      this.setState('data', await keHoachBanHangService.layTheoNam(nam));
    } catch (error) {
      console.error('Lỗi nạp kế hoạch bán hàng:', error);
    } finally {
      this.setState('loading', false);
    }
  }

  private async napDanhMuc(): Promise<void> {
    if (this.getState('masterDataLoaded')) return;
    try {
      const [nhom, sanPham] = await Promise.all([
        nhomSanPhamService.getPaginated({ limit: DANH_MUC_LIMIT }),
        sanPhamService.getPaginated({ limit: DANH_MUC_LIMIT }),
      ]);
      this.setState('nhomSanPhamList', nhom.data);
      this.setState('sanPhamList', sanPham.data);
      this.setState('masterDataLoaded', true);
    } catch (error) {
      console.error('Lỗi nạp danh mục sản phẩm:', error);
    }
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ['data', []],
      ['loading', false],
      ['nhomSanPhamList', []],
      ['sanPhamList', []],
      ['masterDataLoaded', false],
      ['editingKey', null],
      ['formValues', null],
      ['saving', false],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
```

Trước khi viết, mở `sanPhamService.ts` xác nhận trường nào trỏ về nhóm sản phẩm (`nhomSanPham`, `nhomSanPhamId`, hay khác) và dùng đúng tên đó khi lọc sản phẩm theo nhóm ở bảng.

- [ ] **Step 3: Viết `row-edit` sub-handler**

Sự kiện và hành vi:
- `themDong` — đặt `editingKey` là `'__moi__'`, `formValues` là dòng rỗng `{ nhomSanPhamId: undefined, sanPhamId: undefined, luong: 0, giaBinhQuan: 0, thang: Array(12).fill(0) }`.
- `batDauSua { key }` — tìm dòng trong `data`, nạp vào `formValues`, đặt `editingKey`.
- `huySua` — xoá `editingKey` và `formValues`.
- `luuDong` — nếu `editingKey === '__moi__'` gọi `taoMoi`, ngược lại gọi `capNhat`; xong thì `huySua` rồi `refresh`. Lỗi thì `message.error(err.message)`, giữ nguyên form để sửa lại.
- `xoaDong { id }` — gọi `xoa` rồi `refresh`.

Dựng payload từ `formValues`: tra `nhomSanPhamList` / `sanPhamList` để lấy đủ `{ id, ma, ten }` cho `nhomSanPham` và `sanPham`.

- [ ] **Step 4: Viết `BanHangTable.tsx`**

Cột theo đúng thứ tự sheet: `Mã`, `Tên sản phẩm hàng hóa, vật tư`, `Lượng`, `Giá bình quân`, `Doanh thu`, `%`, nhóm cột `Quý` bọc `Q1…Q4`, nhóm cột `Tháng` bọc `T1…T12`, cột `Thao tác` cuối.

Dựng hàng bằng `dungCayBang` với `doc`:

```ts
const doc = (d: KeHoachBanHangDong) => ({
  key: d.id,
  nhomKey: d.nhomSanPham.id,
  nhomNhan: `${d.nhomSanPham.ma} - ${d.nhomSanPham.ten}`,
  nhan: d.sanPham.ten,
  thang: d.thang,
  namKhaiBao: d.luong * d.giaBinhQuan,
});
```

Quy tắc render:
- `loai === 'tong'` → nhãn "TỔNG CỘNG" ở cột Mã, in đậm, nền `hsl(var(--primary) / 0.08)`, để trống Lượng và Giá bình quân, không có nút thao tác.
- `loai === 'nhom'` → nhãn nhóm ở cột Mã (colSpan 2), in đậm, nền xám nhạt, để trống Lượng và Giá bình quân, không có nút thao tác.
- `loai === 'chiTiet'` → hiện dữ liệu; khi `editingKey === row.key` thì Lượng, Giá bình quân và T1…T12 thành `InputNumber`.
- Cột Doanh thu ở mọi hàng: khi `row.lech` thì bọc `Tooltip` với nội dung `Tổng 12 tháng (${tien(row.namTheoThang)}) khác doanh thu (${tien(row.namKhaiBao)})` và tô chữ đỏ.
- Cột % định dạng `(row.phanTram * 100).toFixed(2) + '%'`.
- Hàng đang thêm mới (`editingKey === '__moi__'`) chèn thêm một hàng ảo ở cuối bảng với `Select` nhóm sản phẩm và `Select` sản phẩm lọc theo nhóm đã chọn.

Bảng: `scroll={{ x: 'max-content' }}`, `pagination={false}`, `size="small"`, `bordered`. **Không đặt `fixed` cho bất kỳ cột nào.**

- [ ] **Step 5: Viết `BanHangTab.tsx`**

```tsx
import React, { useEffect } from 'react';
import { BanHangHandlerProvider, useBanHangHandler } from './BanHangHandlerContext';
import { BanHangTable } from './BanHangTable';

const Inner: React.FC<{ nam: number }> = ({ nam }) => {
  const handler = useBanHangHandler();

  useEffect(() => {
    handler.executeEvent('init', { nam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam]);

  return <BanHangTable />;
};

export const BanHangTab: React.FC<{ nam: number }> = ({ nam }) => (
  <BanHangHandlerProvider>
    <Inner nam={nam} />
  </BanHangHandlerProvider>
);
```

- [ ] **Step 6: Kiểm tra biên dịch**

Run: `cd fe && npx tsc --noEmit`
Expected: chỉ còn lỗi thiếu `./nhan-su/NhanSuTab`.

---

### Task 9: Tab Nhân sự

**Files:**
- Create: `fe/src/pages/ke-hoach/tabs/nhan-su/NhanSuHandlerContext.tsx`
- Create: `fe/src/pages/ke-hoach/tabs/nhan-su/handler/nhan-su.handler.ts`
- Create: `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/index.ts`
- Create: `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/init/{init.event.ts,init.state.ts,init.handler.ts}`
- Create: `fe/src/pages/ke-hoach/tabs/nhan-su/handler/sub-handler/row-edit/{row-edit.event.ts,row-edit.state.ts,row-edit.handler.ts}`
- Create: `fe/src/pages/ke-hoach/tabs/nhan-su/NhanSuTable.tsx`
- Create: `fe/src/pages/ke-hoach/tabs/nhan-su/NhanSuTab.tsx`

**Interfaces:**
- Consumes: `dungCayBang` từ `../lib/tongHop`; `keHoachNhanSuService`, `CHI_PHI_NHAN_SU_COLS` từ `@/services/keHoachNhanSuService`; `boPhanService`.
- Produces: `NhanSuTab` nhận `{ nam: number }`.

**State keys:** `nam`, `data`, `loading`, `boPhanList`, `masterDataLoaded`, `editingKey`, `formValues`, `saving`.

**Events:** giống Task 8, tên ngữ cảnh handler là `"ke-hoach-nhan-su"`.

- [ ] **Step 1: Dựng handler khung**

Sao Task 8 Step 1, đổi mọi `BanHang` thành `NhanSu`, tên ngữ cảnh `'ke-hoach-nhan-su'`.

- [ ] **Step 2: Viết `init` sub-handler**

Sao Task 8 Step 2, thay phần nạp danh mục bằng:

```ts
const boPhan = await boPhanService.getPaginated({ limit: DANH_MUC_LIMIT });
this.setState('boPhanList', boPhan.data);
```

và nạp dòng bằng `keHoachNhanSuService.layTheoNam(nam)`.

- [ ] **Step 3: Viết `row-edit` sub-handler**

Hành vi giống Task 8 Step 3. Dòng rỗng khi thêm mới:

```ts
{
  boPhanId: undefined,
  maViTri: '',
  tenChucVu: '',
  chiPhi: {
    luongChinh: 0, luongKpi: 0, thuongDoanhSo: 0,
    baoHiem: 0, daoTao: 0, thuongCongNhan: 0,
  },
  thang: Array(12).fill(0),
}
```

Payload lấy `{ id, ma, ten }` của bộ phận từ `boPhanList`.

- [ ] **Step 4: Viết `NhanSuTable.tsx`**

Cột theo đúng thứ tự sheet: `Mã vị trí`, `Tên chức vụ`, `CỘNG`, `%`, sáu cột chi phí sinh từ `CHI_PHI_NHAN_SU_COLS`, nhóm cột `Quý` bọc `Q1…Q4`, nhóm cột `Tháng` bọc `T1…T12`, cột `Thao tác`.

`doc` cho `dungCayBang`:

```ts
const tongChiPhi = (c: ChiPhiNhanSu) =>
  CHI_PHI_NHAN_SU_COLS.reduce((s, col) => s + (Number(c[col.key]) || 0), 0);

const doc = (d: KeHoachNhanSuDong) => ({
  key: d.id,
  nhomKey: d.boPhan.id,
  nhomNhan: `${d.boPhan.ma} - ${d.boPhan.ten}`,
  nhan: d.maViTri,
  thang: d.thang,
  namKhaiBao: tongChiPhi(d.chiPhi),
});
```

Hàng bộ phận cộng được **mọi** cột số, kể cả sáu cột chi phí — khác bên Bán hàng ở chỗ này. Để cộng được, giữ thêm một map `tongChiPhiTheoNhom: Map<string, ChiPhiNhanSu>` tính ngay trong `NhanSuTable` từ `data`, và tra theo `row.nhomKey` khi render hàng nhóm và hàng tổng.

Cột `CỘNG` tô đỏ + `Tooltip` khi `row.lech`, nội dung `Tổng 12 tháng (${tien(row.namTheoThang)}) khác CỘNG (${tien(row.namKhaiBao)})`.

Khi sửa: `Mã vị trí`, `Tên chức vụ` là `Input`; sáu cột chi phí và T1…T12 là `InputNumber`; `Bộ phận` là `Select` chỉ hiện ở hàng thêm mới và khi sửa.

Bảng cùng cấu hình Task 8 Step 4. **Không ghim cột.**

- [ ] **Step 5: Viết `NhanSuTab.tsx`**

Sao `BanHangTab.tsx`, đổi tên provider, hook và bảng.

- [ ] **Step 6: Kiểm tra biên dịch và lint**

Run: `cd fe && npx tsc --noEmit && npm run lint`
Expected: sạch.

- [ ] **Step 7: Chạy toàn bộ test FE**

Run: `cd fe && npx vitest run`
Expected: PASS, không hồi quy.

- [ ] **Step 8: Commit**

```bash
git add fe/src/pages/ke-hoach/tabs fe/src/App.tsx
git commit -m "feat(ke-hoach): trang 7 tab + bang nhap lieu Ban hang, Nhan su"
```

---

### Task 10: Cập nhật tài liệu

**Files:**
- Modify: `.claude/context/active-pages.md`
- Modify: `.claude/context/be-api-map.md`

- [ ] **Step 1: Ghi tuyến mới vào `be-api-map.md`**

Thêm tám route của `/voucher/ke-hoach-ban-hang` và `/voucher/ke-hoach-nhan-su` vào mục voucher-service, theo đúng định dạng bảng đang dùng trong file.

- [ ] **Step 2: Cập nhật `active-pages.md`**

Sửa dòng "Ke hoach" trong bảng Trung Tam Du Lieu: ghi rõ `/trung-tam-du-lieu/ke-hoach` giờ là trang 7 tab, tab "Chi tiết" giữ lưới 17 cột cũ, hai tab Bán hàng và Nhân sự gọi API mới, bốn tab còn lại là khung "Sắp có".

- [ ] **Step 3: Commit**

```bash
git add .claude/context
git commit -m "docs(context): ghi nhan trang Ke hoach 7 tab va API moi"
```
