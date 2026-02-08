# Phase 1: Backend - Entity & DTOs

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tạo Entity HopDong và các DTOs cho backend

---

## Task 1: Tạo Entity HopDong

**Files:**
- Create: `be/libs/entities/src/master-data/hop-dong.entity.ts`

**Step 1: Tạo file entity**

```typescript
import { Entity, Column, ObjectIdColumn, ObjectId } from 'typeorm';
import { BaseEntity } from '../base.entity';

export enum TrangThaiHopDong {
  CHUA_CO_HD = 'CHUA_CO_HD',
  HD_CHUA_KY = 'HD_CHUA_KY',
  HD_PHOTO_SCAN = 'HD_PHOTO_SCAN',
  HD_GOC = 'HD_GOC',
}

// Embedded types
export interface PhuLuc {
  giaTri?: number;
  ngayKy?: Date;
}

export interface DieuKhoanThanhToan {
  tamUng?: string;
  thanhToanGiaiDoan?: string;
  quyetToan?: string;
}

export interface BaoHanh {
  giaTri?: number;
  thoiGian?: string;
  hinhThuc?: string;
}

export interface TienDoThiCong {
  soNgay?: number;
  tuNgay?: Date;
  denNgay?: Date;
}

@Entity('hop_dong')
export class HopDong extends BaseEntity {
  // Thông tin chính
  @Column({ unique: true })
  soHopDong: string;

  @Column()
  tenCongTrinh: string;

  @Column({ type: 'decimal', nullable: true })
  giaTriSauThue?: number;

  @Column({ type: 'date', nullable: true })
  ngayKy?: Date;

  // Phụ lục (embedded)
  @Column({ type: 'json', nullable: true })
  phuLuc1?: PhuLuc;

  @Column({ type: 'json', nullable: true })
  phuLuc2?: PhuLuc;

  // Chủ đầu tư - liên kết với DoiTuong
  @Column({ nullable: true })
  doiTuongId?: string;

  @Column({ nullable: true })
  nguoiKy?: string;

  @Column({ nullable: true })
  chucVu?: string;

  @Column({ nullable: true })
  nguoiGiaoDich?: string;

  // Điều khoản thanh toán (embedded)
  @Column({ type: 'json', nullable: true })
  dieuKhoanThanhToan?: DieuKhoanThanhToan;

  // Bảo hành (embedded)
  @Column({ type: 'json', nullable: true })
  baoHanh?: BaoHanh;

  // Tiến độ thi công (embedded)
  @Column({ type: 'json', nullable: true })
  tienDoThiCong?: TienDoThiCong;

  // Trạng thái & Lưu trữ
  @Column({ type: 'enum', enum: TrangThaiHopDong, nullable: true })
  trangThai?: TrangThaiHopDong;

  @Column({ type: 'int', nullable: true })
  soLuongLuu?: number;

  @Column({ default: true })
  isActive: boolean;
}

export interface HopDongEntities {
  HopDong: typeof HopDong;
}

declare module '../entities' {
  interface Entities extends HopDongEntities {}
}
```

**Step 2: Commit**

```bash
git add be/libs/entities/src/master-data/hop-dong.entity.ts
git commit -m "feat(be): add HopDong entity with embedded types"
```

---

## Task 2: Export Entity từ index

**Files:**
- Modify: `be/libs/entities/src/master-data/index.ts`

**Step 1: Thêm import và export**

Thêm vào cuối file:

```typescript
import './hop-dong.entity';
export * from './hop-dong.entity';
```

**Step 2: Commit**

```bash
git add be/libs/entities/src/master-data/index.ts
git commit -m "feat(be): export HopDong entity from index"
```

---

## Task 3: Tạo Create DTO

**Files:**
- Create: `be/apps/master-data-service/src/hop-dong/dto/create-hop-dong.dto.ts`

**Step 1: Tạo file DTO**

```typescript
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsEnum,
  ValidateNested,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TrangThaiHopDong } from '@app/entities';

class PhuLucDto {
  @IsNumber()
  @IsOptional()
  giaTri?: number;

  @IsDateString()
  @IsOptional()
  ngayKy?: string;
}

class DieuKhoanThanhToanDto {
  @IsString()
  @IsOptional()
  tamUng?: string;

  @IsString()
  @IsOptional()
  thanhToanGiaiDoan?: string;

  @IsString()
  @IsOptional()
  quyetToan?: string;
}

class BaoHanhDto {
  @IsNumber()
  @IsOptional()
  giaTri?: number;

  @IsString()
  @IsOptional()
  thoiGian?: string;

  @IsString()
  @IsOptional()
  hinhThuc?: string;
}

class TienDoThiCongDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  soNgay?: number;

  @IsDateString()
  @IsOptional()
  tuNgay?: string;

  @IsDateString()
  @IsOptional()
  denNgay?: string;
}

export class CreateHopDongDto {
  @IsString()
  @IsNotEmpty()
  soHopDong: string;

  @IsString()
  @IsNotEmpty()
  tenCongTrinh: string;

  @IsNumber()
  @IsOptional()
  giaTriSauThue?: number;

  @IsDateString()
  @IsOptional()
  ngayKy?: string;

  @ValidateNested()
  @Type(() => PhuLucDto)
  @IsOptional()
  phuLuc1?: PhuLucDto;

  @ValidateNested()
  @Type(() => PhuLucDto)
  @IsOptional()
  phuLuc2?: PhuLucDto;

  @IsString()
  @IsOptional()
  doiTuongId?: string;

  @IsString()
  @IsOptional()
  nguoiKy?: string;

  @IsString()
  @IsOptional()
  chucVu?: string;

  @IsString()
  @IsOptional()
  nguoiGiaoDich?: string;

  @ValidateNested()
  @Type(() => DieuKhoanThanhToanDto)
  @IsOptional()
  dieuKhoanThanhToan?: DieuKhoanThanhToanDto;

  @ValidateNested()
  @Type(() => BaoHanhDto)
  @IsOptional()
  baoHanh?: BaoHanhDto;

  @ValidateNested()
  @Type(() => TienDoThiCongDto)
  @IsOptional()
  tienDoThiCong?: TienDoThiCongDto;

  @IsEnum(TrangThaiHopDong)
  @IsOptional()
  trangThai?: TrangThaiHopDong;

  @IsInt()
  @Min(0)
  @IsOptional()
  soLuongLuu?: number;
}
```

**Step 2: Commit**

```bash
git add be/apps/master-data-service/src/hop-dong/dto/create-hop-dong.dto.ts
git commit -m "feat(be): add CreateHopDongDto with nested validation"
```

---

## Task 4: Tạo Update DTO

**Files:**
- Create: `be/apps/master-data-service/src/hop-dong/dto/update-hop-dong.dto.ts`

**Step 1: Tạo file DTO**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateHopDongDto } from './create-hop-dong.dto';

export class UpdateHopDongDto extends PartialType(CreateHopDongDto) {}
```

**Step 2: Commit**

```bash
git add be/apps/master-data-service/src/hop-dong/dto/update-hop-dong.dto.ts
git commit -m "feat(be): add UpdateHopDongDto"
```

---

## Task 5: Tạo Query DTO

**Files:**
- Create: `be/apps/master-data-service/src/hop-dong/dto/hop-dong-query.dto.ts`

**Step 1: Tạo file DTO**

```typescript
import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { TrangThaiHopDong } from '@app/entities';

export class HopDongQueryDto {
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 10;

  @IsString()
  @IsOptional()
  search?: string;

  @IsEnum(TrangThaiHopDong)
  @IsOptional()
  trangThai?: TrangThaiHopDong;

  @IsString()
  @IsOptional()
  doiTuongId?: string;
}
```

**Step 2: Commit**

```bash
git add be/apps/master-data-service/src/hop-dong/dto/hop-dong-query.dto.ts
git commit -m "feat(be): add HopDongQueryDto"
```

---

## Task 6: Tạo DTO index

**Files:**
- Create: `be/apps/master-data-service/src/hop-dong/dto/index.ts`

**Step 1: Tạo file index**

```typescript
export * from './create-hop-dong.dto';
export * from './update-hop-dong.dto';
export * from './hop-dong-query.dto';
```

**Step 2: Commit**

```bash
git add be/apps/master-data-service/src/hop-dong/dto/index.ts
git commit -m "feat(be): add HopDong DTOs index"
```

---

## Phase 1 Complete Checklist

- [ ] Entity HopDong created with all embedded types
- [ ] Entity exported from index
- [ ] CreateHopDongDto with nested validation
- [ ] UpdateHopDongDto extends PartialType
- [ ] HopDongQueryDto for pagination and filtering
- [ ] DTOs index file created
