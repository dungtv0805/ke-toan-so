# Thư viện tài liệu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`).

**Goal:** Cho 3 trang Biểu mẫu / Chính sách / Hướng dẫn: upload file (PDF/ảnh/Office) + preview, hoặc thêm link YouTube để xem; lưu file qua GridFS sau interface StorageService.

**Architecture:** 1 module BE `tai-lieu` (config-service) + entity `TaiLieu` (tenant-aware) + `StorageService` interface (impl GridFS qua MongoClient riêng). 1 component FE `DocumentLibraryPage(category)` dùng cho 3 route. Preview PDF/ảnh inline qua blob (vì endpoint cần JWT), YouTube nhúng iframe, Office tải về.

**Tech Stack:** NestJS 11 + TypeORM(mongodb) + `mongodb` GridFSBucket + `@nestjs/platform-express` FileInterceptor; React 18 + AntD + axios ServiceBase.

## Global Constraints
- Lưu file: GridFS sau interface `StorageService` (token DI `STORAGE_SERVICE`). Impl đầu = `GridFsStorageService` mở `MongoClient` từ `process.env.MONGODB_URI` + db `process.env.MONGODB_DATABASE`, bucket `tai_lieu_files`.
- Multi-tenant: TaiLieu tenant-aware tự động (DatabaseModule.forFeature). File GridFS lưu `metadata.tenantId`; stream/delete PHẢI kiểm tenantId khớp `req.user.tenantId`.
- Quyền: `@Permissions('/<cat>:xem|them|xoa')` + `@UseGuards(JwtGuard, PermissionGuard)`. `<cat>` ∈ `/bieu-mau`,`/chinh-sach`,`/huong-dan`.
- Giới hạn: file ≤ 25MB; mime whitelist: pdf, png/jpeg/gif/webp, doc/docx/xls/xlsx/ppt/pptx. Sai → 400.
- UI theo chuẩn: radius 0, controlHeight 28, FilterBar dùng chung, excel-table size="small", màu navy/gold.
- Verify (BE) `cd be && npx nest build config-service`; (FE) `cd fe && npx tsc --noEmit && npx vitest run && npm run build`.
- Commit thường xuyên; footer Co-Authored-By chuẩn repo.

---

### Task 1: Util `parseYoutubeId` (FE + BE dùng chung logic, mỗi bên 1 bản nhỏ)

**Files:**
- Create BE: `be/apps/config-service/src/tai-lieu/youtube.util.ts`
- Test BE: `be/apps/config-service/src/tai-lieu/youtube.util.spec.ts`

**Interfaces:** Produces `parseYoutubeId(url: string): string | null`.

- [ ] **Step 1: Test**
```ts
import { parseYoutubeId } from './youtube.util';
describe('parseYoutubeId', () => {
  it('watch', () => expect(parseYoutubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ'));
  it('short', () => expect(parseYoutubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ'));
  it('embed', () => expect(parseYoutubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ'));
  it('shorts', () => expect(parseYoutubeId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ'));
  it('invalid', () => expect(parseYoutubeId('https://example.com')).toBeNull());
});
```
- [ ] **Step 2: Implement**
```ts
export function parseYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const re of patterns) { const m = url.match(re); if (m) return m[1]; }
  return null;
}
```
- [ ] **Step 3:** `cd be && npx jest apps/config-service/src/tai-lieu/youtube.util.spec.ts` (hoặc `yarn test youtube.util`) → PASS.
- [ ] **Step 4: Commit** `feat(be): util parseYoutubeId cho tài liệu`

---

### Task 2: Entity `TaiLieu` + StorageService + GridFsStorageService

**Files:**
- Create: `be/libs/entities/src/config/tai-lieu.entity.ts` (+ export trong `libs/entities/src/index.ts`)
- Create: `be/apps/config-service/src/tai-lieu/storage/storage.interface.ts`
- Create: `be/apps/config-service/src/tai-lieu/storage/gridfs-storage.service.ts`

**Interfaces:**
- Produces entity `TaiLieu`; `STORAGE_SERVICE` token; `StorageService { save, stream, delete }`.

- [ ] **Step 1: Entity** (theo pattern `phieu-template.entity.ts` — ObjectIdColumn + Column)
```ts
import { Entity, ObjectIdColumn, ObjectId, Column, Index } from 'typeorm';
export type TaiLieuCategory = 'bieu-mau' | 'chinh-sach' | 'huong-dan';
export type TaiLieuType = 'file' | 'youtube';
@Entity('tai_lieu')
export class TaiLieu {
  @ObjectIdColumn() _id: ObjectId;
  @Column() @Index() tenantId: string;
  @Column() @Index() category: TaiLieuCategory;
  @Column() title: string;
  @Column({ nullable: true }) moTa?: string;
  @Column() type: TaiLieuType;
  @Column({ nullable: true }) storageKey?: string;
  @Column({ nullable: true }) tenFile?: string;
  @Column({ nullable: true }) mimeType?: string;
  @Column({ nullable: true }) size?: number;
  @Column({ nullable: true }) youtubeUrl?: string;
  @Column({ nullable: true }) youtubeId?: string;
  @Column() createdAt: Date;
  @Column({ nullable: true }) createdBy?: string;
}
```
Export trong `libs/entities/src/index.ts`: `export * from './config/tai-lieu.entity';`

- [ ] **Step 2: Interface**
```ts
export const STORAGE_SERVICE = 'STORAGE_SERVICE';
export interface StoredFileMeta { storageKey: string; size: number; }
export interface StorageService {
  save(buffer: Buffer, opts: { filename: string; mimeType: string; tenantId: string }): Promise<StoredFileMeta>;
  stream(storageKey: string, tenantId: string): Promise<NodeJS.ReadableStream>;
  delete(storageKey: string): Promise<void>;
}
```

- [ ] **Step 3: GridFsStorageService** (mở MongoClient riêng từ env; bucket `tai_lieu_files`; metadata.tenantId; stream kiểm tenant)
```ts
import { Injectable, OnModuleDestroy, NotFoundException, ForbiddenException } from '@nestjs/common';
import { MongoClient, Db, GridFSBucket, ObjectId } from 'mongodb';
import { Readable } from 'stream';
import { StorageService, StoredFileMeta } from './storage.interface';

@Injectable()
export class GridFsStorageService implements StorageService, OnModuleDestroy {
  private client?: MongoClient;
  private bucket?: GridFSBucket;
  private async getBucket(): Promise<GridFSBucket> {
    if (this.bucket) return this.bucket;
    const uri = process.env.MONGODB_URI as string;
    const dbName = process.env.MONGODB_DATABASE as string;
    this.client = new MongoClient(uri);
    await this.client.connect();
    const db: Db = this.client.db(dbName);
    this.bucket = new GridFSBucket(db, { bucketName: 'tai_lieu_files' });
    return this.bucket;
  }
  async save(buffer: Buffer, opts: { filename: string; mimeType: string; tenantId: string }): Promise<StoredFileMeta> {
    const bucket = await this.getBucket();
    return new Promise((resolve, reject) => {
      const up = bucket.openUploadStream(opts.filename, { metadata: { tenantId: opts.tenantId, mimeType: opts.mimeType } });
      Readable.from(buffer).pipe(up)
        .on('error', reject)
        .on('finish', () => resolve({ storageKey: up.id.toString(), size: buffer.length }));
    });
  }
  async stream(storageKey: string, tenantId: string): Promise<NodeJS.ReadableStream> {
    const bucket = await this.getBucket();
    const _id = new ObjectId(storageKey);
    const files = await bucket.find({ _id }).toArray();
    if (!files.length) throw new NotFoundException('Không tìm thấy file');
    if (files[0].metadata?.tenantId !== tenantId) throw new ForbiddenException('Không có quyền');
    return bucket.openDownloadStream(_id);
  }
  async delete(storageKey: string): Promise<void> {
    const bucket = await this.getBucket();
    try { await bucket.delete(new ObjectId(storageKey)); } catch { /* đã xoá */ }
  }
  async onModuleDestroy() { await this.client?.close(); }
}
```
- [ ] **Step 4:** `cd be && npx nest build config-service` → OK (chưa wire module, có thể chưa build tới; bỏ qua nếu lỗi "unused", sẽ wire ở Task 3).
- [ ] **Step 5: Commit** `feat(be): entity TaiLieu + StorageService(GridFS)`

---

### Task 3: Module `tai-lieu` (controller + service + DTO) + wire + gateway

**Files:**
- Create: `be/apps/config-service/src/tai-lieu/dto/tai-lieu.dto.ts`
- Create: `be/apps/config-service/src/tai-lieu/tai-lieu.service.ts`
- Create: `be/apps/config-service/src/tai-lieu/tai-lieu.controller.ts`
- Create: `be/apps/config-service/src/tai-lieu/tai-lieu.module.ts`
- Modify: `be/apps/config-service/src/config-service.module.ts` (import `TaiLieu_Module`)
- Modify: `be/apps/gateway/src/environments/environment.ts` (route `/tai-lieu` → config)
- Modify: `be/package.json` (devDep `@types/multer`)

**Interfaces:** Consumes Task 2 (`TaiLieu`, `STORAGE_SERVICE`, `StorageService`), Task 1 (`parseYoutubeId`).

- [ ] **Step 1: DTO**
```ts
import { IsIn, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
const CATS = ['bieu-mau', 'chinh-sach', 'huong-dan'] as const;
export class CreateFileDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() moTa?: string;
  @IsIn(CATS as unknown as string[]) category: string;
}
export class CreateYoutubeDto {
  @IsString() @IsNotEmpty() title: string;
  @IsOptional() @IsString() moTa?: string;
  @IsIn(CATS as unknown as string[]) category: string;
  @IsUrl() youtubeUrl: string;
}
```

- [ ] **Step 2: Service** (CRUD + storage; tenantId truyền từ controller)
```ts
import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaiLieu } from '@app/entities';
import { STORAGE_SERVICE, StorageService } from './storage/storage.interface';
import { parseYoutubeId } from './youtube.util';

const ALLOWED = new Set([
  'application/pdf','image/png','image/jpeg','image/gif','image/webp',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);
const MAX = 25 * 1024 * 1024;

@Injectable()
export class TaiLieu_Service {
  constructor(
    @InjectRepository(TaiLieu) private readonly repo: Repository<TaiLieu>,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}
  list(category: string) { return this.repo.find({ where: { category }, order: { createdAt: 'DESC' } as any }); }
  async createFile(file: Express.Multer.File, dto: { title: string; moTa?: string; category: string }, ctx: { tenantId: string; userId?: string }) {
    if (!file) throw new BadRequestException('Thiếu file');
    if (file.size > MAX) throw new BadRequestException('File vượt quá 25MB');
    if (!ALLOWED.has(file.mimetype)) throw new BadRequestException('Định dạng file không hỗ trợ');
    const saved = await this.storage.save(file.buffer, { filename: file.originalname, mimeType: file.mimetype, tenantId: ctx.tenantId });
    const tl = this.repo.create({ ...dto, type: 'file', storageKey: saved.storageKey, tenFile: file.originalname, mimeType: file.mimetype, size: saved.size, createdAt: new Date(), createdBy: ctx.userId });
    return this.repo.save(tl);
  }
  async createYoutube(dto: { title: string; moTa?: string; category: string; youtubeUrl: string }, ctx: { userId?: string }) {
    const yid = parseYoutubeId(dto.youtubeUrl);
    if (!yid) throw new BadRequestException('Link YouTube không hợp lệ');
    const tl = this.repo.create({ title: dto.title, moTa: dto.moTa, category: dto.category, type: 'youtube', youtubeUrl: dto.youtubeUrl, youtubeId: yid, createdAt: new Date(), createdBy: ctx.userId });
    return this.repo.save(tl);
  }
  async findOne(id: string) { const tl = await this.repo.findOne({ where: { _id: new (require('mongodb').ObjectId)(id) } as any }); if (!tl) throw new NotFoundException(); return tl; }
  async streamFile(id: string, tenantId: string) {
    const tl = await this.findOne(id);
    if (tl.type !== 'file' || !tl.storageKey) throw new BadRequestException('Không phải file');
    return { tl, stream: await this.storage.stream(tl.storageKey, tenantId) };
  }
  async remove(id: string) { const tl = await this.findOne(id); if (tl.storageKey) await this.storage.delete(tl.storageKey); await this.repo.remove(tl); }
}
```

- [ ] **Step 3: Controller** (FileInterceptor memory; quyền theo category lấy từ body/query)
```ts
import { Controller, Get, Post, Delete, Param, Query, Body, UploadedFile, UseInterceptors, UseGuards, Req, Res } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtGuard } from '@app/auth';
import { Permissions } from '@app/auth';
import { PermissionGuard } from '@app/auth';
import { TaiLieu_Service } from './tai-lieu.service';
import { CreateFileDto, CreateYoutubeDto } from './dto/tai-lieu.dto';

@Controller('tai-lieu')
@UseGuards(JwtGuard, PermissionGuard)
export class TaiLieu_Controller {
  constructor(private readonly service: TaiLieu_Service) {}
  // Quyền động theo category: dùng guard chung kiểm `:xem/:them/:xoa` qua @Permissions tĩnh theo từng route.
  // Vì @Permissions tĩnh, ta kiểm quyền thủ công theo category trong handler (xem ghi chú).

  @Get()
  async list(@Query('category') category: string, @Req() req: any) {
    requirePerm(req, category, 'xem');
    return { success: true, data: await this.service.list(category) };
  }
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File, @Body() dto: CreateFileDto, @Req() req: any) {
    requirePerm(req, dto.category, 'them');
    const data = await this.service.createFile(file, dto, { tenantId: req.user.tenantId, userId: req.user.id });
    return { success: true, data };
  }
  @Post('youtube')
  async youtube(@Body() dto: CreateYoutubeDto, @Req() req: any) {
    requirePerm(req, dto.category, 'them');
    const data = await this.service.createYoutube(dto, { userId: req.user.id });
    return { success: true, data };
  }
  @Get(':id/file')
  async file(@Param('id') id: string, @Req() req: any, @Res() res: Response) {
    const { tl, stream } = await this.service.streamFile(id, req.user.tenantId);
    requirePerm(req, tl.category, 'xem');
    const inline = tl.mimeType === 'application/pdf' || tl.mimeType?.startsWith('image/');
    res.setHeader('Content-Type', tl.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(tl.tenFile || 'file')}"`);
    (stream as any).pipe(res);
  }
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    const tl = await this.service.findOne(id);
    requirePerm(req, tl.category, 'xoa');
    await this.service.remove(id);
    return { success: true };
  }
}
function requirePerm(req: any, category: string, action: string) {
  const perm = `/${category}:${action}`;
  const perms: string[] = req.user?.permissions || [];
  const isSuper = req.user?.isSuperAdmin;
  if (!isSuper && !perms.includes('*') && !perms.includes(perm)) {
    const { ForbiddenException } = require('@nestjs/common');
    throw new ForbiddenException(`Bạn không có quyền: ${perm}`);
  }
}
```
> Ghi chú: vì quyền phụ thuộc `category` runtime (không tĩnh được với `@Permissions`), ta kiểm thủ công bằng `requirePerm()` đọc `req.user.permissions` (JwtGuard đã gắn). Bỏ `PermissionGuard` khỏi `@UseGuards` nếu nó chặn do thiếu metadata — chỉ giữ `JwtGuard`. (Khi triển khai: nếu PermissionGuard trả true khi không có metadata thì giữ; ở đây kiểm thủ công nên chỉ cần `@UseGuards(JwtGuard)`.)

- [ ] **Step 4: Module + wire**
```ts
// tai-lieu.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@app/database';
import { AuthModule } from '@app/auth';
import { TaiLieu } from '@app/entities';
import { TaiLieu_Controller } from './tai-lieu.controller';
import { TaiLieu_Service } from './tai-lieu.service';
import { STORAGE_SERVICE } from './storage/storage.interface';
import { GridFsStorageService } from './storage/gridfs-storage.service';
@Module({
  imports: [DatabaseModule.forFeature([TaiLieu]), AuthModule],
  controllers: [TaiLieu_Controller],
  providers: [TaiLieu_Service, { provide: STORAGE_SERVICE, useClass: GridFsStorageService }],
})
export class TaiLieu_Module {}
```
Thêm `TaiLieu_Module` vào `imports` của `config-service.module.ts`.

- [ ] **Step 5: Gateway route** — thêm vào `environment.routes`: `{ pathPrefix: '/tai-lieu', service: 'config', stripPrefix: true }`. (config service strip `/tai-lieu`? KHÔNG: controller path là `tai-lieu`. Nếu stripPrefix=true thì target mất `/tai-lieu` → controller không match. Đặt `stripPrefix: false` để giữ `/tai-lieu`.) → dùng `{ pathPrefix: '/tai-lieu', service: 'config', stripPrefix: false }`.

- [ ] **Step 6: dep** `cd be && yarn add -D @types/multer`.
- [ ] **Step 7: Build** `cd be && npx nest build config-service && npx nest build gateway` → OK.
- [ ] **Step 8: Commit** `feat(be): module tai-lieu (upload/list/stream/delete/youtube) + gateway route`

---

### Task 4: FE service `taiLieuService`

**Files:** Create `fe/src/services/taiLieuService.ts`

**Interfaces:** Produces `taiLieuService.{ list, uploadFile, addYoutube, remove, fetchFileObjectUrl }`.

- [ ] **Step 1: Implement** (dùng ServiceBase + 1 axios riêng cho blob có token)
```ts
import { ServiceBase } from './base/service-base';
import { getAuthToken } from './base/service-base';
import { API_CONFIG } from '@/config'; // baseURL

export interface TaiLieu {
  _id: string; category: string; title: string; moTa?: string;
  type: 'file' | 'youtube';
  storageKey?: string; tenFile?: string; mimeType?: string; size?: number;
  youtubeUrl?: string; youtubeId?: string; createdAt: string;
}
class TaiLieuService extends ServiceBase {
  constructor() { super({ endpoint: '/tai-lieu' }); }
  async list(category: string): Promise<TaiLieu[]> {
    const r = await this.get<TaiLieu[]>({ params: { category } }); return r as any;
  }
  async uploadFile(p: { category: string; title: string; moTa?: string; file: File }): Promise<TaiLieu> {
    const fd = new FormData();
    fd.append('file', p.file); fd.append('title', p.title); fd.append('category', p.category);
    if (p.moTa) fd.append('moTa', p.moTa);
    return this.post<TaiLieu>(fd) as any;
  }
  async addYoutube(p: { category: string; title: string; moTa?: string; youtubeUrl: string }): Promise<TaiLieu> {
    return this.post<TaiLieu>(p, { endpoint: '/youtube' }) as any;
  }
  async remove(id: string): Promise<void> { return super.delete({ endpoint: `/${id}` }); }
  async fetchFileObjectUrl(id: string): Promise<string> {
    const token = getAuthToken();
    const res = await fetch(`${API_CONFIG.BASE_URL}/tai-lieu/${id}/file`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) throw new Error('Không tải được file');
    return URL.createObjectURL(await res.blob());
  }
}
export const taiLieuService = new TaiLieuService();
```
> Lưu ý: xác minh tên export `getAuthToken` và `API_CONFIG.BASE_URL` đúng với `service-base.ts`/`@/config`. Nếu `ServiceBase.get` trả `{data}` thì map lại cho đúng.

- [ ] **Step 2:** `cd fe && npx tsc --noEmit` → 0 lỗi.
- [ ] **Step 3: Commit** `feat(fe): taiLieuService`

---

### Task 5: FE component `DocumentLibraryPage` + modal + preview

**Files:**
- Create: `fe/src/pages/thu-vien/DocumentLibraryPage.tsx`
- Create: `fe/src/pages/thu-vien/UploadTaiLieuModal.tsx`
- Create: `fe/src/pages/thu-vien/TaiLieuPreviewDrawer.tsx`
- Create wrappers: `fe/src/pages/thu-vien/BieuMauPage.tsx`, `ChinhSachPage.tsx`, `HuongDanPage.tsx`

**Interfaces:** Consumes `taiLieuService`, `usePagePermission`, `FilterBar`.

- [ ] **Step 1: DocumentLibraryPage** (breadcrumb + FilterBar + excel-table + preview/upload). Props `{ category, label }`. Dùng `usePagePermission('/'+category)` cho canCreate/canDelete. Cột: icon loại, Tiêu đề, Mô tả, Kích thước, Ngày, Thao tác (Xem/Tải/Xoá). State: list, loading, search, previewItem, uploadOpen. Load `taiLieuService.list(category)` on mount. (Code đầy đủ viết khi thực thi — theo mẫu trang danh mục: Breadcrumb + `<FilterBar search={...} actions={canCreate && <Button type=primary onClick={openUpload}>Tải lên</Button>} />` + `<Table className="excel-table" size="small" ... />`.)
- [ ] **Step 2: UploadTaiLieuModal** — AntD `Modal` + `Tabs` [Tải file | Link YouTube]. Tab file: `Form` (title, moTa, `Upload beforeUpload` giữ file, accept whitelist). Tab youtube: `Form` (title, moTa, youtubeUrl). Submit gọi `uploadFile`/`addYoutube` → onSuccess reload.
- [ ] **Step 3: TaiLieuPreviewDrawer** — `Drawer` width 800. Nếu youtube: `<iframe src={https://www.youtube.com/embed/${item.youtubeId}} ... />`. Nếu file: gọi `fetchFileObjectUrl(item._id)` → objectUrl; pdf → `<iframe src={objectUrl} style={{width:'100%',height:'80vh'}}/>`; image (`mimeType.startsWith('image/')`) → `<img src={objectUrl}/>`; khác (office) → text "Không xem trực tiếp được" + `<Button onClick={download}>Tải về</Button>`. `revokeObjectURL` khi đóng/unmount.
- [ ] **Step 4: Wrappers**
```tsx
// BieuMauPage.tsx
import { DocumentLibraryPage } from './DocumentLibraryPage';
export default function BieuMauPage(){ return <DocumentLibraryPage category="bieu-mau" label="Biểu mẫu" />; }
// tương tự ChinhSachPage (chinh-sach / "Chính sách"), HuongDanPage (huong-dan / "Hướng dẫn")
```
- [ ] **Step 5:** `cd fe && npx tsc --noEmit` → 0 lỗi.
- [ ] **Step 6: Commit** `feat(fe): DocumentLibraryPage + upload modal + preview drawer`

---

### Task 6: Routes + menu + phân quyền (FE)

**Files:**
- Modify: `fe/src/App.tsx` (3 route)
- Modify: `fe/src/components/layout/MainLayout.tsx` (existingRoutes)
- Modify: `fe/src/config/routePermissions.ts`
- Modify: `fe/src/pages/cau-hinh/phan-quyen/constants/permissionModules.ts`

- [ ] **Step 1: Routes** — trong nhóm route con của MainLayout, thêm:
```tsx
<Route path="bieu-mau" element={<ProtectedRoute requiredPermission="/bieu-mau:xem"><BieuMauPage /></ProtectedRoute>} />
<Route path="chinh-sach" element={<ProtectedRoute requiredPermission="/chinh-sach:xem"><ChinhSachPage /></ProtectedRoute>} />
<Route path="huong-dan" element={<ProtectedRoute requiredPermission="/huong-dan:xem"><HuongDanPage /></ProtectedRoute>} />
```
(import 3 page; lazy nếu các route khác lazy.)
- [ ] **Step 2: existingRoutes** — thêm `"/bieu-mau","/chinh-sach","/huong-dan"` vào set trong MainLayout.tsx (hết coming-soon, menu sáng được).
- [ ] **Step 3: routePermissions.ts** — thêm `'/bieu-mau': '/bieu-mau:xem'`, `'/chinh-sach': '/chinh-sach:xem'`, `'/huong-dan': '/huong-dan:xem'`.
- [ ] **Step 4: permissionModules.ts** — trong section "THƯ VIỆN", thêm 3 module: `{ key: '/bieu-mau', label: 'Biểu mẫu' }`, `{ key: '/chinh-sach', label: 'Chính sách' }`, `{ key: '/huong-dan', label: 'Hướng dẫn' }` (để cấu hình quyền xem/thêm/xoá).
- [ ] **Step 5: Verify** `cd fe && npx tsc --noEmit && npx vitest run && npm run build` → pass.
- [ ] **Step 6: Commit** `feat(fe): route + menu + phân quyền cho Thư viện tài liệu`

---

### Task 7: Tích hợp & deploy
- [ ] **Step 1:** BE build cả 2 service: `cd be && npx nest build config-service && npx nest build gateway`.
- [ ] **Step 2:** Deploy BE (config-service + gateway main.js) + restart container; deploy FE (build + nginx) theo skill db-deploy.
- [ ] **Step 3:** Smoke test trên masterceo.com.vn: cấp quyền `/bieu-mau:xem/them/xoa`... ở Phân quyền; vào trang, upload 1 PDF → preview inline; thêm 1 link YouTube → nhúng xem; tải file office; xoá.
- [ ] **Step 4: Commit** (nếu có chỉnh) + ghi chú.

---

## Self-Review
- **Spec coverage:** StorageService/GridFS→T2; entity→T2; API upload/list/stream/delete/youtube→T3; validation/mime/size→T3; youtube parse→T1; quyền per-category→T3(requirePerm)+T6; FE service→T4; DocumentLibraryPage+modal+preview→T5; routes/menu/perm→T6; deploy→T7. ✅
- **Placeholder:** code FE chi tiết của T5 viết khi thực thi theo mẫu trang danh mục (đã nêu cấu trúc + các đoạn then chốt: iframe pdf/youtube, blob). Chấp nhận ở mức plan vì là UI lắp ghép theo mẫu sẵn có.
- **Rủi ro cần xác minh khi code:** (a) cách lấy `API_CONFIG.BASE_URL`/`getAuthToken` đúng tên; (b) `ServiceBase.get` trả gì (data vs {data,meta}); (c) PermissionGuard có chặn khi thiếu metadata không (nếu có → chỉ dùng `@UseGuards(JwtGuard)` + requirePerm thủ công); (d) gateway proxy có chuyển multipart + giữ header Authorization (đã xác nhận proxy chuyển transparent).
