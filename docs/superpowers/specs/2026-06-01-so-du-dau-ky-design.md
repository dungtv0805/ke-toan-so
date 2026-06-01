# Thiết kế: Khai báo Số dư đầu kỳ (Opening Balance)

**Ngày:** 2026-06-01
**Trạng thái:** Đã chốt thiết kế, chờ review

## Bối cảnh & Vấn đề

Hệ thống báo cáo tài chính hiện tính số dư đầu kỳ từ tổng phát sinh các chứng từ **trước startDate** (`aggregateBalance` trả `priorNo/priorCo`). Khi một công ty bắt đầu dùng phần mềm từ giữa năm, không có chứng từ cũ trong hệ thống → số dư đầu kỳ = 0 (sai).

Hiện trạng cụ thể:
- `so-cai.service.ts` (Bảng cân đối phát sinh): đầu kỳ = `calcBalance(agg.priorNo, agg.priorCo, loai)` — bằng 0 nếu không có chứng từ cũ.
- `bao-cao.service.ts` (Bảng cân đối kế toán): query cứng từ `'2000-01-01'`, comment `// BE chưa trả dauNam, mặc định 0`.
- Không có entity nào lưu số dư đầu kỳ.

## Mục tiêu

Cho phép nhập số dư đầu kỳ thủ công theo từng tài khoản, tại một mốc bắt đầu chung, rồi cộng vào **Bảng cân đối kế toán** và **Bảng cân đối phát sinh**.

## Quyết định thiết kế (đã chốt)

| Vấn đề | Quyết định |
|--------|-----------|
| Mô hình | Một mốc bắt đầu duy nhất (`ngayApDung` chung toàn bộ), không theo nhiều kỳ/năm |
| Giao diện nhập | Trang riêng dạng bảng, đặt dưới menu **Danh mục** |
| Báo cáo áp dụng | Bảng cân đối kế toán + Bảng cân đối phát sinh (KHÔNG gồm Sổ cái chi tiết) |
| API lưu | `PUT` ghi đè toàn bộ bảng + ngayApDung trong 1 request |
| Cân đối Nợ/Có | Cảnh báo nếu tổng Nợ ≠ tổng Có, nhưng vẫn cho lưu |
| Phương án tích hợp | Entity riêng `SoDuDauKy`, cộng vào "prior bucket" của reporting |

**Nguyên tắc chống cộng trùng:** Số dư đầu kỳ là trạng thái baseline tại mốc bắt đầu. Mọi chứng từ trong hệ thống đều phát sinh sau mốc đó. Do đó cộng số dư đầu kỳ vào prior bucket (`priorNo/priorCo`) không gây cộng trùng.

## Kiến trúc

### 1. Entity `SoDuDauKy` (master-data-service)

MongoDB schemaless — không cần migration.

```
SoDuDauKy extends BaseEntity {
  tenantId   : string   // từ BaseEntity, đa công ty
  maTaiKhoan : string   // mã TK, vd "1121"
  duNo       : number   // số dư Nợ đầu kỳ
  duCo       : number   // số dư Có đầu kỳ
  ngayApDung : Date     // mốc bắt đầu áp dụng (giá trị giống nhau ở mọi bản ghi cùng tenant)
}
```

Ràng buộc: mỗi `(tenantId, maTaiKhoan)` có tối đa 1 bản ghi. `ngayApDung` được nhân bản ra mọi bản ghi khi lưu (đơn giản hoá đọc; không cần entity config riêng).

Đặt ở master-data-service vì cùng nhóm với danh mục tài khoản.

### 2. API (master-data-service)

```
GET  /so-du-dau-ky
  → { ngayApDung: Date|null, items: [{ maTaiKhoan, duNo, duCo }] }
  → lọc theo tenantId hiện tại

PUT  /so-du-dau-ky
  body: { ngayApDung: Date, items: [{ maTaiKhoan, duNo, duCo }] }
  → xoá toàn bộ bản ghi cũ của tenant, ghi lại toàn bộ items (chỉ ghi dòng có duNo≠0 hoặc duCo≠0)
  → trả về kết quả + cảnh báo nếu tổng Nợ ≠ tổng Có
```

- Quyền: theo chuẩn các endpoint master-data hiện có (ADMIN, KE_TOAN_TRUONG...).
- Validate cân đối ở cả FE (cảnh báo trước khi gửi) và BE (trả flag trong response). Không chặn lưu.

### 3. ServiceClient (libs/service-client)

Thêm method:
```
getSoDuDauKy(tenantId, authToken)
  → gọi GET /so-du-dau-ky của master-data-service
  → trả Map<maTaiKhoan, { duNo, duCo }>
```

### 4. Tích hợp Reporting

**Bảng cân đối phát sinh** (`so-cai.service.ts` → `getTrialBalance`):
```
const opening = await serviceClient.getSoDuDauKy(...)   // Map theo mã TK
const op = opening.get(account.ma) ?? { duNo: 0, duCo: 0 }

// đầu kỳ:
calcBalance(agg.priorNo + op.duNo, agg.priorCo + op.duCo, account.loai)
// cuối kỳ:
calcBalance(agg.priorNo + op.duNo + agg.periodNo,
            agg.priorCo + op.duCo + agg.periodCo, account.loai)
```

**Bảng cân đối kế toán** (`bao-cao.service.ts` → `getBalanceSheet`):
Cộng `op.duNo / op.duCo` vào net luỹ kế của từng TK trước khi phân loại Tài sản / Nguồn vốn.

→ Số dư đầu kỳ rỗng (không nhập) ⇒ op = {0,0} ⇒ hành xử y hệt hiện tại, không vỡ gì.

### 5. Frontend

Trang mới `Số dư đầu kỳ` dưới menu **Danh mục** (sidebar + route + active-pages map), theo CHanlder pattern (`/db-fe`):
- Bảng liệt kê tất cả TK đang active (lấy từ danh mục tài khoản), mỗi dòng nhập `duNo`/`duCo`.
- Ô chọn `ngayApDung` ở đầu trang (1 mốc chung).
- Dòng tổng: tổng Nợ, tổng Có, hiển thị cảnh báo đỏ nếu lệch.
- Nút Lưu → gọi `PUT /so-du-dau-ky`.

## Edge cases

- **TK inactive/đã xoá nhưng có số dư cũ:** vẫn giữ bản ghi và cộng vào report (không lọc theo isActive khi đọc trong reporting).
- **Số dư đầu kỳ rỗng:** op = {0,0}, report chạy như cũ.
- **Tổng Nợ ≠ tổng Có:** cảnh báo, vẫn lưu.
- **Đa tenant:** mọi truy vấn lọc theo tenantId (đọc từ JWT, theo pattern đã dùng ở `aggregateBalance`).

## Phạm vi KHÔNG làm (YAGNI)

- Không hỗ trợ nhiều kỳ/năm tài chính.
- Không sửa Sổ cái chi tiết (`getLedger` vẫn để như hiện tại trong scope này).
- Không khoá kỳ / không lịch sử chỉnh sửa số dư đầu kỳ.

## Kiểm thử

- Unit: `calcBalance` với opening cộng vào — TK loại NO và loại còn lại, các trường hợp net dương/âm.
- Integration: PUT rồi GET trả đúng; reporting cộng đúng opening; opening rỗng = hành vi cũ.
- Thủ công: nhập số dư đầu kỳ cho 1 công ty onboard giữa năm, kiểm tra Bảng cân đối phát sinh + Bảng cân đối kế toán phản ánh đúng.
