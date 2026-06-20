# Thư viện tài liệu — Biểu mẫu / Chính sách / Hướng dẫn (upload + preview)

**Ngày:** 2026-06-20
**Nhánh:** `feat/thu-vien-tai-lieu`

## Bối cảnh
- 3 trang `/bieu-mau`, `/chinh-sach`, `/huong-dan` hiện là ComingSoon (chưa có route thật, không trong `existingRoutes`).
- Backend CHƯA có hạ tầng upload/lưu/serve file (không multer, không storage). Upload Excel hiện chỉ parse client-side.
- Mục tiêu: cho phép **upload file + preview**; riêng Hướng dẫn (và cả 3) hỗ trợ thêm **link YouTube** để xem.

## Quyết định đã chốt
- **Lưu trữ:** GridFS, đặt sau interface `StorageService` (đổi sang MinIO sau chỉ thay 1 impl).
- **Preview:** PDF + ảnh xem inline; YouTube nhúng iframe; file Office (Word/Excel/PPT) chỉ nút tải về.
- **Phân quyền:** mỗi module mới có `:xem / :them / :xoa`; xem cần `:xem`, upload/xoá cần `:them`/`:xoa`.
- **Gộp chung 1 tính năng** "Thư viện tài liệu" dùng cho cả 3 trang (khác nhau `category`).

---

## Phần A — Backend (config-service, multi-tenant)

### A1. StorageService interface (libs hoặc trong module)
```ts
export interface StoredFileMeta { storageKey: string; size: number; mimeType: string; }
export interface StorageService {
  save(buffer: Buffer, opts: { filename: string; mimeType: string; tenantId: string; }): Promise<StoredFileMeta>; // trả storageKey
  stream(storageKey: string): Promise<NodeJS.ReadableStream>;
  delete(storageKey: string): Promise<void>;
}
```
- Token DI: `STORAGE_SERVICE`. Impl đầu tiên: `GridFsStorageService`.
- `GridFsStorageService` dùng `GridFSBucket` (package `mongodb` ^7 đã có) trên Db lấy từ TypeORM `DataSource` (native connection). Bucket name `tai_lieu_files`. `storageKey` = GridFS `_id` (string). Lưu `metadata: { tenantId }` trên file GridFS để chống rò chéo tenant (stream phải kiểm tenant khớp).

### A2. Entity `TaiLieu` (collection `tai_lieu`, tenant-aware như các entity khác)
```ts
@Entity('tai_lieu')
class TaiLieu {
  @ObjectIdColumn() _id: ObjectId;
  @Column() tenantId: string;           // theo cơ chế tenant-aware repo hiện có
  @Column() category: 'bieu-mau' | 'chinh-sach' | 'huong-dan';
  @Column() title: string;
  @Column() moTa?: string;
  @Column() type: 'file' | 'youtube';
  // type === 'file'
  @Column() storageKey?: string;        // GridFS id
  @Column() tenFile?: string;
  @Column() mimeType?: string;
  @Column() size?: number;
  // type === 'youtube'
  @Column() youtubeUrl?: string;
  @Column() youtubeId?: string;         // parse từ url
  @Column() createdAt: Date;
  @Column() createdBy?: string;         // userId/email
}
```

### A3. Module `tai-lieu` trong `apps/config-service/src/tai-lieu`
- `tai-lieu.controller.ts`, `tai-lieu.service.ts`, `dto/`, đăng ký entity + provider STORAGE_SERVICE trong `config-service.module.ts`.
- **Validation upload:** max size 25MB; whitelist mime: `application/pdf`, `image/png|jpeg|gif|webp`, `application/msword`, `…wordprocessingml…`, `application/vnd.ms-excel`, `…spreadsheetml…`, `…ms-powerpoint`, `…presentationml…`. Sai → 400.
- **YouTube parse:** util `parseYoutubeId(url)` nhận dạng `watch?v=`, `youtu.be/`, `embed/`, `shorts/`; không hợp lệ → 400.

### A4. API (qua gateway, JWT + guard phân quyền). Base `/tai-lieu`
| Method | Path | Quyền | Mô tả |
|---|---|---|---|
| GET | `/tai-lieu?category=` | `<cat>:xem` | List metadata theo category (tenant hiện tại), sort createdAt desc |
| POST | `/tai-lieu` (multipart: `file` + `title,moTa,category`) | `<cat>:them` | Upload file → StorageService.save → tạo TaiLieu type=file |
| POST | `/tai-lieu/youtube` (json: `title,moTa,category,youtubeUrl`) | `<cat>:them` | Tạo TaiLieu type=youtube |
| GET | `/tai-lieu/:id/file` | `<cat>:xem` | Stream file; header `Content-Type` theo mimeType; `Content-Disposition: inline` cho pdf/ảnh, `attachment` cho office. Kiểm tenant khớp. |
| DELETE | `/tai-lieu/:id` | `<cat>:xoa` | Xoá TaiLieu + StorageService.delete (nếu file) |

- `<cat>` map: bieu-mau→`/bieu-mau`, chinh-sach→`/chinh-sach`, huong-dan→`/huong-dan` (quyền theo từng category để phân quyền riêng từng trang).
- Controller dùng `FileInterceptor('file')` (memoryStorage) từ `@nestjs/platform-express`. Thêm dev dep `@types/multer` cho kiểu `Express.Multer.File`.
- Gateway: thêm route proxy `/tai-lieu/*` → config-service (theo pattern routing hiện có).

### A5. Phân quyền
- Thêm 3 module quyền vào `permissionModules.ts`: Biểu mẫu (`/bieu-mau`), Chính sách (`/chinh-sach`), Hướng dẫn (`/huong-dan`) với action xem/thêm/xoá.
- Thêm vào `routePermissions.ts`: `/bieu-mau`, `/chinh-sach`, `/huong-dan` → `:xem`.

---

## Phần B — Frontend

### B1. Service `taiLieuService.ts` (axios, baseURL hiện có, kèm JWT interceptor sẵn)
- `list(category)`, `uploadFile(category,{title,moTa,file})` (FormData), `addYoutube(category,{title,moTa,youtubeUrl})`, `remove(id)`.
- `fetchFileObjectUrl(id)`: GET `/tai-lieu/:id/file` với `responseType:'blob'` (kèm token qua interceptor) → `URL.createObjectURL(blob)`. Dùng cho preview PDF/ảnh và tải về. (Vì endpoint cần JWT nên không nhúng URL thẳng vào iframe được — phải qua blob.)

### B2. Component dùng chung `DocumentLibraryPage`
- File: `src/pages/thu-vien/DocumentLibraryPage.tsx` + sub-components.
- Props: `{ category, routeKey }` (routeKey = `/bieu-mau`...). Tự tải list theo category.
- Bố cục theo quy chuẩn UI hiện tại (breadcrumb, FilterBar, excel-table/card, radius 0, controlHeight 28):
  - **FilterBar**: search theo title; actions: nút **Tải lên** (mở modal) — hiện khi có quyền `:them`.
  - **Danh sách**: bảng `excel-table size="small"` (hoặc card grid) — cột: icon loại (pdf/word/excel/ảnh/youtube), Tiêu đề, Mô tả, Kích thước, Ngày tạo, Thao tác (Xem / Tải về / Xoá). Xoá hiện khi có quyền `:xoa`.
- **Upload modal** (`UploadTaiLieuModal`): 2 tab — **Tải file** (AntD Upload `beforeUpload` chặn auto, giữ file; + title, mô tả) và **Link YouTube** (input url + title, mô tả). Validate phía client (size/mime/url) trước khi gọi API.
- **Preview** (`TaiLieuPreviewDrawer`):
  - PDF → `<iframe src={objectUrl}>`.
  - Ảnh → `<img src={objectUrl}>`.
  - YouTube → `<iframe src={https://www.youtube.com/embed/{youtubeId}}>`.
  - Office → thông báo "Không xem trực tiếp" + nút **Tải về** (objectUrl, download = tenFile).
  - Thu hồi `URL.revokeObjectURL` khi đóng.

### B3. Routes + menu
- `App.tsx`: thêm 3 route `bieu-mau`/`chinh-sach`/`huong-dan` (ProtectedRoute `requiredPermission="/<cat>:xem"`) render `DocumentLibraryPage` với category tương ứng.
- `MainLayout.tsx`: thêm `/bieu-mau`, `/chinh-sach`, `/huong-dan` vào `existingRoutes` (hết coming-soon).

---

## Kiểm thử
- **BE:** unit test `parseYoutubeId` (các dạng url), validate mime/size; e2e: upload→list→stream→delete (mock/integration GridFS).
- **FE:** unit test util parse/format; render test `DocumentLibraryPage` mount; thao tác upload/preview thủ công.
- `tsc --noEmit` 0 lỗi; `vitest run` pass; `npm run build` OK; BE `nest build config-service` OK.

## Ngoài phạm vi (YAGNI)
- Preview Office inline (chỉ tải về).
- Versioning, thư mục/cây phân loại, phân quyền theo từng tài liệu.
- Upload video trực tiếp (dùng YouTube).
- MinIO (đã có interface để thêm sau).

## Triển khai (gợi ý phân pha cho plan)
1. BE: StorageService + GridFsStorage + entity + module + API + quyền.
2. FE: service + DocumentLibraryPage + modal + preview + routes/menu.
3. Kiểm thử + deploy (BE `nest build config-service` + restart container; FE build + nginx).
