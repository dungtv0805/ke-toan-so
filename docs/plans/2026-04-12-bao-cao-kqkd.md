# Báo cáo Kết quả Hoạt động Kinh doanh (BCKQKD) - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Xây dựng báo cáo KQKD theo chuẩn Thông tư 200, mở rộng từ PnL service hiện có, hiển thị bảng so sánh kỳ hiện tại vs kỳ trước với đầy đủ % doanh thu thuần, tỷ trọng chi phí, biến động.

**Architecture:** Mở rộng `bao-cao.service.ts` thêm endpoint `/bao-cao/kqkd` trả về dữ liệu BCKQKD. Frontend tạo page mới tại `fe/src/pages/bao-cao/kqkd/` theo CHanlder pattern. Dữ liệu tính toán hoàn toàn từ collection `chung_tu` dựa trên mã TK Nợ/Có.

**Tech Stack:** NestJS (backend), React + TypeScript + Tailwind + shadcn/ui (frontend), CHanlder pattern (state management)

---

## Tổng quan chỉ tiêu BCKQKD

```
Mã 01: DT bán hàng & CCDV     = SUM(Có 511*)
Mã 02: Giảm trừ DT             = SUM(Nợ 521*)
Mã 10: DT thuần                = 01 - 02
Mã 11: Giá vốn hàng bán        = SUM(Nợ 632*)
Mã 20: LN gộp                  = 10 - 11
Mã 21: DT hoạt động TC          = SUM(Có 515*)
Mã 22: CP tài chính             = SUM(Nợ 635*)
Mã 25: CP bán hàng              = SUM(Nợ 641*)
Mã 26: CP QLDN                  = SUM(Nợ 642*)
Mã 30: LN từ HĐKD               = 20 + (21 - 22) - (25 + 26)
Mã 31: Thu nhập khác            = SUM(Có 711*)
Mã 32: CP khác                  = SUM(Nợ 811*)
Mã 40: LN khác                  = 31 - 32
Mã 50: LN trước thuế            = 30 + 40
Mã 51: CP thuế TNDN hiện hành   = SUM(Nợ 8211*)
Mã 52: CP thuế TNDN hoãn lại    = SUM(Nợ 8212*)
Mã 60: LN sau thuế              = 50 - 51 - 52
```

Logic lấy dữ liệu:
- Doanh thu/Thu nhập (5xx, 7xx): SUM(soTien) WHERE danhMuc.taiKhoanCo.ma startsWith mã TK
- Chi phí (6xx, 8xx): SUM(soTien) WHERE danhMuc.taiKhoanNo.ma startsWith mã TK
- Các chỉ tiêu tính toán: công thức từ các chỉ tiêu gốc

Cột báo cáo:
- Kỳ hiện tại: giá trị tính theo khoảng ngày user chọn
- % DT thuần: = giá trị / DT thuần (mã 10) × 100
- Tỷ trọng CP: = CP này / (CP TC + CP BH + CP QLDN) × 100 (chỉ áp dụng cho mã 22, 25, 26)
- Kỳ trước: giá trị tính theo kỳ liền trước
- Biến động: = Kỳ HT - Kỳ trước
- % biến động: = (Kỳ HT - Kỳ trước) / Kỳ trước × 100

---

## Task 1: Seed TK còn thiếu vào master data

**Files:**
- Modify: `be/apps/master-data-service/src/seed/` (nếu có) hoặc tạo script seed
- Kiểm tra: `be/libs/entities/src/master-data/tai-khoan.entity.ts`

**Step 1: Tạo script seed TK thiếu**

Các TK cần thêm cho tenant (hoặc seed chung):
```
521  | Các khoản giảm trừ doanh thu    | DOANH_THU   | KHONG_CO_SO_DU | capDo 1
5211 | Chiết khấu thương mại           | DOANH_THU   | KHONG_CO_SO_DU | capDo 2 | parent: 521
5212 | Hàng bán bị trả lại             | DOANH_THU   | KHONG_CO_SO_DU | capDo 2 | parent: 521
5213 | Giảm giá hàng bán               | DOANH_THU   | KHONG_CO_SO_DU | capDo 2 | parent: 521
632  | Giá vốn hàng bán                | CHI_PHI     | KHONG_CO_SO_DU | capDo 1
821  | Chi phí thuế TNDN               | CHI_PHI     | KHONG_CO_SO_DU | capDo 1
8211 | CP thuế TNDN hiện hành          | CHI_PHI     | KHONG_CO_SO_DU | capDo 2 | parent: 821
8212 | CP thuế TNDN hoãn lại           | CHI_PHI     | KHONG_CO_SO_DU | capDo 2 | parent: 821
```

**Step 2: Chạy seed và verify**

Run: `yarn seed` hoặc insert trực tiếp qua MongoDB
Verify: Kiểm tra TK mới xuất hiện trong master data

**Step 3: Commit**

```bash
git commit -m "[bckqkd] seed missing accounts for BCKQKD report (521, 632, 821, 8211, 8212)"
```

---

## Task 2: Tạo DTO cho BCKQKD

**Files:**
- Create: `be/libs/dto/src/reporting/kqkd.dto.ts`
- Modify: `be/libs/dto/src/reporting/index.ts` (export mới)

**Step 1: Tạo DTO**

```typescript
// be/libs/dto/src/reporting/kqkd.dto.ts

export interface KqkdChiTieu {
  ma: string;           // Mã số: '01', '02', '10', ...
  ten: string;          // Tên chỉ tiêu
  kyHienTai: number;
  phanTramDTThuan: number | null;      // % so với DT thuần
  tyTrongChiPhi: number | null;        // Tỷ trọng CP (chỉ cho mã 22, 25, 26)
  kyTruoc: number;
  phanTramDTThuanKyTruoc: number | null;
  tyTrongChiPhiKyTruoc: number | null;
  bienDong: number;
  phanTramBienDong: number | null;
  isCalculated: boolean;  // true = chỉ tiêu tính toán, false = chỉ tiêu gốc
  isBold: boolean;        // true = dòng tổng/subtotal
}

export interface KqkdReport {
  chiTieu: KqkdChiTieu[];
  kyHienTai: { startDate: string; endDate: string };
  kyTruoc: { startDate: string; endDate: string };
}

export interface KqkdQueryParams {
  startDate: string;
  endDate: string;
  periodType: 'thang' | 'quy' | 'nam' | 'tuyChon';
}
```

**Step 2: Export DTO**

Thêm export vào index file.

**Step 3: Commit**

```bash
git commit -m "[bckqkd] add KQKD report DTOs"
```

---

## Task 3: Implement KQKD service (backend)

**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.service.ts`

**Step 1: Thêm helper tính kỳ trước**

```typescript
private getPreviousPeriod(
  startDate: Date, endDate: Date, periodType: string
): { startDate: Date; endDate: Date } {
  // thang: lùi 1 tháng
  // quy: lùi 3 tháng
  // nam: lùi 1 năm
  // tuyChon: lùi khoảng thời gian tương đương
}
```

**Step 2: Thêm helper tính SUM theo TK prefix**

```typescript
private sumByAccountPrefix(
  vouchers: NhatKyChungEntry[],
  prefix: string,
  side: 'NO' | 'CO'
): number {
  // Duyệt vouchers, match taiKhoanNo/Co.ma startsWith prefix
  // Trả về SUM(soTien)
}
```

**Step 3: Implement getKqkd()**

```typescript
async getKqkd(
  startDate: Date, endDate: Date,
  periodType: string, authToken?: string
): Promise<KqkdReport> {
  // 1. Fetch vouchers cho cả 2 kỳ
  // 2. Tính 16 chỉ tiêu cho kỳ hiện tại
  // 3. Tính 16 chỉ tiêu cho kỳ trước
  // 4. Tính % DT thuần, tỷ trọng CP, biến động
  // 5. Return KqkdReport
}
```

Chi tiết logic tính:
```typescript
// Chỉ tiêu gốc (lấy từ chung_tu)
const m01_ht = sumByAccountPrefix(vouchersHT, '511', 'CO');
const m02_ht = sumByAccountPrefix(vouchersHT, '521', 'NO');
const m11_ht = sumByAccountPrefix(vouchersHT, '632', 'NO');
const m21_ht = sumByAccountPrefix(vouchersHT, '515', 'CO');
const m22_ht = sumByAccountPrefix(vouchersHT, '635', 'NO');
const m25_ht = sumByAccountPrefix(vouchersHT, '641', 'NO');
const m26_ht = sumByAccountPrefix(vouchersHT, '642', 'NO');
const m31_ht = sumByAccountPrefix(vouchersHT, '711', 'CO');
const m32_ht = sumByAccountPrefix(vouchersHT, '811', 'NO');
const m51_ht = sumByAccountPrefix(vouchersHT, '8211', 'NO');
const m52_ht = sumByAccountPrefix(vouchersHT, '8212', 'NO');

// Chỉ tiêu tính toán
const m10_ht = m01_ht - m02_ht;
const m20_ht = m10_ht - m11_ht;
const m30_ht = m20_ht + (m21_ht - m22_ht) - (m25_ht + m26_ht);
const m40_ht = m31_ht - m32_ht;
const m50_ht = m30_ht + m40_ht;
const m60_ht = m50_ht - m51_ht - m52_ht;

// % DT thuần
const pctDTThuan = (value: number) => m10_ht !== 0 ? (value / m10_ht) * 100 : null;

// Tỷ trọng CP (chỉ cho 22, 25, 26)
const tongCP = m22_ht + m25_ht + m26_ht;
const tyTrong = (value: number) => tongCP !== 0 ? (value / tongCP) * 100 : null;

// Biến động
const bienDong = (ht: number, kt: number) => ht - kt;
const pctBienDong = (ht: number, kt: number) => kt !== 0 ? ((ht - kt) / kt) * 100 : null;
```

**Step 4: Chạy test**

Run: `cd be && yarn test --grep kqkd`

**Step 5: Commit**

```bash
git commit -m "[bckqkd] implement KQKD calculation service"
```

---

## Task 4: Thêm controller endpoint

**Files:**
- Modify: `be/apps/reporting-service/src/bao-cao/bao-cao.controller.ts`

**Step 1: Thêm endpoint GET /bao-cao/kqkd**

```typescript
@Get('kqkd')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.KE_TOAN_TONG_HOP, Role.MANAGER, Role.KIEM_SOAT)
async getKqkd(
  @Query('startDate') startDate: string,
  @Query('endDate') endDate: string,
  @Query('periodType') periodType: string,
  @Headers('authorization') authHeader?: string,
) {
  const token = authHeader?.replace('Bearer ', '');
  return this.baoCaoService.getKqkd(
    new Date(startDate), new Date(endDate), periodType, token,
  );
}
```

**Step 2: Test endpoint**

Run: `curl localhost:3006/bao-cao/kqkd?startDate=2026-03-01&endDate=2026-03-31&periodType=thang`

**Step 3: Commit**

```bash
git commit -m "[bckqkd] add KQKD endpoint to controller"
```

---

## Task 5: Tạo frontend service

**Files:**
- Create: `fe/src/services/kqkdService.ts`

**Step 1: Tạo service**

```typescript
// Extend ServiceBase, gọi GET /reporting/bao-cao/kqkd
// Methods:
//   getData(params: KqkdQueryParams): Promise<KqkdReport>
// Helper:
//   getDateRange(periodType, selectedDate): { startDate, endDate }
//   getPeriodLabel(periodType, date): string
```

**Step 2: Commit**

```bash
git commit -m "[bckqkd] add KQKD frontend service"
```

---

## Task 6: Tạo KQKD page theo CHanlder pattern

**Files:**
- Create: `fe/src/pages/bao-cao/kqkd/KqkdPage.tsx`
- Create: `fe/src/pages/bao-cao/kqkd/kqkdHandler.ts`
- Create: `fe/src/pages/bao-cao/kqkd/KqkdHandlerContext.tsx`
- Create: `fe/src/pages/bao-cao/kqkd/sub-handler/index.ts`
- Create: `fe/src/pages/bao-cao/kqkd/sub-handler/init/init.handler.ts`
- Create: `fe/src/pages/bao-cao/kqkd/sub-handler/init/init.event.ts`

**Step 1: Tạo handler class**

```typescript
// kqkdHandler.ts
import { CHanlder } from "@/common";
import "./sub-handler";

export interface KqkdEvents {}
export interface KqkdStates extends BaseStates {}

export class KqkdHandler extends CHanlder<KqkdEvents, KqkdStates> {
  constructor() { super("kqkd-context"); }
}
```

**Step 2: Tạo context + provider**

Theo pattern của `NhatKyChungHandlerContext.tsx`

**Step 3: Tạo init handler**

Load dữ liệu KQKD khi mount, gọi `kqkdService.getData()`

**Step 4: Commit**

```bash
git commit -m "[bckqkd] scaffold KQKD page with CHanlder pattern"
```

---

## Task 7: Implement UI components

**Files:**
- Create: `fe/src/pages/bao-cao/kqkd/components/KqkdFilter.tsx`
- Create: `fe/src/pages/bao-cao/kqkd/components/KqkdFilter.state.ts`
- Create: `fe/src/pages/bao-cao/kqkd/components/KqkdTable.tsx`
- Create: `fe/src/pages/bao-cao/kqkd/components/KqkdTable.state.ts`

**Step 1: Tạo KqkdFilter**

Bộ lọc gồm:
- Select periodType: Tháng / Quý / Năm / Tùy chọn
- DatePicker cho tháng/quý/năm hoặc RangePicker cho tùy chọn
- Button "Xem báo cáo"

**Step 2: Tạo KqkdTable**

Bảng hiển thị theo cấu trúc:
```
| STT | Chỉ tiêu | Mã | Kỳ HT | % DT thuần | Tỷ trọng CP | Kỳ trước | % DT thuần | Tỷ trọng CP | Biến động | % |
```

Quy tắc hiển thị:
- Số âm: màu đỏ, format (xxx)
- Số dương: màu đen
- Format: 1,000,000
- Dòng tổng/subtotal: bold
- Đơn vị: đồng

**Step 3: Commit**

```bash
git commit -m "[bckqkd] implement KQKD filter and table components"
```

---

## Task 8: Thêm route và navigation

**Files:**
- Modify: `fe/src/` router config (tìm file router)
- Modify: sidebar/navigation component

**Step 1: Thêm route `/bao-cao/kqkd`**

**Step 2: Thêm menu item "Báo cáo KQKD" vào sidebar dưới nhóm Báo cáo**

**Step 3: Verify trên browser**

Truy cập `http://localhost:5173/bao-cao/kqkd`, kiểm tra:
- Filter hoạt động
- Bảng hiển thị đúng cấu trúc
- Số liệu tính toán chính xác
- Format số, màu sắc đúng

**Step 4: Commit**

```bash
git commit -m "[bckqkd] add route and navigation for KQKD report"
```

---

## Task 9: Test end-to-end với seed data

**Step 1: Tạo seed data chứng từ cho BCKQKD**

Insert các chứng từ test vào MongoDB với TK 511, 521, 632, 515, 635, 641, 642, 711, 811, 8211 để có dữ liệu cho cả kỳ hiện tại và kỳ trước.

**Step 2: Verify backend**

Gọi API `/bao-cao/kqkd` và kiểm tra kết quả tính toán.

**Step 3: Verify frontend**

Mở browser, chọn kỳ báo cáo, kiểm tra:
- Tất cả 16 chỉ tiêu hiển thị đúng
- % DT thuần tính đúng
- Tỷ trọng CP chỉ hiển thị cho mã 22, 25, 26
- Biến động và % biến động đúng
- Kỳ trước tự động tính theo periodType

**Step 4: Commit**

```bash
git commit -m "[bckqkd] add seed data and verify KQKD report e2e"
```

---

## Dependency Graph

```
Task 1 (Seed TK) ──┐
                    ├── Task 3 (Service) ── Task 4 (Controller) ── Task 5 (FE Service)
Task 2 (DTO) ──────┘                                                      │
                                                                           ├── Task 6 (Handler)
                                                                           │       │
                                                                           │       ├── Task 7 (UI)
                                                                           │       │       │
                                                                           │       │       ├── Task 8 (Route)
                                                                           │       │       │       │
                                                                           │       │       │       ├── Task 9 (E2E)
```

Task 1 + Task 2 có thể chạy song song.
Task 6 + Task 7 có thể chạy song song sau khi Task 5 xong.
