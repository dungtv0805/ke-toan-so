# Module Bếp ăn (Mầm non) — GĐ A Phần 2: Điểm danh + Đề xuất mua + Nhận hàng — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Thêm nghiệp vụ Điểm danh ăn (CRUD) và Đề xuất mua thực phẩm (CRUD + số phiếu + trạng thái duyệt), và hành động "nhận hàng" tạo bút toán Nhật ký chung (Nợ 152/Có 331 NCC) + phiếu nhập kho qua ServiceClient — đưa chi phí thực phẩm vào **một sổ**.

**Architecture:** Tiếp tục trong `mam-non-service` (Phần 1). 2 entity nghiệp vụ mới + 1 entity sequence. "Nhận hàng" orchestrate liên-service qua `@app/service-client` (`ServiceClient`), forward JWT của người gọi. Công nợ NCC KHÔNG ghi bảng riêng — suy ra từ bút toán 331 (đã xác nhận qua khảo sát BE).

**Tech Stack:** NestJS 11, TypeORM (MongoDB), class-validator, `@app/service-client`, Jest + fast-check.

## Global Constraints

- Tiếp nối Phần 1 (branch `feat/mam-non-bep-an`, `mam-non-service` port 3010, DB `digital_book`). Entity mới đặt ở `libs/entities/src/mam-non/`, export qua barrel `libs/entities/src/mam-non/index.ts` (đã có).
- **"Nhận hàng" tạo 2 thứ, KHÔNG dùng payable-service:**
  1. Bút toán NKC: `serviceClient.post('voucher', '/nhat-ky-chung', {...})` — **KHÔNG dùng `createChungTu`** (nó trỏ `/chung-tu` không có handler POST).
  2. Phiếu nhập kho: `serviceClient.post('kho', '/phieu', {...})` với `loaiPhieu:'NHAP'`.
- **Bút toán NCC:** đối tượng NCC đặt ở `danhMuc.doiTuong2` (vì TK 331 nằm bên **Có**), KHÔNG phải `doiTuong`. Tài khoản là **object** `{ma, ten}`, không phải string.
- Tài khoản mặc định MVP (hardcode, cấu hình hoá sau): nhận hàng ⇒ Nợ **152** "Nguyên liệu, vật liệu" / Có **331** "Phải trả người bán".
- `ServiceClient` **nuốt lỗi** → luôn trả `{success, data?, error?}`. Mọi call PHẢI check `res.success`; không giả định throw.
- Forward token: controller lấy `@Headers('authorization') authToken: string`, truyền xuống service → `headers: { Authorization: authToken }`. Bút toán yêu cầu role `ADMIN|KE_TOAN_TRUONG|KE_TOAN_QUY`; phiếu kho yêu cầu `ADMIN|KE_TOAN_TRUONG|KE_TOAN_TONG_HOP|KE_TOAN_QUY|MANAGER`.
- Env: `.env-cmdrc` group `services` đã có `SERVICE_VOUCHER_PORT=3003` và `SERVICE_KHO_PORT=3008`; start script `mam-non` đã nạp `services`. KHÔNG cần thêm env.
- Không có MongoDB/không chạy service trong môi trường agent → verify = **build pass** + **unit test hàm thuần** (payload builders qua fast-check). Orchestration HTTP không integration-test được ở đây.
- Route tĩnh trước `@Get(':id')`. Tenant tự động (proxy repo + `TenantContextService`).

---

## Task 1: Điểm danh ăn (`diem_danh_an`) + CRUD

**Files:**
- Create: `be/libs/entities/src/mam-non/diem-danh-an.entity.ts`
- Modify: `be/libs/entities/src/mam-non/index.ts` (thêm export)
- Create: `be/apps/mam-non-service/src/diem-danh-an/{diem-danh-an.controller,diem-danh-an.service,diem-danh-an.module}.ts` + `dto/{create,update,index}`
- Modify: `be/apps/mam-non-service/src/mam-non-service.module.ts`

**Interfaces:**
- Produces: entity `DiemDanhAn` (fields: `ngay:Date, lopMa, lopTen, goiAnMa?, soTreDangKy:number, soTreAnThucTe:number, congThucCode?, ghiChu?, isActive`); route `/mam-non/diem-danh-an`.

Đây KHÔNG phải danh mục có `code` duy nhất — là bản ghi theo ngày. Bỏ `findByCode`/`checkCodeExists`. CRUD đơn giản + lọc theo `ngay`/`lopMa`.

- [ ] **Step 1: Entity** `be/libs/entities/src/mam-non/diem-danh-an.entity.ts`
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('diem_danh_an')
export class DiemDanhAn extends BaseEntity {
  @Column() ngay: Date;
  @Column() lopMa: string;
  @Column() lopTen: string;
  @Column({ nullable: true }) goiAnMa: string;
  @Column({ default: 0 }) soTreDangKy: number;
  @Column({ default: 0 }) soTreAnThucTe: number;
  @Column({ nullable: true }) congThucCode: string;
  @Column({ nullable: true }) ghiChu: string;
  @Column({ default: true }) isActive: boolean;
}

export interface DiemDanhAnEntities { DiemDanhAn: typeof DiemDanhAn; }
declare module '../entities' { interface Entities extends DiemDanhAnEntities {} }
```

- [ ] **Step 2: Export** — thêm vào `be/libs/entities/src/mam-non/index.ts`:
```ts
export * from './diem-danh-an.entity';
```

- [ ] **Step 3: DTO** `be/apps/mam-non-service/src/diem-danh-an/dto/create-diem-danh-an.dto.ts`
```ts
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString } from 'class-validator';

export class CreateDiemDanhAnDto {
  @IsDateString() ngay: string;
  @IsString() @IsNotEmpty() lopMa: string;
  @IsString() @IsNotEmpty() lopTen: string;
  @IsString() @IsOptional() goiAnMa?: string;
  @IsNumber() soTreDangKy: number;
  @IsNumber() soTreAnThucTe: number;
  @IsString() @IsOptional() congThucCode?: string;
  @IsString() @IsOptional() ghiChu?: string;
}
```
`update-diem-danh-an.dto.ts`:
```ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateDiemDanhAnDto } from './create-diem-danh-an.dto';
export class UpdateDiemDanhAnDto extends PartialType(CreateDiemDanhAnDto) {}
```
`index.ts`: `export * from './create-diem-danh-an.dto'; export * from './update-diem-danh-an.dto';`

- [ ] **Step 4: Service** `diem-danh-an.service.ts`
```ts
import { sanitizeUpdateDto, TenantContextService } from '@app/core';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiemDanhAn } from '@app/entities';
import { CreateDiemDanhAnDto, UpdateDiemDanhAnDto } from './dto';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

@Injectable()
export class DiemDanhAnService {
  constructor(
    @InjectRepository(DiemDanhAn) private readonly repo: Repository<DiemDanhAn>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<DiemDanhAn>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    let items = all.filter((i) => i.isActive !== false);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((i) => (i.lopTen || '').toLowerCase().includes(s) || (i.lopMa || '').toLowerCase().includes(s));
    }
    const total = items.length;
    return { data: items.slice(skip, skip + limit), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findAll(): Promise<DiemDanhAn[]> {
    return this.repo.find({ where: { isActive: true, ...this.getTenantFilter() } });
  }

  async findOne(id: string): Promise<DiemDanhAn> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!item) throw new NotFoundException(`Không tìm thấy DiemDanhAn với ID ${id}`);
    return item;
  }

  async create(dto: CreateDiemDanhAnDto): Promise<DiemDanhAn> {
    const item = this.repo.create({ ...dto, ngay: new Date(dto.ngay), isActive: true } as any);
    return this.repo.save(item) as any;
  }

  async update(id: string, dto: UpdateDiemDanhAnDto): Promise<DiemDanhAn> {
    const item = await this.findOne(id);
    const patch: any = sanitizeUpdateDto(dto);
    if (patch.ngay) patch.ngay = new Date(patch.ngay);
    Object.assign(item, patch);
    return this.repo.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }

  async getStats(): Promise<{ tong: number }> {
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    return { tong: all.filter((i) => i.isActive !== false).length };
  }
}
```

- [ ] **Step 5: Controller** `diem-danh-an.controller.ts`
```ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DiemDanhAnService } from './diem-danh-an.service';
import { CreateDiemDanhAnDto, UpdateDiemDanhAnDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { PaginationQueryDto } from '@app/dto';

const READ = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'];
const WRITE = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER'];

@Controller('diem-danh-an')
@UseGuards(JwtGuard, RoleGuard)
export class DiemDanhAnController {
  constructor(private readonly service: DiemDanhAnService) {}

  @Get() @Roles(...READ)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get('all') @Roles(...READ)
  async getAll() { return { success: true, data: await this.service.findAll() }; }

  @Get('stats') @Roles(...READ)
  async getStats() { return { success: true, data: await this.service.getStats() }; }

  @Get(':id') @Roles(...READ)
  async findOne(@Param('id') id: string) { return { success: true, data: await this.service.findOne(id) }; }

  @Post() @Roles(...WRITE)
  async create(@Body() dto: CreateDiemDanhAnDto) { return { success: true, data: await this.service.create(dto) }; }

  @Put(':id') @Roles(...WRITE)
  async update(@Param('id') id: string, @Body() dto: UpdateDiemDanhAnDto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Delete(':id') @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async delete(@Param('id') id: string) { await this.service.delete(id); return { success: true, message: 'Xóa thành công' }; }
}
```

- [ ] **Step 6: Module** `diem-danh-an.module.ts`
```ts
import { Module } from '@nestjs/common';
import { DiemDanhAn } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DiemDanhAnService } from './diem-danh-an.service';
import { DiemDanhAnController } from './diem-danh-an.controller';

@Module({
  imports: [DatabaseModule.forFeature([DiemDanhAn])],
  controllers: [DiemDanhAnController],
  providers: [DiemDanhAnService],
  exports: [DiemDanhAnService],
})
export class DiemDanhAnModule {}
```

- [ ] **Step 7: Đăng ký** trong `mam-non-service.module.ts`: import `DiemDanhAnModule` + thêm vào `imports[]`.

- [ ] **Step 8: Build** — `cd be && npx nest build mam-non-service` → pass.

- [ ] **Step 9: Commit**
```bash
git add be/libs/entities/src/mam-non be/apps/mam-non-service/src/diem-danh-an be/apps/mam-non-service/src/mam-non-service.module.ts
git commit -m "feat(mam-non): điểm danh ăn (diem_danh_an) + CRUD"
```

---

## Task 2: Đề xuất mua thực phẩm (`de_xuat_mua_thuc_pham`) + số phiếu + trạng thái duyệt

**Files:**
- Create: `be/libs/entities/src/mam-non/de-xuat-mua.entity.ts`, `be/libs/entities/src/mam-non/mam-non-sequence.entity.ts`
- Modify: `be/libs/entities/src/mam-non/index.ts`
- Create: `be/apps/mam-non-service/src/de-xuat-mua/{de-xuat-mua.controller,de-xuat-mua.service,mam-non-sequence.service,de-xuat-mua.module}.ts` + `dto/`
- Modify: `be/apps/mam-non-service/src/mam-non-service.module.ts`

**Interfaces:**
- Produces: entity `DeXuatMuaThucPham` (`soPhieu, ngayDeXuat:Date, nguoiDeXuat?, doiTuongMa, doiTuongTen, chiTiet[], tongTien, trangThai, nguoiDuyet?, ngayDuyet?, lyDoTuChoi?, chungTuId?, soPhieuNhapKho?, isActive`); `chiTiet` item `{stt, hangHoaMa, hangHoaTen, donViTinh?, soLuong, donGia, thanhTien}`; trạng thái `'NHAP'|'CHO_DUYET'|'DA_DUYET'|'TU_CHOI'|'DA_NHAN'`. Route `/mam-non/de-xuat-mua`. `MamNonSequenceService.next('DE_XUAT') → 'DX00001'`. Consumed by Task 3 (nhận hàng).

- [ ] **Step 1: Entity sequence** `be/libs/entities/src/mam-non/mam-non-sequence.entity.ts` (theo pattern `phieu-kho-sequence`)
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

@Entity('mam_non_sequence')
export class MamNonSequence extends BaseEntity {
  @Column() loai: string;      // 'DE_XUAT'
  @Column({ default: 0 }) current: number;
}

export interface MamNonSequenceEntities { MamNonSequence: typeof MamNonSequence; }
declare module '../entities' { interface Entities extends MamNonSequenceEntities {} }
```

- [ ] **Step 2: Entity đề xuất** `be/libs/entities/src/mam-non/de-xuat-mua.entity.ts`
```ts
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../base.entity';

export type TrangThaiDeXuat = 'NHAP' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_NHAN';

export interface ChiTietDeXuat {
  stt: number;
  hangHoaMa: string;
  hangHoaTen: string;
  donViTinh?: string;
  soLuong: number;
  donGia: number;
  thanhTien: number;
}

@Entity('de_xuat_mua_thuc_pham')
export class DeXuatMuaThucPham extends BaseEntity {
  @Column() soPhieu: string;
  @Column() ngayDeXuat: Date;
  @Column({ nullable: true }) nguoiDeXuat: string;
  @Column({ nullable: true }) doiTuongMa: string;
  @Column({ nullable: true }) doiTuongTen: string;
  @Column({ type: 'json', default: [] }) chiTiet: ChiTietDeXuat[];
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 }) tongTien: number;
  @Column({ default: 'NHAP' }) trangThai: TrangThaiDeXuat;
  @Column({ nullable: true }) nguoiDuyet: string;
  @Column({ nullable: true }) ngayDuyet: Date;
  @Column({ nullable: true }) lyDoTuChoi: string;
  @Column({ nullable: true }) chungTuId: string;        // bút toán NKC (Task 3)
  @Column({ nullable: true }) soPhieuNhapKho: string;   // phiếu nhập kho (Task 3)
  @Column({ default: true }) isActive: boolean;
}

export interface DeXuatMuaThucPhamEntities { DeXuatMuaThucPham: typeof DeXuatMuaThucPham; }
declare module '../entities' { interface Entities extends DeXuatMuaThucPhamEntities {} }
```

- [ ] **Step 3: Export cả 2** — thêm vào `be/libs/entities/src/mam-non/index.ts`:
```ts
export * from './mam-non-sequence.entity';
export * from './de-xuat-mua.entity';
```

- [ ] **Step 4: Sequence service** `be/apps/mam-non-service/src/de-xuat-mua/mam-non-sequence.service.ts`
```ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MamNonSequence } from '@app/entities';
import { TenantContextService } from '@app/core';

const PREFIX: Record<string, string> = { DE_XUAT: 'DX' };

@Injectable()
export class MamNonSequenceService {
  constructor(
    @InjectRepository(MamNonSequence) private readonly repo: Repository<MamNonSequence>,
    private readonly tenantContext: TenantContextService,
  ) {}

  private tenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  format(loai: string, n: number): string {
    return `${PREFIX[loai] ?? 'MN'}${String(n).padStart(5, '0')}`;
  }

  async next(loai: string): Promise<string> {
    const found = await this.repo.findOne({ where: { loai, ...this.tenantFilter() } as any });
    const seq = found ?? (this.repo.create({ loai, current: 0, ...this.tenantFilter() } as any) as unknown as MamNonSequence);
    seq.current = (seq.current ?? 0) + 1;
    await this.repo.save(seq);
    return this.format(loai, seq.current);
  }
}
```

- [ ] **Step 5: DTO** `be/apps/mam-non-service/src/de-xuat-mua/dto/create-de-xuat-mua.dto.ts`
```ts
import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsNumber, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ChiTietDeXuatDto {
  @IsNumber() stt: number;
  @IsString() @IsNotEmpty() hangHoaMa: string;
  @IsString() @IsNotEmpty() hangHoaTen: string;
  @IsString() @IsOptional() donViTinh?: string;
  @IsNumber() soLuong: number;
  @IsNumber() donGia: number;
  @IsNumber() thanhTien: number;
}

export class CreateDeXuatMuaDto {
  @IsDateString() ngayDeXuat: string;
  @IsString() @IsOptional() nguoiDeXuat?: string;
  @IsString() @IsOptional() doiTuongMa?: string;
  @IsString() @IsOptional() doiTuongTen?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => ChiTietDeXuatDto)
  chiTiet: ChiTietDeXuatDto[];
  @IsNumber() @IsOptional() tongTien?: number;
}
```
`update-de-xuat-mua.dto.ts`: `PartialType(CreateDeXuatMuaDto)`. `reject.dto.ts`:
```ts
import { IsString, IsNotEmpty } from 'class-validator';
export class RejectDeXuatDto { @IsString() @IsNotEmpty() lyDoTuChoi: string; }
```
`index.ts` export cả 3.

- [ ] **Step 6: Service** `de-xuat-mua.service.ts` — CRUD + tính tongTien + chuyển trạng thái. Bút toán tổng `tongTien` = Σ `chiTiet.thanhTien` nếu không truyền.
```ts
import { sanitizeUpdateDto, TenantContextService } from '@app/core';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeXuatMuaThucPham } from '@app/entities';
import { CreateDeXuatMuaDto, UpdateDeXuatMuaDto } from './dto';
import { MamNonSequenceService } from './mam-non-sequence.service';
import { PaginationQueryDto, PaginatedResult } from '@app/dto';

export function tinhTongTien(chiTiet: { thanhTien?: number }[]): number {
  return (chiTiet ?? []).reduce((s, c) => s + (c.thanhTien ?? 0), 0);
}

@Injectable()
export class DeXuatMuaService {
  constructor(
    @InjectRepository(DeXuatMuaThucPham) private readonly repo: Repository<DeXuatMuaThucPham>,
    private readonly sequence: MamNonSequenceService,
    private readonly tenantContext: TenantContextService,
  ) {}

  private getTenantFilter() {
    const tenantId = this.tenantContext.getCurrentTenantId();
    return tenantId ? { tenantId } : {};
  }

  async findAllPaginated(query: PaginationQueryDto): Promise<PaginatedResult<DeXuatMuaThucPham>> {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;
    const all = await this.repo.find({ where: this.getTenantFilter() as any });
    let items = all.filter((i) => i.isActive !== false);
    if (search) {
      const s = search.toLowerCase();
      items = items.filter((i) => (i.soPhieu || '').toLowerCase().includes(s) || (i.doiTuongTen || '').toLowerCase().includes(s));
    }
    const total = items.length;
    return { data: items.slice(skip, skip + limit), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string): Promise<DeXuatMuaThucPham> {
    const { ObjectId } = await import('mongodb');
    const item = await this.repo.findOne({ where: { _id: new ObjectId(id) as any } });
    if (!item) throw new NotFoundException(`Không tìm thấy đề xuất với ID ${id}`);
    return item;
  }

  async create(dto: CreateDeXuatMuaDto): Promise<DeXuatMuaThucPham> {
    const soPhieu = await this.sequence.next('DE_XUAT');
    const tongTien = dto.tongTien ?? tinhTongTien(dto.chiTiet);
    const item = this.repo.create({
      ...dto, soPhieu, tongTien, ngayDeXuat: new Date(dto.ngayDeXuat),
      trangThai: 'NHAP', isActive: true, ...this.getTenantFilter(),
    } as any);
    return this.repo.save(item) as any;
  }

  async update(id: string, dto: UpdateDeXuatMuaDto): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'NHAP') throw new BadRequestException('Chỉ sửa được đề xuất ở trạng thái NHAP');
    const patch: any = sanitizeUpdateDto(dto);
    if (patch.ngayDeXuat) patch.ngayDeXuat = new Date(patch.ngayDeXuat);
    if (patch.chiTiet) patch.tongTien = patch.tongTien ?? tinhTongTien(patch.chiTiet);
    Object.assign(item, patch);
    return this.repo.save(item);
  }

  async submit(id: string): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'NHAP') throw new BadRequestException('Chỉ gửi duyệt đề xuất ở trạng thái NHAP');
    item.trangThai = 'CHO_DUYET';
    return this.repo.save(item);
  }

  async approve(id: string): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'CHO_DUYET') throw new BadRequestException('Chỉ duyệt đề xuất ở trạng thái CHO_DUYET');
    item.trangThai = 'DA_DUYET';
    item.nguoiDuyet = this.tenantContext.getCurrentEmail?.() ?? '';
    item.ngayDuyet = new Date();
    return this.repo.save(item);
  }

  async reject(id: string, lyDo: string): Promise<DeXuatMuaThucPham> {
    const item = await this.findOne(id);
    if (item.trangThai !== 'CHO_DUYET') throw new BadRequestException('Chỉ từ chối đề xuất ở trạng thái CHO_DUYET');
    item.trangThai = 'TU_CHOI';
    item.lyDoTuChoi = lyDo;
    return this.repo.save(item);
  }

  async delete(id: string): Promise<void> {
    const item = await this.findOne(id);
    item.isActive = false;
    await this.repo.save(item);
  }
}
```

- [ ] **Step 7: TDD `tinhTongTien`** — `be/apps/mam-non-service/src/de-xuat-mua/tinh-tong-tien.spec.ts`
```ts
import * as fc from 'fast-check';
import { tinhTongTien } from './de-xuat-mua.service';

describe('tinhTongTien', () => {
  it('tổng = Σ thanhTien', () => {
    expect(tinhTongTien([{ thanhTien: 10 }, { thanhTien: 5 }])).toBe(15);
    expect(tinhTongTien([])).toBe(0);
  });
  it('bỏ qua thanhTien thiếu; luôn = tổng các thanhTien có mặt', () => {
    fc.assert(fc.property(
      fc.array(fc.record({ thanhTien: fc.option(fc.integer({ min: 0, max: 1e6 }), { nil: undefined }) })),
      (rows) => {
        const expected = rows.reduce((s, r) => s + (r.thanhTien ?? 0), 0);
        return tinhTongTien(rows) === expected;
      },
    ), { numRuns: 100 });
  });
});
```
Chạy: `cd be && npx jest tinh-tong-tien.spec --silent` — phải PASS sau khi service có hàm `tinhTongTien` export (viết test trước khi có hàm để thấy RED, rồi thêm export).

- [ ] **Step 8: Controller** `de-xuat-mua.controller.ts`
```ts
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { DeXuatMuaService } from './de-xuat-mua.service';
import { CreateDeXuatMuaDto, UpdateDeXuatMuaDto, RejectDeXuatDto } from './dto';
import { JwtGuard, RoleGuard, Roles } from '@app/auth';
import { PaginationQueryDto } from '@app/dto';

const READ = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'MANAGER', 'KIEM_SOAT'];
const WRITE = ['ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_TONG_HOP', 'KE_TOAN_QUY', 'MANAGER'];
const DUYET = ['ADMIN', 'KE_TOAN_TRUONG', 'MANAGER'];

@Controller('de-xuat-mua')
@UseGuards(JwtGuard, RoleGuard)
export class DeXuatMuaController {
  constructor(private readonly service: DeXuatMuaService) {}

  @Get() @Roles(...READ)
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.service.findAllPaginated(query);
    return { success: true, ...result };
  }

  @Get(':id') @Roles(...READ)
  async findOne(@Param('id') id: string) { return { success: true, data: await this.service.findOne(id) }; }

  @Post() @Roles(...WRITE)
  async create(@Body() dto: CreateDeXuatMuaDto) { return { success: true, data: await this.service.create(dto) }; }

  @Put(':id') @Roles(...WRITE)
  async update(@Param('id') id: string, @Body() dto: UpdateDeXuatMuaDto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Post(':id/submit') @Roles(...WRITE)
  async submit(@Param('id') id: string) { return { success: true, data: await this.service.submit(id) }; }

  @Post(':id/approve') @Roles(...DUYET)
  async approve(@Param('id') id: string) { return { success: true, data: await this.service.approve(id) }; }

  @Post(':id/reject') @Roles(...DUYET)
  async reject(@Param('id') id: string, @Body() dto: RejectDeXuatDto) {
    return { success: true, data: await this.service.reject(id, dto.lyDoTuChoi) };
  }

  @Delete(':id') @Roles('ADMIN', 'KE_TOAN_TRUONG')
  async delete(@Param('id') id: string) { await this.service.delete(id); return { success: true, message: 'Xóa thành công' }; }
}
```
Chú ý: `:id/submit`, `:id/approve`, `:id/reject` là POST con của `:id` — không đụng `@Get(':id')`. Đặt `@Get()` và `@Get(':id')` như trên là an toàn (chỉ 1 GET động).

- [ ] **Step 9: Module** `de-xuat-mua.module.ts`
```ts
import { Module } from '@nestjs/common';
import { DeXuatMuaThucPham, MamNonSequence } from '@app/entities';
import { DatabaseModule } from '@app/database';
import { DeXuatMuaService } from './de-xuat-mua.service';
import { DeXuatMuaController } from './de-xuat-mua.controller';
import { MamNonSequenceService } from './mam-non-sequence.service';

@Module({
  imports: [DatabaseModule.forFeature([DeXuatMuaThucPham, MamNonSequence])],
  controllers: [DeXuatMuaController],
  providers: [DeXuatMuaService, MamNonSequenceService],
  exports: [DeXuatMuaService],
})
export class DeXuatMuaModule {}
```

- [ ] **Step 10: Đăng ký** trong `mam-non-service.module.ts`: import `DeXuatMuaModule` + `imports[]`.

- [ ] **Step 11: Build + test**
Run: `cd be && npx jest tinh-tong-tien.spec --silent && npx nest build mam-non-service`
Expected: test PASS + build pass.

- [ ] **Step 12: Commit**
```bash
git add be/libs/entities/src/mam-non be/apps/mam-non-service/src/de-xuat-mua be/apps/mam-non-service/src/mam-non-service.module.ts
git commit -m "feat(mam-non): đề xuất mua thực phẩm + số phiếu DX + trạng thái duyệt (submit/approve/reject)"
```

---

## Task 3: Nhận hàng — bút toán NKC (152/331) + phiếu nhập kho (ServiceClient)

**Files:**
- Modify: `be/apps/mam-non-service/src/mam-non-service.module.ts` (import `ServiceClientModule.forRoot()`)
- Modify: `be/apps/mam-non-service/src/de-xuat-mua/de-xuat-mua.module.ts` (import `ServiceClientModule` nếu chưa global — nó `@Global` nên chỉ cần forRoot ở root)
- Create: `be/apps/mam-non-service/src/de-xuat-mua/nhan-hang.builder.ts` (hàm thuần dựng payload) + `nhan-hang.builder.spec.ts`
- Modify: `be/apps/mam-non-service/src/de-xuat-mua/de-xuat-mua.service.ts` (thêm `nhanHang`), `de-xuat-mua.controller.ts` (route `:id/nhan-hang`)

**Interfaces:**
- Consumes: `DeXuatMuaThucPham` (Task 2, trạng thái `DA_DUYET`); `ServiceClient` (`@app/service-client`).
- Produces: `buildButToanNhanHang(deXuat)` → body cho `POST voucher /nhat-ky-chung`; `buildPhieuNhapKho(deXuat)` → body cho `POST kho /phieu`; endpoint `POST /mam-non/de-xuat-mua/:id/nhan-hang` (forward JWT) đặt `chungTuId` + `soPhieuNhapKho`, trạng thái → `DA_NHAN`. Retry-safe (bỏ qua bước đã có id).

- [ ] **Step 1: Import ServiceClientModule** trong `be/apps/mam-non-service/src/mam-non-service.module.ts`:
```ts
import { ServiceClientModule } from '@app/service-client';
// trong imports: [ ... , ServiceClientModule.forRoot(), ... ]
```

- [ ] **Step 2: TDD builders — test trước** `be/apps/mam-non-service/src/de-xuat-mua/nhan-hang.builder.spec.ts`
```ts
import * as fc from 'fast-check';
import { buildButToanNhanHang, buildPhieuNhapKho } from './nhan-hang.builder';

const deXuat: any = {
  soPhieu: 'DX00001',
  ngayDeXuat: new Date('2026-07-06T00:00:00Z'),
  doiTuongMa: 'NCC_ABC', doiTuongTen: 'Công ty ABC',
  tongTien: 15,
  chiTiet: [
    { stt: 1, hangHoaMa: 'G01', hangHoaTen: 'Gạo', donViTinh: 'kg', soLuong: 2, donGia: 5, thanhTien: 10 },
    { stt: 2, hangHoaMa: 'T01', hangHoaTen: 'Thịt', donViTinh: 'kg', soLuong: 1, donGia: 5, thanhTien: 5 },
  ],
};

describe('buildButToanNhanHang', () => {
  it('Nợ 152 / Có 331, NCC ở doiTuong2, soTien = tongTien', () => {
    const b = buildButToanNhanHang(deXuat);
    expect(b.danhMuc.taiKhoanNo.ma).toBe('152');
    expect(b.danhMuc.taiKhoanCo.ma).toBe('331');
    expect(b.danhMuc.doiTuong2.ma).toBe('NCC_ABC');
    expect(b.danhMuc.doiTuong2.loai).toBe('NHA_CUNG_CAP');
    expect(b.soTien).toBe(15);
    expect(b.loai).toBe('PHIEU_CHI');
    expect(typeof b.ngay).toBe('string');
    expect(b.danhMuc.doiTuong).toBeUndefined(); // NCC KHÔNG ở doiTuong (bên Nợ là 152 kho)
  });
});

describe('buildPhieuNhapKho', () => {
  it('loaiPhieu NHAP, chiTiet map từ đề xuất, tkNo/tkCo 152/331', () => {
    const p = buildPhieuNhapKho(deXuat);
    expect(p.loaiPhieu).toBe('NHAP');
    expect(p.chiTiet).toHaveLength(2);
    expect(p.chiTiet[0].tkNo).toBe('152');
    expect(p.chiTiet[0].tkCo).toBe('331');
    expect(p.chiTiet[0].hangHoaMa).toBe('G01');
    expect(p.doiTuongMa).toBe('NCC_ABC');
  });
  it('số dòng phiếu nhập = số dòng đề xuất', () => {
    fc.assert(fc.property(
      fc.array(fc.record({
        stt: fc.integer(), hangHoaMa: fc.string(), hangHoaTen: fc.string(),
        soLuong: fc.integer({ min: 0 }), donGia: fc.integer({ min: 0 }), thanhTien: fc.integer({ min: 0 }),
      }), { minLength: 0, maxLength: 20 }),
      (chiTiet) => buildPhieuNhapKho({ ...deXuat, chiTiet }).chiTiet.length === chiTiet.length,
    ), { numRuns: 50 });
  });
});
```
Run: `cd be && npx jest nhan-hang.builder.spec --silent` → RED (module chưa có).

- [ ] **Step 3: Viết builders** `be/apps/mam-non-service/src/de-xuat-mua/nhan-hang.builder.ts`
```ts
import { DeXuatMuaThucPham } from '@app/entities';

// Tài khoản mặc định MVP (cấu hình hoá sau).
const TK_KHO = { ma: '152', ten: 'Nguyên liệu, vật liệu' };
const TK_PHAI_TRA = { ma: '331', ten: 'Phải trả người bán' };

function toISODate(d: Date | string): string {
  const date = d instanceof Date ? d : new Date(d);
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

/** Body cho POST voucher /nhat-ky-chung: Nợ 152 / Có 331, NCC ở doiTuong2. */
export function buildButToanNhanHang(dx: DeXuatMuaThucPham) {
  return {
    loai: 'PHIEU_CHI',
    ngay: toISODate(dx.ngayDeXuat),
    soTien: dx.tongTien,
    noiDung: `Nhận thực phẩm từ ${dx.doiTuongTen ?? dx.doiTuongMa ?? 'NCC'} (đề xuất ${dx.soPhieu})`,
    danhMuc: {
      taiKhoanNo: { ...TK_KHO },
      taiKhoanCo: { ...TK_PHAI_TRA },
      doiTuong2: { ma: dx.doiTuongMa, ten: dx.doiTuongTen, loai: 'NHA_CUNG_CAP' },
    },
  };
}

/** Body cho POST kho /phieu: phiếu NHẬP, chiTiet map từ đề xuất. */
export function buildPhieuNhapKho(dx: DeXuatMuaThucPham) {
  return {
    loaiPhieu: 'NHAP',
    ngayHachToan: toISODate(dx.ngayDeXuat),
    doiTuongMa: dx.doiTuongMa,
    doiTuongTen: dx.doiTuongTen,
    dienGiai: `Nhập thực phẩm theo đề xuất ${dx.soPhieu}`,
    tongTien: dx.tongTien,
    chiTiet: (dx.chiTiet ?? []).map((ct) => ({
      stt: ct.stt,
      hangHoaMa: ct.hangHoaMa,
      hangHoaTen: ct.hangHoaTen,
      donViTinh: ct.donViTinh,
      soLuong: ct.soLuong,
      donGia: ct.donGia,
      thanhTien: ct.thanhTien,
      tkNo: '152',
      tkCo: '331',
    })),
  };
}
```
Run: `cd be && npx jest nhan-hang.builder.spec --silent` → GREEN.

- [ ] **Step 4: Thêm `nhanHang` vào service** `de-xuat-mua.service.ts` — inject `ServiceClient`, thêm import + method. Retry-safe: chỉ tạo bước chưa có id; cần cả 2 id mới set `DA_NHAN`.
```ts
// thêm import:
import { ServiceClient } from '@app/service-client';
import { buildButToanNhanHang, buildPhieuNhapKho } from './nhan-hang.builder';
// constructor thêm: private readonly serviceClient: ServiceClient,

async nhanHang(id: string, authToken?: string): Promise<DeXuatMuaThucPham> {
  const item = await this.findOne(id);
  if (item.trangThai !== 'DA_DUYET' && item.trangThai !== 'DA_NHAN') {
    throw new BadRequestException('Chỉ nhận hàng đề xuất đã DUYỆT');
  }
  const headers = authToken ? { Authorization: authToken } : undefined;

  // 1) Bút toán NKC (nếu chưa tạo)
  if (!item.chungTuId) {
    const res = await this.serviceClient.post<any>('voucher', '/nhat-ky-chung', {
      headers, body: buildButToanNhanHang(item),
    });
    if (!res.success) {
      throw new BadRequestException(`Tạo bút toán thất bại: ${res.error?.message ?? res.error?.code ?? 'unknown'}`);
    }
    item.chungTuId = res.data?._id ?? res.data?.id ?? res.data?.soPhieu ?? 'created';
    await this.repo.save(item);
  }

  // 2) Phiếu nhập kho (nếu chưa tạo)
  if (!item.soPhieuNhapKho) {
    const res = await this.serviceClient.post<any>('kho', '/phieu', {
      headers, body: buildPhieuNhapKho(item),
    });
    if (!res.success) {
      throw new BadRequestException(`Tạo phiếu nhập kho thất bại: ${res.error?.message ?? res.error?.code ?? 'unknown'}`);
    }
    item.soPhieuNhapKho = res.data?.soPhieu ?? res.data?._id ?? 'created';
    await this.repo.save(item);
  }

  item.trangThai = 'DA_NHAN';
  return this.repo.save(item);
}
```

- [ ] **Step 5: Route controller** `de-xuat-mua.controller.ts` — thêm import `Headers` từ `@nestjs/common`, thêm route:
```ts
@Post(':id/nhan-hang') @Roles('ADMIN', 'KE_TOAN_TRUONG', 'KE_TOAN_QUY')
async nhanHang(@Param('id') id: string, @Headers('authorization') authToken?: string) {
  return { success: true, data: await this.service.nhanHang(id, authToken) };
}
```

- [ ] **Step 6: Đăng ký ServiceClient cho DeXuatMuaModule** — vì `ServiceClientModule.forRoot()` là `@Global`, chỉ cần đã import ở root (Step 1). Không cần sửa `de-xuat-mua.module.ts`. Xác nhận build resolve được `ServiceClient` injection.

- [ ] **Step 7: Build + test**
Run: `cd be && npx jest nhan-hang.builder.spec --silent && npx nest build mam-non-service`
Expected: test PASS + build pass (`ServiceClient` inject OK).

- [ ] **Step 8: Commit**
```bash
git add be/apps/mam-non-service/src
git commit -m "feat(mam-non): nhận hàng → bút toán NKC 152/331 + phiếu nhập kho (ServiceClient, retry-safe)"
```

---

## Kết thúc Phần 2

Sau Task 3: có Điểm danh ăn (CRUD), Đề xuất mua (số phiếu + duyệt), và "nhận hàng" ghi **một sổ** (bút toán 152/331 → tự sinh công nợ NCC trong báo cáo) + phiếu nhập kho vật lý. Đủ nền cho **Phần 3** (engine tính chi phí: xuất kho theo tiêu hao → 632/152, ngân sách vs chi phí, hao phí).

**Verify tổng Phần 2:**
Run: `cd be && npx jest tinh-tong-tien.spec nhan-hang.builder.spec --silent && npx nest build mam-non-service`
Expected: tests PASS + build pass.

**Rủi ro/giả định (cho review):** (1) tài khoản 152/331 hardcode — MVP, cấu hình sau; (2) bút toán cần token role KE_TOAN_QUY+ — nếu người "nhận hàng" không đủ quyền, voucher trả lỗi (đã bắt & báo); (3) nhận hàng không có giao dịch phân tán — thiết kế retry-safe (mỗi bước idempotent theo id đã lưu) để gọi lại sau lỗi một phần; (4) `res.data` id field (`_id`/`id`/`soPhieu`) tùy response voucher/kho — lấy fallback.
