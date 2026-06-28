# Thiết kế: Kiểm soát hồ sơ & hạch toán → tự tính chi phí không được trừ

**Ngày:** 2026-06-28
**Nguồn yêu cầu:** Người dùng + sheet "Kiểm soát hồ sơ và hạch toán", "Quy chuẩn hạch toán", "DM chứng từ", "Báo cáo nhanh thuế TNDN" trong `docs/templates/THIẾT KẾ_KẾ TOÁN.xlsx`

## 1. Bối cảnh & mục tiêu

Hoàn thiện luồng thuế: kiểm soát hồ sơ chứng từ gắn với từng giao dịch, và **tự động tính chi phí không được trừ** trong báo cáo nhanh thuế TNDN thay vì nhập tay hoàn toàn.

Ghi chú gốc trong sheet "Kiểm soát hồ sơ và hạch toán":
- *"Khi chọn vào cột biên tập hồ sơ ô chứng từ nào thì hiển thị danh sách hồ sơ chứng từ này để đánh dấu vào"*
- *"Kiểm soát kiểm tra chứng từ theo danh mục và điền ý kiến phê duyệt tại chứng từ đó"*

Sheet "Báo cáo nhanh thuế TNDN" (dòng 17–22) xác nhận: 4 nhóm chi phí không được trừ, công thức I17 = *"Được tổng từ cột đánh dấu"*, I18–I22 = *"Theo mã khoản mục và điều kiện loại trừ ở cột [đánh dấu]"*.

### Bản đồ trang/khái niệm hiện tại
- **"Dữ liệu tổng hợp"** = trang `/chung-tu/nhat-ky-chung` (Nhật ký chung). Đây là nơi thêm 2 cột mới.
- **"Quy chuẩn hạch toán"** = `/danh-muc/quy-chuan` (config-service, `QuyChuan` entity).
- **Báo cáo nhanh thuế TNDN** = `/thue/bao-cao-tndn` (tax-service, port 3009).
- Số dư/giá trị TK lấy qua `voucher-service` (port 3003).

## 2. Quyết định thiết kế (đã chốt với người dùng)

1. **DM hồ sơ chứng từ**: master-data CRUD, seed sẵn 4 loại, mở rộng dần.
2. **Phân loại chi phí không được trừ**: tự suy theo TK Nợ + cho người hạch toán chọn lại (khớp đúng 4 dòng báo cáo TNDN).
3. **Báo cáo TNDN**: tự tính từ cột Kiểm soát **+ vẫn cho nhập tay điều chỉnh thêm** (cộng dồn), không phá tính năng cũ.
4. **Ý kiến phê duyệt**: làm luôn đợt này (ô ý kiến + người/ngày kiểm soát).

## 3. Thiết kế chi tiết

### 3.1. Danh mục "Hồ sơ chứng từ" (master-data mới)

**Backend — master-data-service** (cạnh `loai-chung-tu`):
- Entity mới `be/libs/entities/src/master-data/ho-so-chung-tu.entity.ts`:
  ```typescript
  @Entity('ho_so_chung_tu')
  export class HoSoChungTu extends BaseEntity {
    @Column() ma: string;          // VD: "PHIEU_CHI"
    @Column() ten: string;         // VD: "Phiếu chi"
    @Column({ nullable: true }) moTa: string;
    @Column({ default: true }) isActive: boolean;
  }
  ```
- Controller/Service/Module CRUD chuẩn (theo mẫu `loai-chung-tu`): `GET /ho-so-chung-tu`, `GET /ho-so-chung-tu/:id`, `POST`, `PUT/:id`, `DELETE/:id` (soft delete `isActive=false`). Multi-tenant theo chuẩn hiện hành.
- Gateway: tuyến `/master-data/ho-so-chung-tu`.

**Seed**: thêm 4 bản ghi vào seed của master-data-service:
| ma | ten |
|----|-----|
| PHIEU_CHI | Phiếu chi |
| BANG_LUONG | Bảng lương |
| PHIEU_NHAP | Phiếu nhập |
| BIEN_BAN_NGHIEM_THU | Biên bản nghiệm thu |

**Frontend**:
- Type `HoSoChungTu` trong `fe/src/types/index.ts`.
- Service `fe/src/services/hoSoChungTuService.ts` (mẫu theo `loaiChungTuService`).
- Trang `fe/src/pages/danh-muc/ho-so-chung-tu/` CRUD (mẫu theo trang DM hiện có, CHanlder hoặc functional tùy mẫu DM gần nhất trong `danh-muc/`).
- Menu: thêm mục vào `fe/src/config/menuCatalog.ts` (parent "Danh mục"), route trong `App.tsx`, quyền trong `permissionModules.ts`.

### 3.2. Quy chuẩn hạch toán — cột "Biên tập hồ sơ"

**Backend — config-service** (`QuyChuan`):
- Thêm field snapshot vào entity `be/libs/entities/src/config/quy-chuan.entity.ts`:
  ```typescript
  @Column({ type: 'simple-json', nullable: true })
  hoSoChungTu?: { id: string; ma: string; ten: string }[];
  ```
- Cập nhật DTO create/update + service create/update để nhận/lưu mảng này.

**Frontend** — trang `/danh-muc/quy-chuan` (`QuyChaunPage`):
- Thêm field `hoSoChungTu` vào type `QuyChuan`.
- Thêm cột "Biên tập hồ sơ": hiển thị badge số lượng / danh sách tên; cell có popover **multi-select** từ danh mục Hồ sơ chứng từ.
- Load danh mục Hồ sơ chứng từ qua `hoSoChungTuService`.
- Khi lưu quy chuẩn: gửi mảng `hoSoChungTu` (snapshot {id, ma, ten}).

### 3.3. Dữ liệu tổng hợp (Nhật ký chung) — 2 cột mới

**Backend — voucher-service** (`ChungTu` entity `be/libs/entities/src/voucher/chung-tu.entity.ts`):
- Thêm 2 field:
  ```typescript
  @Column({ type: 'simple-json', nullable: true })
  hoSoChungTu?: { id: string; ma: string; ten: string; daCo: boolean }[];

  @Column({ type: 'simple-json', nullable: true })
  kiemSoat?: {
    trangThai: 'HOP_LE' | 'KHONG_DUOC_TRU';
    nhomChiPhi?: 1 | 2 | 3 | 4;   // chỉ khi KHONG_DUOC_TRU
    soTienKhongTru?: number;       // mặc định = soTien
    yKien?: string;
    nguoiKiemSoat?: string;
    ngayKiemSoat?: string;
  };
  ```
- DTO create/update nhận 2 field này; cho phép cập nhật qua endpoint update hiện có (`PUT /nhat-ky-chung/:id` hoặc tương đương). Khi đặt `kiemSoat` → tự stamp `nguoiKiemSoat` (user hiện tại) + `ngayKiemSoat` (server now) nếu FE không gửi.

**Mặc định "Biên tập hồ sơ" theo quy chuẩn**: khi tạo/sửa entry, nếu `hoSoChungTu` rỗng → copy từ quy chuẩn khớp (theo `loaiGiaoDich` + `nghiepVu` của entry; entry đã có `danhMuc.loaiGiaoDich`/`nghiepVu` và field `quyChuan`). Mỗi item khởi tạo `daCo=false`. Logic copy thực hiện ở **FE** khi mở popover lần đầu (đọc từ `quyChaunList` đã load trong handler nhật ký chung) để tránh phụ thuộc cross-service; lưu xuống entry khi người dùng chỉnh.

**Frontend** — `/chung-tu/nhat-ky-chung` (`NhatKyChungPage`, tab danh sách `EntryListTab`):
- **Cột "Biên tập hồ sơ"**: hiển thị `daCo/total` (vd 2/4) + badge; click → popover checklist. Default lấy từ quy chuẩn (qua `quyChaunList` đã có trong `master-data` sub-handler), cho **thêm/bớt** item (chọn từ DM hồ sơ chứng từ) và **tick `daCo`**. Lưu vào `entry.hoSoChungTu`.
- **Cột "Kiểm soát"**: dropdown Hợp lệ / Không được trừ. Khi "Không được trừ" → hiện:
  - Select **nhóm chi phí** (1–4), giá trị mặc định auto-suggest theo TK Nợ, sửa được.
  - Input **số tiền không trừ** (mặc định = `soTien`).
  - Input **ý kiến phê duyệt**.
  - Tự hiển thị người/ngày kiểm soát (do BE stamp).
- Lưu qua service update entry hiện có (mở rộng DTO FE `phieuService`/nhật ký chung service).

**Mapping gợi ý nhóm chi phí theo TK Nợ** (hằng số dùng chung, đặt ở FE `fe/src/pages/chung-tu/nhat-ky-chung/` constants; BE không cần vì nhóm đã lưu trên entry):
| Nhóm | Tên (theo báo cáo TNDN) | TK Nợ gợi ý |
|------|--------------------------|-------------|
| 1 | Chi phí dịch vụ, hàng hóa mua vào | 632, 154, 156, 152, 611 |
| 2 | Chi phí về TSCĐ, CCDC, CPTT | 211, 213, 214, 242, 153 |
| 3 | Chi phí về nhân công, bảo hiểm | 334, 338, 622, 3341, 3383, 3384, 3386 |
| 4 | Chi phí về tài chính, chi phí khác | 635, 811, 641, 642 |

Quy tắc khớp: so khớp tiền tố TK Nợ với danh sách (ưu tiên khớp dài nhất). Không khớp → mặc định nhóm 4. Người dùng luôn sửa được.

### 3.4. Báo cáo nhanh thuế TNDN — tự tính chi phí không được trừ

**Backend — voucher-service**: endpoint mới
- `GET /nhat-ky-chung/chi-phi-khong-duoc-tru?nam=YYYY` → trả về tổng theo quý + nhóm:
  ```json
  [{ "quy": 1, "nhom": 1, "soTien": 0 }, ...]   // 4 quý × 4 nhóm
  ```
- Gom các `ChungTu` có `kiemSoat.trangThai = 'KHONG_DUOC_TRU'` trong năm, group theo `quý(ngay)` + `kiemSoat.nhomChiPhi`, tổng `kiemSoat.soTienKhongTru` (fallback `soTien`). Multi-tenant.

**Backend — tax-service** (`BaoCaoService.baoCaoTNDN`):
- Gọi voucher-service (qua `ServiceClient`) lấy mảng chi phí không được trừ tự tính.
- 4 dòng chi phí không được trừ mỗi quý = **auto (từ chứng từ) + điều chỉnh tay (`DieuChinhThue`)** đang có. Tổng cộng dồn.
- Trả thêm trong payload phần tách bạch: `cpKhongTruAuto[4][4]` (quý×nhóm) và giữ `DieuChinhThue` để FE hiển thị riêng phần tay.

**Frontend** — `/thue/bao-cao-tndn` (`BaoCaoTNDNPage`):
- 4 dòng chi phí không được trừ: hiển thị **giá trị tự tính (chỉ đọc)** + ô **nhập tay điều chỉnh thêm** (giữ `DieuChinhThue` hiện có). Dòng tổng = auto + tay.
- Cập nhật `taxService` types cho payload mới.

## 4. Phạm vi & ngoài phạm vi

**Trong phạm vi**: DM hồ sơ chứng từ (CRUD + seed), cột Biên tập hồ sơ ở quy chuẩn, 2 cột (Biên tập hồ sơ + Kiểm soát kèm ý kiến/người/ngày) ở nhật ký chung, tự tính chi phí không được trừ ở báo cáo TNDN.

**Ngoài phạm vi (đợt sau)**: hệ thống cảnh báo tự động vàng/đỏ (sheet dòng 40–47: CP không trừ > 5%/10% doanh thu, VAT âm 3 kỳ, hồ sơ chờ bổ sung quá hạn).

## 5. Rủi ro & lưu ý

- **Cross-service**: báo cáo TNDN (tax-service) ↔ voucher-service đã có sẵn pattern `ServiceClient.aggregateBalance`; endpoint mới đi theo cùng cơ chế.
- **Tương thích ngược**: tất cả field mới `nullable`; entry/quy chuẩn cũ không có dữ liệu → coi như rỗng, không vỡ.
- **Snapshot vs tham chiếu**: hồ sơ chứng từ lưu dạng snapshot {id, ma, ten} trên quy chuẩn & entry → đổi tên trong DM không hồi tố dữ liệu cũ (chấp nhận, đồng bộ với cách `danhMuc` đang làm).
- **Default theo quy chuẩn ở FE**: cần đảm bảo `quyChaunList` có `hoSoChungTu`; quy chuẩn cũ chưa cấu hình → danh sách mặc định rỗng, người dùng tự thêm.
