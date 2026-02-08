# Danh mục Hợp đồng - Master Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Thêm danh mục Hợp đồng với đầy đủ thông tin (phụ lục, chủ đầu tư, điều khoản thanh toán, bảo hành, tiến độ, trạng thái) và tích hợp vào form tạo mới dữ liệu tổng hợp.

**Architecture:**
- Backend: NestJS module trong master-data-service với nested embedded documents cho MongoDB
- Frontend: CHanlder pattern với Ant Design components
- Tích hợp: Thêm HopDong vào AllocationFields trong form Nhật ký chung

**Tech Stack:** NestJS, TypeORM/MongoDB, React, Ant Design, CHanlder pattern

---

## Phase Overview

| Phase | Description | Sub-plan |
|-------|-------------|----------|
| 1 | Backend - Entity & DTOs | `2026-02-08-hop-dong-phase1-backend-entity.md` |
| 2 | Backend - Service & Controller | `2026-02-08-hop-dong-phase2-backend-service.md` |
| 3 | Frontend - Handler & Context | `2026-02-08-hop-dong-phase3-frontend-handler.md` |
| 4 | Frontend - Page & Components | `2026-02-08-hop-dong-phase4-frontend-page.md` |
| 5 | Integration - Routing & Sidebar | `2026-02-08-hop-dong-phase5-integration.md` |
| 6 | Integration - Nhật ký chung form | `2026-02-08-hop-dong-phase6-nkc-integration.md` |

---

## Data Model Summary

```typescript
// Trạng thái lưu trữ hợp đồng
enum TrangThaiHopDong {
  CHUA_CO_HD = 'CHUA_CO_HD',        // Chưa có HĐ
  HD_CHUA_KY = 'HD_CHUA_KY',        // HĐ chưa ký
  HD_PHOTO_SCAN = 'HD_PHOTO_SCAN',  // HĐ photo hoặc scan
  HD_GOC = 'HD_GOC'                 // HĐ gốc
}

// Embedded: Phụ lục hợp đồng
interface PhuLuc {
  giaTri?: number;
  ngayKy?: Date;
}

// Embedded: Điều khoản thanh toán
interface DieuKhoanThanhToan {
  tamUng?: string;
  thanhToanGiaiDoan?: string;
  quyetToan?: string;
}

// Embedded: Bảo hành
interface BaoHanh {
  giaTri?: number;
  thoiGian?: string;
  hinhThuc?: string;
}

// Embedded: Tiến độ thi công
interface TienDoThiCong {
  soNgay?: number;
  tuNgay?: Date;
  denNgay?: Date;
}

// Main Entity
interface HopDong {
  // Thông tin chính
  soHopDong: string;          // Unique
  tenCongTrinh: string;
  giaTriSauThue?: number;
  ngayKy?: Date;

  // Phụ lục
  phuLuc1?: PhuLuc;
  phuLuc2?: PhuLuc;

  // Chủ đầu tư (liên kết DoiTuong + thông tin bổ sung)
  doiTuongId?: ObjectId;      // Ref -> DoiTuong (KHACH_HANG)
  nguoiKy?: string;
  chucVu?: string;
  nguoiGiaoDich?: string;

  // Điều khoản & Bảo hành & Tiến độ
  dieuKhoanThanhToan?: DieuKhoanThanhToan;
  baoHanh?: BaoHanh;
  tienDoThiCong?: TienDoThiCong;

  // Trạng thái & Lưu trữ
  trangThai?: TrangThaiHopDong;
  soLuongLuu?: number;

  // Base fields
  isActive: boolean;
}
```

---

## Files to Create/Modify

### Backend (be/)
**Create:**
- `libs/entities/src/master-data/hop-dong.entity.ts`
- `apps/master-data-service/src/hop-dong/dto/create-hop-dong.dto.ts`
- `apps/master-data-service/src/hop-dong/dto/update-hop-dong.dto.ts`
- `apps/master-data-service/src/hop-dong/dto/hop-dong-query.dto.ts`
- `apps/master-data-service/src/hop-dong/dto/index.ts`
- `apps/master-data-service/src/hop-dong/hop-dong.service.ts`
- `apps/master-data-service/src/hop-dong/hop-dong.controller.ts`
- `apps/master-data-service/src/hop-dong/hop-dong.module.ts`

**Modify:**
- `libs/entities/src/master-data/index.ts`
- `apps/master-data-service/src/master-data-service.module.ts`

### Frontend (fe/)
**Create:**
- `src/pages/danh-muc/hop-dong/handler/hop-dong.handler.ts`
- `src/pages/danh-muc/hop-dong/handler/sub-handler/index.ts`
- `src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.event.ts`
- `src/pages/danh-muc/hop-dong/handler/sub-handler/init/init.handler.ts`
- `src/pages/danh-muc/hop-dong/handler/sub-handler/crud/crud.event.ts`
- `src/pages/danh-muc/hop-dong/handler/sub-handler/crud/crud.handler.ts`
- `src/pages/danh-muc/hop-dong/HopDongHandlerContext.tsx`
- `src/pages/danh-muc/hop-dong/HopDongPage.state.ts`
- `src/pages/danh-muc/hop-dong/HopDongPage.tsx`

**Modify:**
- `src/types/index.ts`
- `src/pages/loadable.tsx`
- `src/App.tsx`
- `src/components/layout/MainLayout.tsx`
- `src/pages/chung-tu/nhat-ky-chung/components/entry-form-modal/AllocationFields.tsx`
- `src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/init/init.state.ts`
- `src/pages/chung-tu/nhat-ky-chung/handler/sub-handler/master-data/master-data.handler.ts`
