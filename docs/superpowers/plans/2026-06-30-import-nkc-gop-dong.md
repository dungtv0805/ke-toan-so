# Import NKC — gộp dòng vào 1 chứng từ + cột Ngày ghi sổ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Khi import Nhật ký chung, các dòng có cùng giá trị cột "Nhóm chứng từ" được gộp vào MỘT chứng từ (chung 1 `soPhieu` hệ thống tự sinh); thêm cột "Ngày ghi sổ" vào template.

**Architecture:** Không đổi DB. Gộp = các bản ghi `ChungTu` đơn dòng chung `soPhieu`. BE `importEntries` đổi đơn vị cấp số phiếu từ "1 số/dòng" → "1 số/nhóm", header lấy theo dòng đầu nhóm. FE thêm 2 cột vào template positional + populate `ngayGhiSo`/`nhomGop`.

**Tech Stack:** NestJS + TypeORM (Mongo) + Jest (BE); React + TS + ExcelJS + Vitest (FE).

## Global Constraints

- Chỉ màn **Import Nhật ký chung**. Không đụng Phiếu thu/chi.
- Gộp theo cột **"Nhóm chứng từ"** (`nhomGop`, optional). Cùng giá trị (khác rỗng) → 1 chứng từ. Rỗng → 1 dòng = 1 chứng từ (**tương thích ngược, mặc định**).
- Số phiếu: hệ thống tự sinh **1 số/nhóm** qua `voucherNumberService` (giữ đánh số tuần tự theo bucket `MA:{maLoaiChungTu}:{year}:{month}` hoặc `LOAI:{loai}:{year}`).
- Header chứng từ gộp (loai, `ngay`, `ngayGhiSo`, `nguoiGiaoDich`, `diaChi`, `ghiChu`) lấy theo **dòng đầu của nhóm**; hạch toán (`soTien`, `noiDung`, `danhMuc`) giữ riêng từng dòng.
- `ngayGhiSo` trống → BE đã tự lấy = `ngay` (`new Date(item.ngayGhiSo || item.ngay)` — giữ nguyên).
- Cột parse theo **vị trí** (`IMPORT_COLUMNS` order). 2 cột mới **append vào cuối** mảng để không xô lệch index cũ.
- Test BE: jest. Test FE: vitest.

---

## File Structure

**Backend** (`be/apps/voucher-service/src/nhat-ky-chung/`)
- Modify `dto/create-nhat-ky-chung.dto.ts` — thêm `nhomGop?: string`.
- Modify `nhat-ky-chung.service.ts` — refactor `importEntries` (gom nhóm).
- Modify `nhat-ky-chung-import.service.spec.ts` — thêm test gộp nhóm (giữ test cũ xanh).

**Frontend** (`fe/src/pages/chung-tu/nhat-ky-chung/import/lib/` + service)
- Modify `fe/src/services/nhatKyChungService.ts` — `CreateEntryDto` thêm `nhomGop?: string`.
- Modify `lib/columns.ts` — thêm 2 cột `ngayGhiSo`, `nhomGop`.
- Modify `lib/validate.ts` — populate `ngayGhiSo` + `nhomGop`, validate định dạng ngày ghi sổ.
- Modify `lib/template.ts` — 2 dòng ví dụ minh hoạ gộp (cùng `nhomGop`).
- Modify `lib/__tests__/validate.test.ts`, `lib/__tests__/template.test.ts` — cập nhật theo cột mới.

---

## Task 1: BE — gộp nhóm trong importEntries

**Files:**
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/dto/create-nhat-ky-chung.dto.ts`
- Modify: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts` (method `importEntries`, hiện ~dòng 528-601)
- Test: `be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung-import.service.spec.ts`

**Interfaces:**
- Consumes: `this.loaiResolver.resolveLoaiInfo(danhMuc, fallbackLoai) → { loai, maLoaiChungTu? }`; `this.voucherNumberService.generateVoucherNumbers(loai, count, { maLoaiChungTu, date }) → string[]`; `this.chungTuRepository.create/save`.
- Produces: `importEntries(items: CreateNhatKyChungDto[], nguoiTaoId): Promise<{ success: boolean; data: ChungTu[] }>` — hành vi mới: gom theo `nhomGop`.

- [ ] **Step 1: Viết test thất bại (thêm vào spec hiện có)**

Thêm 2 test mới vào `nhat-ky-chung-import.service.spec.ts` (dùng `setup()` sẵn có trong file; `loaiResolver.resolveLoaiInfo` mock trả `{ loai: fb }`):

```ts
  it('gộp các dòng cùng nhomGop vào 1 số phiếu, header lấy dòng đầu', async () => {
    const { service, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-01-01', soTien: 100, noiDung: 'd1', nguoiGiaoDich: 'A', nhomGop: 'HD1' },
      { loai: 'PHIEU_THU', ngay: '2026-01-09', soTien: 200, noiDung: 'd2', nguoiGiaoDich: 'B', nhomGop: 'HD1' },
      { loai: 'PHIEU_THU', ngay: '2026-01-03', soTien: 300, noiDung: 'd3' }, // không nhóm
    ] as any;

    const res = await service.importEntries(items, 'u');

    expect(res.data).toHaveLength(3); // vẫn 3 bản ghi
    const saved = chungTuRepo.save.mock.calls[0][0];
    const byNoiDung = Object.fromEntries(saved.map((x: any) => [x.noiDung, x]));
    // d1, d2 chung 1 số phiếu; d3 khác
    expect(byNoiDung.d1.soPhieu).toBe(byNoiDung.d2.soPhieu);
    expect(byNoiDung.d3.soPhieu).not.toBe(byNoiDung.d1.soPhieu);
    expect(new Set(saved.map((x: any) => x.soPhieu)).size).toBe(2); // 2 chứng từ
    // header lấy dòng đầu nhóm: d2 mượn ngay + nguoiGiaoDich của d1
    expect(byNoiDung.d2.nguoiGiaoDich).toBe('A');
    expect(byNoiDung.d2.ngay.getTime()).toBe(byNoiDung.d1.ngay.getTime());
    // hạch toán riêng từng dòng
    expect(byNoiDung.d2.soTien).toBe(200);
  });

  it('ngayGhiSo trống thì = ngày phát sinh của dòng đầu nhóm', async () => {
    const { service, chungTuRepo } = setup();
    const items = [
      { loai: 'PHIEU_THU', ngay: '2026-02-05', soTien: 1, noiDung: 'x', nhomGop: 'G', ngayGhiSo: '2026-02-20' },
      { loai: 'PHIEU_THU', ngay: '2026-02-06', soTien: 2, noiDung: 'y', nhomGop: 'G' },
    ] as any;
    await service.importEntries(items, 'u');
    const saved = chungTuRepo.save.mock.calls[0][0];
    // cả nhóm dùng ngayGhiSo của dòng đầu (2026-02-20)
    saved.forEach((s: any) => expect(s.ngayGhiSo.getTime()).toBe(new Date('2026-02-20').getTime()));
  });
```

- [ ] **Step 2: Chạy test để thấy fail**

Run: `cd be && yarn jest nhat-ky-chung-import --silent`
Expected: 2 test mới FAIL (hiện mỗi dòng 1 số phiếu → `d1.soPhieu !== d2.soPhieu`). 2 test cũ vẫn PASS.

- [ ] **Step 3: Thêm `nhomGop` vào DTO**

Trong `create-nhat-ky-chung.dto.ts`, thêm ngay sau khối `ngayGhiSo?` (giữ style class-validator):
```ts
  // Khoá gom dòng khi import: các dòng cùng nhomGop → 1 chứng từ (chung soPhieu). Không lưu DB.
  @IsOptional()
  @IsString()
  nhomGop?: string;
```

- [ ] **Step 4: Refactor `importEntries`**

Thay TOÀN BỘ thân method `importEntries` (từ sau check `items.length === 0`) bằng:

```ts
    // Suy loai + mã loại chứng từ từng dòng (fallback = loai dòng đó)
    const infoByIndex = await Promise.all(
      items.map((item) =>
        this.loaiResolver.resolveLoaiInfo(item.danhMuc, item.loai),
      ),
    );

    // 1) Gom dòng thành "chứng từ": cùng nhomGop (khác rỗng) → 1 nhóm; trống → mỗi dòng 1 nhóm.
    type VGroup = { repIdx: number; indices: number[] };
    const vgroups: VGroup[] = [];
    const byNhom = new Map<string, VGroup>();
    items.forEach((item, idx) => {
      const nhom = (item.nhomGop ?? '').trim();
      if (nhom) {
        const existing = byNhom.get(nhom);
        if (existing) {
          existing.indices.push(idx);
          return;
        }
        const g: VGroup = { repIdx: idx, indices: [idx] };
        byNhom.set(nhom, g);
        vgroups.push(g);
      } else {
        vgroups.push({ repIdx: idx, indices: [idx] });
      }
    });

    // 2) Cấp 1 soPhieu cho mỗi nhóm, batch theo bucket đánh số (giữ số tuần tự).
    type Bucket = {
      loai: LoaiChungTu;
      maLoaiChungTu?: string;
      date: Date;
      groups: VGroup[];
    };
    const buckets = new Map<string, Bucket>();
    for (const g of vgroups) {
      const { loai, maLoaiChungTu } = infoByIndex[g.repIdx];
      const date = new Date(items[g.repIdx].ngay);
      const year = date.getFullYear();
      const bkey = maLoaiChungTu
        ? `MA:${maLoaiChungTu}:${year}:${date.getMonth() + 1}`
        : `LOAI:${loai}:${year}`;
      const b = buckets.get(bkey) ?? { loai, maLoaiChungTu, date, groups: [] };
      b.groups.push(g);
      buckets.set(bkey, b);
    }
    const soPhieuByGroup = new Map<VGroup, string>();
    for (const b of buckets.values()) {
      const numbers = await this.voucherNumberService.generateVoucherNumbers(
        b.loai,
        b.groups.length,
        { maLoaiChungTu: b.maLoaiChungTu, date: b.date },
      );
      b.groups.forEach((g, i) => soPhieuByGroup.set(g, numbers[i]));
    }

    // 3) Dựng ChungTu: header theo dòng đầu nhóm; hạch toán riêng từng dòng.
    const chungTuList = vgroups.flatMap((g) => {
      const rep = items[g.repIdx];
      const repLoai = infoByIndex[g.repIdx].loai;
      const soPhieu = soPhieuByGroup.get(g) as string;
      const ngay = new Date(rep.ngay);
      const ngayGhiSo = new Date(rep.ngayGhiSo || rep.ngay);
      return g.indices.map((idx) => {
        const item = items[idx];
        return this.chungTuRepository.create({
          loai: repLoai,
          soTien: item.soTien,
          noiDung: item.noiDung,
          danhMuc: item.danhMuc,
          ghiChu: rep.ghiChu,
          nguoiGiaoDich: rep.nguoiGiaoDich,
          diaChi: rep.diaChi,
          ngay,
          ngayGhiSo,
          soPhieu,
          nguoiTaoId,
        });
      });
    });

    const saved = await this.chungTuRepository.save(chungTuList);
    return { success: true, data: saved };
```

Đảm bảo `LoaiChungTu` đã được import trong file (đã dùng ở chỗ khác — kiểm tra import hiện có; nếu thiếu thì thêm vào import `@app/entities`).

- [ ] **Step 5: Chạy test để pass**

Run: `cd be && yarn jest nhat-ky-chung-import --silent`
Expected: TẤT CẢ pass (2 test cũ + 2 test mới). 2 test cũ vẫn xanh vì dòng không nhóm → mỗi dòng 1 nhóm → count số phiếu không đổi.

- [ ] **Step 6: Build kiểm tra biên dịch**

Run: `cd be && npx nest build voucher-service`
Expected: compiled successfully.

- [ ] **Step 7: Commit**

```bash
git add be/apps/voucher-service/src/nhat-ky-chung/dto/create-nhat-ky-chung.dto.ts be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung.service.ts be/apps/voucher-service/src/nhat-ky-chung/nhat-ky-chung-import.service.spec.ts
git commit -m "feat(import-nkc): gộp dòng cùng nhomGop vào 1 chứng từ (BE)"
```

---

## Task 2: FE — cột Nhóm chứng từ + Ngày ghi sổ

**Files:**
- Modify: `fe/src/services/nhatKyChungService.ts` (`CreateEntryDto`)
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/columns.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/validate.ts`
- Modify: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts`
- Test: `fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`, `.../__tests__/template.test.ts`

**Interfaces:**
- Consumes: `CreateEntryDto` (FE), `IMPORT_COLUMNS`, `normalizeDate`.
- Produces: 2 cột mới positional; `validateRow` gắn `ngayGhiSo`/`nhomGop` lên `item`.

- [ ] **Step 1: Thêm `nhomGop` vào `CreateEntryDto` (FE)**

Trong `fe/src/services/nhatKyChungService.ts`, trong `export interface CreateEntryDto`, thêm sau `ghiChu?`:
```ts
  nhomGop?: string;
```
(`ngayGhiSo?: string` đã có sẵn.)

- [ ] **Step 2: Thêm 2 cột vào `columns.ts`**

Thêm vào union `ImportColumnKey` (cuối danh sách, trước `;`):
```ts
  | "ngayGhiSo"
  | "nhomGop"
```
Thêm vào CUỐI mảng `IMPORT_COLUMNS` (sau `nhomQuanLy`):
```ts
  { key: "ngayGhiSo", header: "Ngày ghi sổ", required: false },
  { key: "nhomGop", header: "Nhóm chứng từ", required: false },
```
KHÔNG thêm vào `CODE_COLUMN_KEYS` (2 cột này không phải danh mục).

- [ ] **Step 3: Viết test FE thất bại (validate populate field mới)**

Thêm vào `lib/__tests__/validate.test.ts` (mô phỏng cách các test khác dựng `RawImportRow` — xem đầu file để biết `masterData` mẫu; một dòng hợp lệ cần `ngay, loaiGiaoDich=PHIEU_THU, nghiepVu=NV01, taiKhoanNo=111, taiKhoanCo=511, soTien`):
```ts
  it("gắn ngayGhiSo và nhomGop vào item", () => {
    const rows: RawImportRow[] = [
      {
        rowNumber: 2, ngay: "01/06/2026", ngayGhiSo: "05/06/2026", nhomGop: "HD1",
        loaiGiaoDich: "PHIEU_THU", nghiepVu: "NV01", taiKhoanNo: "111", taiKhoanCo: "511",
        soTien: "1000000", dienGiai: "dong 1",
      },
    ];
    const { validItems, hasErrors } = validateAndBuild(rows, masterData);
    expect(hasErrors).toBe(false);
    expect(validItems[0].ngayGhiSo).toBe("2026-06-05");
    expect(validItems[0].nhomGop).toBe("HD1");
  });

  it("ngayGhiSo sai định dạng → lỗi", () => {
    const rows: RawImportRow[] = [
      {
        rowNumber: 2, ngay: "01/06/2026", ngayGhiSo: "linh tinh",
        loaiGiaoDich: "PHIEU_THU", nghiepVu: "NV01", taiKhoanNo: "111", taiKhoanCo: "511",
        soTien: "1000000",
      },
    ];
    const { results } = validateAndBuild(rows, masterData);
    expect(results[0].errors.some((e) => e.field === "ngayGhiSo")).toBe(true);
  });
```

- [ ] **Step 4: Chạy test FE để thấy fail**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`
Expected: 2 test mới FAIL (`ngayGhiSo`/`nhomGop` undefined; chưa validate ngày ghi sổ).

- [ ] **Step 5: Populate trong `validate.ts`**

Trong `validateRow`, sau khối "// 2. Ngày" (chỗ tính `const ngay = normalizeDate(row.ngay)` + push lỗi), thêm:
```ts
  // 2b. Ngày ghi sổ (optional)
  const ngayGhiSo = normalizeDate(row.ngayGhiSo);
  if (row.ngayGhiSo && !ngayGhiSo) {
    errors.push({ field: "ngayGhiSo", message: "Ngày ghi sổ sai định dạng (DD/MM/YYYY)" });
  }
```
Trong object `const item: CreateEntryDto = { ... }`, thêm 2 field (sau `ghiChu: row.ghiChu,`):
```ts
    ngayGhiSo: ngayGhiSo ?? undefined,
    nhomGop: row.nhomGop?.trim() || undefined,
```

- [ ] **Step 6: Chạy test FE để pass**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts`
Expected: PASS (gồm test cũ + 2 test mới).

- [ ] **Step 7: Template — 2 dòng ví dụ minh hoạ gộp**

Trong `lib/template.ts`, đổi `EXAMPLE_ROW` (single) thành `EXAMPLE_ROWS` (mảng) và render từng dòng.

Thay khối:
```ts
const EXAMPLE_ROW: Partial<Record<ImportColumnKey, string>> = {
  ngay: "01/06/2026",
  soTien: "1000000",
  dienGiai: "Ví dụ: thu tiền bán hàng",
};
```
bằng:
```ts
/** 2 dòng ví dụ cùng "Nhóm chứng từ" = 1 chứng từ nhiều dòng. */
const EXAMPLE_ROWS: Partial<Record<ImportColumnKey, string>>[] = [
  { ngay: "01/06/2026", ngayGhiSo: "01/06/2026", soTien: "1000000", dienGiai: "Hoá đơn 001 - dòng 1", nhomGop: "HD001" },
  { ngay: "01/06/2026", soTien: "500000", dienGiai: "Hoá đơn 001 - dòng 2", nhomGop: "HD001" },
];
```
Trong `buildTemplateWorkbook`, thay dòng:
```ts
  main.addRow(IMPORT_COLUMNS.map((c) => EXAMPLE_ROW[c.key] ?? ""));
```
bằng:
```ts
  for (const ex of EXAMPLE_ROWS) {
    main.addRow(IMPORT_COLUMNS.map((c) => ex[c.key] ?? ""));
  }
```

- [ ] **Step 8: Cập nhật `template.test.ts`**

Mở `lib/__tests__/template.test.ts`, đọc các assertion hiện có. Cập nhật cho khớp:
- Header row phải chứa "Ngày ghi sổ" và "Nhóm chứng từ".
- Nếu test đếm số dòng dữ liệu của sheet `NhatKyChung`: kỳ vọng **2 dòng ví dụ** (trước đây 1).
Thêm/sửa assertion tối thiểu:
```ts
  it("header có cột Ngày ghi sổ và Nhóm chứng từ", () => {
    const wb = buildTemplateWorkbook(md);
    const header = wb.getWorksheet("NhatKyChung")!.getRow(1).values as string[];
    expect(header).toContain("Ngày ghi sổ");
    expect(header).toContain("Nhóm chứng từ");
  });

  it("có 2 dòng ví dụ cùng nhóm HD001", () => {
    const wb = buildTemplateWorkbook(md);
    const ws = wb.getWorksheet("NhatKyChung")!;
    expect(ws.getRow(2).getCell(IMPORT_COLUMNS.findIndex((c) => c.key === "nhomGop") + 1).value).toBe("HD001");
    expect(ws.getRow(3).getCell(IMPORT_COLUMNS.findIndex((c) => c.key === "nhomGop") + 1).value).toBe("HD001");
  });
```
(Đảm bảo `IMPORT_COLUMNS` được import trong test; nếu trùng tên test cũ thì giữ test cũ, chỉnh assertion mâu thuẫn.)

- [ ] **Step 9: Chạy toàn bộ test FE của import + build**

Run: `cd fe && npx vitest run src/pages/chung-tu/nhat-ky-chung/import`
Expected: tất cả PASS.
Run: `cd fe && npm run build`
Expected: build succeeds.

- [ ] **Step 10: Commit**

```bash
git add fe/src/services/nhatKyChungService.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/columns.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/validate.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/template.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/validate.test.ts fe/src/pages/chung-tu/nhat-ky-chung/import/lib/__tests__/template.test.ts
git commit -m "feat(import-nkc): cột Nhóm chứng từ + Ngày ghi sổ (FE)"
```

---

## Task 3: Manual verify (sau deploy)

- [ ] **Step 1: Checklist thủ công** (cần môi trường chạy + đăng nhập)

Sau deploy `voucher-service` (restart) + FE (nginx):
1. Mở Nhật ký chung → Import → tải **template mới**: có cột "Ngày ghi sổ" + "Nhóm chứng từ", có 2 dòng ví dụ cùng `HD001`.
2. Tạo file: 2 dòng cùng "Nhóm chứng từ" = `A`, 1 dòng để trống nhóm. Import.
3. Kết quả: 2 dòng nhóm `A` vào **cùng 1 số phiếu** (mở chứng từ thấy 2 dòng hạch toán); dòng trống nhóm là chứng từ riêng.
4. Để trống "Ngày ghi sổ" ở vài dòng → chứng từ có ngày ghi sổ = ngày phát sinh.
5. Import file KHÔNG có cột nhóm (template cũ-kiểu, mọi dòng trống nhóm) → vẫn mỗi dòng 1 chứng từ (không vỡ).

---

## Self-Review Notes

- **Spec coverage:** gộp theo nhomGop 1 soPhieu/nhóm (T1) ✓; header dòng đầu nhóm (T1 step 4 + test) ✓; backward-compat dòng trống nhóm (T1, test cũ giữ xanh) ✓; cột Ngày ghi sổ FE + BE đã sẵn (T2) ✓; cột Nhóm chứng từ + template ví dụ (T2) ✓.
- **Deploy:** build + đẩy `voucher-service` (restart) + FE (nginx) theo `db-deploy`. Không dependency mới. Không đổi gateway.
- **Ngoài phạm vi:** cảnh báo tổng Nợ ≠ tổng Có/nhóm; gộp cho Phiếu thu/chi.
