# Thiết kế: Module Bếp ăn (Lĩnh vực Mầm non) — Kiểm soát chi phí vs định mức

- **Ngày:** 2026-07-06
- **Khách hàng gốc:** Emillia Elite (giáo dục mầm non) — theo *Báo cáo khảo sát hiện trạng*
- **Lĩnh vực mới:** `MAM_NON` (Mầm non) trong app Kế toán (ke-toan-so)
- **Phạm vi tài liệu:** Module **Bếp ăn** — phần hành đầu tiên của lĩnh vực Mầm non

---

## 1. Bối cảnh & Mục tiêu

### Nỗi đau (từ báo cáo khảo sát)
Chi phí bếp ăn >100 triệu/tháng là "lỗ hổng lớn nhất": bếp **tự định lượng, tự gọi đồ, tự nhận hàng, tự thanh toán** — kế toán không kiểm soát chéo. Yêu cầu theo dõi: **NCC, giá, số trẻ ăn, chi phí, hao phí**. Mục tiêu tối thượng của khách: **"Một sổ"** — mọi dòng tiền về một nguồn.

### Mục tiêu module (MVP)
Chèn **kiểm soát chéo của kế toán** vào vòng lặp bếp ăn, và đo **chi phí ăn thực tế theo tiêu hao** so với **ngân sách (định mức tiền ăn)**, ra **hao phí / cảnh báo vượt**.

### Quyết định đã chốt (brainstorm 2026-07-06)
1. **Lõi MVP** = *Kiểm soát chi phí vs định mức* (không phải quản lý thực đơn/dinh dưỡng thuần).
2. **Cách tính chi phí ăn thực** = **theo tiêu hao** (số suất × công thức định lượng → xuất kho → giá vốn), KHÔNG phải theo tiền mua.
3. **Phân loại mặt hàng theo cách xuất dùng:**
   - `DINH_LUONG` — nguyên liệu chế biến, xuất = số suất × định lượng/suất (gạo, thịt, rau).
   - `THEO_SUAT` — vật phẩm gắn bữa ăn đếm rời, xuất = số trẻ × hệ số (sữa hộp, sữa chua).
   - `DON_VI` — không dính bữa ăn, xuất theo cái/chiếc (bút, học cụ → thuộc kho học cụ, ngoài phạm vi module này).
4. **Mô hình domain 2-app:**
   - **Giao việc = app VẬN HÀNH** (giáo viên/bếp/quản lý): điểm danh ăn, công thức định lượng, thực đơn, đề xuất mua + duyệt.
   - **Kế toán = app TIỀN**: nhập/xuất kho, công nợ NCC, giá vốn, chi phí ăn, hao phí, sổ sách.
   - Lý do tính tiền phải ở Kế toán: chi phí thực = số lượng tiêu hao × **đơn giá tồn kho**, mà đơn giá kho chỉ Kế toán có.
5. **Triển khai 2 giai đoạn** (đích đến là 2-app):
   - **GĐ A (làm trước):** dựng toàn bộ trong **Kế toán** để chạy được ngay. Điểm danh + công thức + đề xuất/duyệt **nhập tạm trong Kế toán** (màn nhập liệu đơn giản, dễ bỏ).
   - **GĐ B (roadmap):** chuyển điểm danh + công thức + thực đơn + đề xuất/duyệt sang **Giao việc**, dựng **cầu nối HTTP liên-app**. Kế toán chỉ còn phần tiền.
   - Lý do phân kỳ: cơ chế liên-app là GĐ2 MasterCeo, **hiện chưa xây**; "một sổ" đang gấp.

---

## 2. Kiến trúc

### Tổng thể
- **Lĩnh vực `MAM_NON`**: thêm 1 bản ghi `linh_vuc` (code `MAM_NON`, icon, màu, `menuKeys` trỏ tới các route Bếp ăn). Gán vào tenant Emillia qua `tenantModules`. Cơ chế lĩnh vực-động đã có sẵn (`fe/src/config/modules.ts`, collection `linh_vuc`, API `/master-data/linh-vuc`).
- **Service mới `mam-non-service`** (NestJS, port **3010** — *lưu ý 3009 đã bị `tax-service` chiếm*, DB `digital_book` mặc định, tenant-scoped): sở hữu 4 entity nghiệp vụ mới + engine tính chi phí. Orchestrate qua **ServiceClient**:
  - gọi **kho-service** (3008) tạo phiếu **nhập** (nhận hàng) và **xuất** (tiêu hao),
  - gọi **payable-service** (3005) tạo **công nợ NCC**,
  - đọc **master-data** (3002): đối tượng (NCC), hàng hóa vật tư (+ `cachXuat`), đơn vị tính, đơn giá/tồn kho.
- **Gateway** (3000): thêm route proxy `/mam-non/*` → mam-non-service (cấu hình ở `apps/gateway/src/environments/environment.ts`: `services.mamNon` + `routes`).
- **FE (ke-toan-so)**: các trang Bếp ăn theo **CHanlder pattern**, gate qua lĩnh vực `MAM_NON`.

### Tái dùng (KHÔNG dựng lại)
| Cần | Dùng lại |
|---|---|
| NCC | `doi_tuong` (master-data) — loại NCC |
| Mặt hàng thực phẩm | `hang_hoa_vat_tu` (master-data) + trường mới `cachXuat` |
| Đơn vị tính | `don_vi_tinh` (master-data) |
| Kho thực phẩm | `kho` + `phieu_kho` (NHAP/XUAT) — kho-service |
| Công nợ NCC | `cong_no` — payable-service |
| Sổ cái / báo cáo | reporting-service (thừa hưởng vì mọi thứ đã ghi sổ) |

---

## 3. Dữ liệu mới (GĐ A — mam-non-service)

Tất cả entity kế thừa `BaseEntity`, tenant-scoped, `isActive`, JSON cho dòng chi tiết — theo pattern hiện có (vd `phieu_kho`).

### 3.1. `dinh_muc_tien_an` — Định mức tiền ăn
| Trường | Kiểu | Ghi chú |
|---|---|---|
| code, ten | string | |
| phamVi | enum `LOP`\|`DO_TUOI`\|`GOI_AN`\|`CHUNG` | chiều áp dụng |
| doiTuongMa? | string | mã lớp/độ tuổi/gói ăn tương ứng |
| mucTien | decimal | đồng/trẻ/ngày |
| hieuLucTu, hieuLucDen? | Date | |

### 3.2. `cong_thuc_dinh_luong` — Công thức định lượng (suất ăn chuẩn)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| code, ten | string | vd "Suất ăn chuẩn 3-4 tuổi" |
| ganTheo | enum `SUAT_CHUAN`\|`DO_TUOI`\|`GOI_AN` | MVP: `SUAT_CHUAN` |
| doiTuongMa? | string | độ tuổi/gói ăn nếu áp riêng |
| chiTiet | JSON[] | `{ hangHoaMa, hangHoaTen, dinhLuong, donViTinh, cachXuat }` — định lượng **trên 1 suất** |

### 3.3. `diem_danh_an` — Điểm danh ăn (GĐ A: nhập tạm trong Kế toán)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| ngay | Date | |
| lopMa, lopTen | string | (dùng `bo_phan` làm lớp) |
| goiAnMa? | string | buổi/gói ăn |
| soTreDangKy, soTreAnThucTe | number | **số suất = soTreAnThucTe** |
| congThucCode? | string | công thức áp cho lớp/độ tuổi này |

### 3.4. `de_xuat_mua_thuc_pham` — Đề xuất mua (GĐ A: lập + duyệt tạm trong Kế toán)
| Trường | Kiểu | Ghi chú |
|---|---|---|
| soPhieu | string | sequence service (theo pattern `phieu-kho-sequence`) |
| ngayDeXuat, nguoiDeXuat | | |
| doiTuongMa, doiTuongTen | string | NCC |
| chiTiet | JSON[] | `{ hangHoaMa, hangHoaTen, donViTinh, soLuong, donGia, thanhTien }` |
| tongTien | decimal | |
| trangThai | enum `NHAP`\|`CHO_DUYET`\|`DA_DUYET`\|`TU_CHOI`\|`DA_NHAN` | |
| nguoiDuyet?, ngayDuyet?, lyDoTuChoi? | | |
| phieuNhapKhoId?, congNoId? | string | link phiếu sinh ra khi nhận hàng |

### 3.5. Sửa entity có sẵn
- **`hang_hoa_vat_tu`** (master-data): thêm `cachXuat: 'DINH_LUONG'|'THEO_SUAT'|'DON_VI'` (default `DON_VI`). FE danh mục hàng hóa thêm 1 field chọn.

---

## 4. Engine tính chi phí (mam-non-service)

Cho một kỳ (ngày / tuần / tháng), theo tenant:

1. **Ngân sách ăn** = Σ theo (lớp, ngày) của `soTreAnThucTe × mứcĐịnhMức` (định mức áp dụng theo phamVi + hiệu lực).
2. **Tiêu hao nguyên liệu** = Σ theo mặt hàng của `soSuất(lớp) × dinhLuong(mặt hàng trong công thức áp cho lớp)`.
   - `DINH_LUONG`: cộng theo khối lượng (quy về đơn vị kho).
   - `THEO_SUAT`: cộng theo số đơn vị rời.
3. **Xuất kho ăn** = mam-non-service gọi kho-service tạo **phiếu xuất** cho tổng tiêu hao → định giá theo **đơn giá tồn kho** → **giá vốn = chi phí ăn thực**.
4. **Hao phí / chênh lệch** = `Chi phí thực − Ngân sách` (và %). **Cảnh báo** nếu vượt ngưỡng cấu hình.

> Ghi chú định giá: dùng phương pháp xuất kho hiện hành của kho-service. Nếu tồn kho âm/thiếu đơn giá (chưa nhập kịp) → cảnh báo, không chặn cứng (MVP).

---

## 5. Luồng nghiệp vụ (GĐ A)

```
① Định mức tiền ăn + ② Công thức định lượng   (danh mục — set up 1 lần)
              │
③ Điểm danh ăn/ngày (nhập tạm trong Kế toán) ──► Ngân sách = Σ(số trẻ × định mức)
              │
④ Đề xuất mua thực phẩm (lập) ──► Duyệt (trạng thái) ──► ⑤ Nhận hàng:
        mam-non gọi kho-service (NHẬP) + payable-service (CÔNG NỢ NCC)   ◄── một sổ
              │
⑥ Xuất kho ăn = số suất × công thức ──► mam-non gọi kho-service (XUẤT) ──► giá vốn = chi phí thực
              │
⑦ Bảng kiểm soát: Ngân sách vs Chi phí thực ──► Hao phí % / Cảnh báo vượt
```

**Điểm kiểm soát chéo** nằm ở ④→⑤: bếp không còn tự gọi–nhận–thanh toán; phải **duyệt trước khi nhận**, và mọi đồng chi phí đi qua nhập kho → công nợ → sổ cái.

---

## 6. Màn hình (FE ke-toan-so — GĐ A)

Menu **"Bếp ăn"** trong lĩnh vực Mầm non:

| # | Trang | Route | Chức năng |
|---|---|---|---|
| 1 | Định mức tiền ăn | `/mam-non/dinh-muc-tien-an` | CRUD định mức đ/trẻ/ngày theo lớp/độ tuổi/gói |
| 2 | Công thức định lượng | `/mam-non/cong-thuc-dinh-luong` | CRUD công thức: mặt hàng + định lượng/suất |
| 3 | Điểm danh ăn | `/mam-non/diem-danh-an` | Nhập số trẻ ăn thực tế theo lớp/ngày (tạm — GĐ A) |
| 4 | Đề xuất mua thực phẩm | `/mam-non/de-xuat-mua` | Lập đề xuất; duyệt/từ chối; nhận hàng → sinh nhập kho + công nợ |
| 5 | Bảng kiểm soát chi phí ăn | `/mam-non/kiem-soat-chi-phi` | Ngân sách vs chi phí thực, hao phí %, cảnh báo vượt |

Tuân thủ CHanlder pattern (`featureHandler.ts`, Context, sub-handler với `@RegisterHandler`, `.state.ts`). Trang chính chỉ ghép sub-component + gọi `init`.

### Wiring khi thêm trang (theo checklist nội bộ)
routePermissions · MainLayout (2 chỗ) · tenant.service · `menuCatalog.ts` · `linh_vuc.menuKeys` (thêm 5 route) · grant quyền Admin sau deploy. (Chi tiết ở implementation plan.)

---

## 7. Giai đoạn B (roadmap — KHÔNG làm trong đợt này)

Mục tiêu: đưa domain về đúng chỗ (2-app sạch).

- **Chuyển sang Giao việc (task-management):** điểm danh ăn, công thức định lượng, thực đơn, đề xuất mua + duyệt (giáo viên/bếp/sếp thao tác trong app vận hành).
- **Cầu nối HTTP liên-app (bản nhẹ của GĐ2 MasterCeo):** vì 2 app chung Identity + JWT + tenant, dùng **gọi service-to-service trực tiếp**. Kế toán **kéo** (hoặc Giao việc **đẩy** khi duyệt): *số suất ăn (điểm danh) + công thức định lượng + đề xuất đã duyệt*. Kế toán định giá theo kho + sinh nhập/xuất + tính hao phí.
- **Kế toán sau GĐ B:** chỉ giữ engine tiền (nhập/xuất kho, công nợ, giá vốn, chi phí, hao phí, bảng kiểm soát). Gỡ các màn nhập-tạm (3,4) — đây là màn nhập liệu đơn giản nên bỏ đi nhẹ.

**Không đưa vào GĐ A:** cổng yêu cầu thanh toán chung toàn trường, KPI tự động, báo cáo Phòng Giáo dục, quản lý kho học cụ/TSCĐ — là các module/phần hành riêng sau này.

---

## 8. Ngoài phạm vi (YAGNI cho MVP)

- Quản lý dinh dưỡng/calo, thực đơn tuần chi tiết (chỉ cần công thức định lượng để tính tiêu hao).
- Hao phí sơ chế riêng (gộp vào chênh lệch tổng ở MVP; tách sau nếu cần).
- Nhiều phương pháp tính giá xuất kho tùy chọn (dùng phương pháp mặc định của kho-service).
- Báo cáo gửi Phòng Giáo dục (module riêng).

---

## 9. Rủi ro & Lưu ý

- **Định giá xuất kho phụ thuộc dữ liệu nhập kịp thời** — nếu nhập hàng chậm, tồn kho thiếu đơn giá → engine cảnh báo thay vì chặn.
- **Thêm 1 microservice** (mam-non-service) → thêm bước deploy (gateway route, env, compose). Theo đúng pattern 10 service hiện có.
- **GĐ A có phần "nhập tạm trong Kế toán"** (màn 3,4) sẽ bị gỡ ở GĐ B — chấp nhận rework nhẹ ở lớp nhập liệu (đã thống nhất với khách).
- **Cầu nối liên-app (GĐ B)** là hạng mục lớn, phụ thuộc repo task-management (ngoài workspace này) — tách kỳ riêng.
