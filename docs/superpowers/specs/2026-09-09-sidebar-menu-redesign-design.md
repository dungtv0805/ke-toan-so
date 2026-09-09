# Thiết kế lại sidebar + chia lại menu theo nghiệp vụ

- Ngày: 2026-09-09
- Phạm vi: `fe/` — `src/components/layout/MainLayout.tsx`, `src/config/menuCatalog.ts`, `src/config/sectionNavs.tsx`, routes
- Nguồn menu: sheet **"Menu tài chính"** trong `docs/THIẾT KẾ_KẾ TOÁN.xlsx` (không dùng link Google Sheets — trả 401)
- Ảnh + HTML tham chiếu: `docs/design/` (xem `docs/design/README.md`)

## 1. Mục tiêu

Đổi cách gom menu từ **kỹ thuật** (ĐIỀU HÀNH / KẾ TOÁN / THƯ VIỆN) sang **nghiệp vụ**
(mua → bán → lương → kho → tài sản → thuế), và đổi sidebar từ menu xổ nhiều cấp
sang **2 lớp: rail 62px + panel 196px**.

Không đổi bảng biểu, không đổi nghiệp vụ. Chỉ đổi điều hướng và lớp vỏ.

## 2. Sidebar

### 2.1 Kích thước

| | |
|---|---|
| Rail | 62 px |
| Panel | 196 px |
| Tổng | **258 px** (hiện tại 312 px → trả 54 px cho nội dung) |
| Rail item | icon 17 px · nhãn 8,5 px · cao ~40 px · bo 8 px |
| Nav item (panel) | cao 19 px · chữ 11,5 px · bo 6 px · padding 3,5/7 |
| Panel padding | 10 / 8 px · các mục sát nhau (gap 0) |
| Tiêu đề panel | 15 px / 700 |
| Caption nhóm | 8,5–9 px / 700 · letter-spacing 0.6 |

### 2.2 Cấu trúc panel

```
Tiêu đề nhóm  +  nút thu gọn
Ô tìm ⌘K
Danh sách mục con  (có caption phụ khi nhóm chia cụm)
─ spacer ─
Thẻ "Kỳ kế toán"      ← trạng thái sống: kỳ đang mở, đã ghi sổ, khóa sổ gần nhất
Trợ giúp & phản hồi
```

**KHÔNG** liệt kê lại danh sách 12 phân hệ trong panel — rail đã hiện đủ ngay cạnh.

### 2.3 Quy tắc

- Rail luôn hiện đủ **12 phân hệ**, không bao giờ cuộn.
- Panel chỉ hiện nhóm đang chọn, tối đa **12 dòng** → không cuộn.
- Rail dùng nhãn viết tắt (BCTC bỏ, còn CCDC / Dòng tiền) → tooltip hiện tên đầy đủ + số mục con.
- Nhóm chỉ có 1 mục (Tổng quan, Danh mục): bấm rail vào thẳng trang, không mở panel/flyout.
- Mục chưa có route: **làm mờ + chấm cam bên phải**, vẫn bấm được, ra trang "đang phát triển"
  (giữ nguyên class `menu-item-coming-soon` hiện có).

### 2.4 Trạng thái thu gọn

- Mở/đóng: bấm lại icon đang chọn · `⌘\` · nút `panel-left-open` ở đầu breadcrumb.
- Khi thu gọn: rail 62 px giữ nguyên đủ 12 phân hệ; panel ẩn; nội dung được thêm 196 px.
- Vào mục con bằng **flyout**: rê chuột vào icon rail → popover nổi cạnh rail, nội dung
  **dùng đúng component với panel** (cùng danh sách, cùng caption cụm, cùng cách đánh dấu mục sắp có).
- Flyout đóng khi chuột rời hoặc chọn xong 1 mục.
- Trạng thái thu gọn lưu theo từng người dùng.

Xem `docs/design/screens/04-sidebar-thu-gon-flyout.png`.

## 3. Cấu trúc menu mới — 12 phân hệ / 70 mục

Trạng thái: `OK` = route giữ nguyên · `MOVE` = route đã có, đổi chỗ hoặc đổi tên · `NEW` = phải làm mới.

### 3.1 Tổng quan — 1
| Mục | TT | Route / ghi chú |
|---|---|---|
| Bảng điều hành (5 tab) | OK | `/` |

### 3.2 Phân tích — 8
| Mục | TT | Route / ghi chú |
|---|---|---|
| Bán hàng | OK | `/phan-tich/ban-hang` |
| Mua hàng | OK | `/phan-tich/mua-hang` |
| Công nợ | OK | `/phan-tich/cong-no` |
| Dòng tiền | OK | `/phan-tich/dong-tien` |
| Tồn kho | OK | `/phan-tich/ton-kho` |
| P&L | MOVE | `/phan-tich/bao-cao-tai-chinh` — đổi tên từ "Kế toán" |
| P&L không khấu hao | MOVE | `/bao-cao/pnl-khong-khau-hao` — chuyển từ Báo cáo |
| Khả năng thanh khoản | OK | `/phan-tich/thanh-khoan` |

### 3.3 Tổng hợp — 12 (chia 2 cụm trong panel)

**Cụm "SỔ SÁCH & TỔNG HỢP"**
| Mục | TT | Route / ghi chú |
|---|---|---|
| Sổ chi tiết tài khoản | MOVE | `/bao-cao/so-chi-tiet-tai-khoan` |
| Sổ chi tiết công nợ | MOVE | `/bao-cao/so-chi-tiet-cong-no` |
| Sổ chi tiết phát sinh | MOVE | `/bao-cao/so-chi-tiet-phat-sinh` |
| Sổ nhật ký chung | MOVE | `/chung-tu/nhat-ky-chung` — đổi tên từ "Thực hiện" |
| Tổng hợp công nợ | MOVE | `/bao-cao/bang-tong-hop` |
| Quyết toán tạm ứng | NEW | chưa có route |
| Kết chuyển | MOVE | `/chung-tu/ket-chuyen-lai-lo` |

**Cụm "BÁO CÁO TÀI CHÍNH"** — tách 4 tab của `/bao-cao/tai-chinh` thành 4 route riêng
| Mục | TT | Route / ghi chú |
|---|---|---|
| Bảng cân đối kế toán | MOVE | tách từ `/bao-cao/tai-chinh` |
| Kết quả kinh doanh | MOVE | tách từ `/bao-cao/tai-chinh` |
| Bảng cân đối tài khoản | MOVE | tách từ `/bao-cao/tai-chinh` |
| Lưu chuyển tiền tệ | MOVE | tách từ `/bao-cao/tai-chinh` |
| Thuyết minh | NEW | chưa có route |

### 3.4 Vốn & dòng tiền — 3 (+2 chờ chốt)
| Mục | TT | Route / ghi chú |
|---|---|---|
| Kế hoạch ngân sách | MOVE | tab "Dòng tiền" + "Nguồn vốn" của `/trung-tam-du-lieu/ke-hoach` |
| Dự báo ngân sách | MOVE | tab "Dòng tiền" + "Nguồn vốn" của `/trung-tam-du-lieu/du-bao` |
| Sổ quỹ | MOVE | `/so-quy` — đang comment khỏi sidebar, bật lại |
| _Phiếu thu_ | **CHỜ CHỐT** | `/chung-tu/phieu-thu` — sheet không nhắc; nghiệp vụ hàng ngày, không nên bỏ |
| _Phiếu chi_ | **CHỜ CHỐT** | `/chung-tu/phieu-chi` — như trên |

### 3.5 Mua hàng — 8
| Mục | TT | Route / ghi chú |
|---|---|---|
| Kế hoạch mua hàng | NEW | `KeHoachTabsPage` **chưa có tab Mua hàng** — thêm tab rẻ hơn dựng route mới |
| Dự báo mua hàng | NEW | như trên |
| Hợp đồng mua | NEW | |
| Mua hàng | NEW | |
| Sổ chi tiết mua hàng | NEW | |
| Tổng hợp mua hàng | NEW | |
| Công nợ phải trả | MOVE | `/cong-no/phai-tra` — đang comment khỏi sidebar |
| Báo cáo | NEW | |

### 3.6 Bán hàng — 9
| Mục | TT | Route / ghi chú |
|---|---|---|
| Kế hoạch bán hàng | MOVE | tab "Bán hàng" của `/trung-tam-du-lieu/ke-hoach` |
| Dự báo bán hàng | MOVE | tab "Bán hàng" của `/trung-tam-du-lieu/du-bao` |
| Hợp đồng bán | MOVE | `/trung-tam-du-lieu/hop-dong` |
| Đơn hàng | MOVE | đang nằm trong trang Hợp đồng |
| Sổ chi tiết bán hàng | NEW | |
| Tổng hợp bán hàng | NEW | |
| Công nợ phải thu | MOVE | `/cong-no/phai-thu` — đang comment khỏi sidebar |
| Báo cáo | MOVE | `/bao-cao/hop-dong` + `/bao-cao/doanh-thu` |
| Nhắc nợ | NEW | |

### 3.7 Tiền lương — 7 (phân hệ mới hoàn toàn, trừ 2 mục đầu)
| Mục | TT | Route / ghi chú |
|---|---|---|
| Kế hoạch tiền lương | MOVE | tab "Nhân sự" của `/trung-tam-du-lieu/ke-hoach` |
| Dự báo tiền lương | MOVE | tab "Nhân sự" của `/trung-tam-du-lieu/du-bao` |
| Tính lương | NEW | |
| Sổ chi tiết tiền lương | NEW | |
| BHXH | NEW | |
| Công nợ lương | NEW | |
| Báo cáo | NEW | |

### 3.8 Kho — 6
| Mục | TT | Route / ghi chú |
|---|---|---|
| Nhập kho | OK | `/kho/nhap-kho` |
| Xuất kho | OK | `/kho/xuat-kho` |
| Chuyển kho | OK | `/kho/chuyen-kho` |
| Tính giá xuất kho | NEW | |
| Tổng hợp xuất kho | NEW | |
| Báo cáo nhập xuất tồn | NEW | gần nhất hiện có: `/phan-tich/ton-kho` |

### 3.9 Tài sản — 7
| Mục | TT | Route / ghi chú |
|---|---|---|
| Kế hoạch tài sản | MOVE | tab "Tài sản" của `/trung-tam-du-lieu/ke-hoach` |
| Dự báo tài sản | MOVE | tab "Tài sản" của `/trung-tam-du-lieu/du-bao` |
| Danh mục tài sản | MOVE | `/danh-muc` |
| Tài sản | OK | `/trung-tam-du-lieu/tai-san` |
| Tính khấu hao | NEW | |
| Điều chuyển | NEW | |
| Ghi giảm TS | NEW | |

### 3.10 Công cụ dụng cụ — 4
| Mục | TT | Route / ghi chú |
|---|---|---|
| Công cụ dụng cụ | MOVE | `/trung-tam-du-lieu/dung-cu` |
| Bảng phân bổ | NEW | |
| Điều chuyển | NEW | |
| Danh mục dụng cụ | MOVE | `/danh-muc` |

### 3.11 Thuế — 4
| Mục | TT | Route / ghi chú |
|---|---|---|
| Bảng kê mua vào | OK | `/thue/bang-ke-mua-vao` |
| Bảng kê bán ra | OK | `/thue/bang-ke-ban-ra` |
| Bảng tổng hợp thuế | OK | `/thue/tong-hop` |
| Báo cáo tạm tính TNDN | OK | `/thue/bao-cao-tndn` |

### 3.12 Danh mục — 1
| Mục | TT | Route / ghi chú |
|---|---|---|
| Danh mục (trang gộp, 26 mục) | OK | `/danh-muc` |

**Tổng: 16 OK · 29 MOVE · 25 NEW = 70 mục.**

## 4. Tách "Kế hoạch" / "Dự báo" theo phân hệ

`KeHoachTabsPage.tsx` hiện là **một component chung** cho cả Kế hoạch và Dự báo
(phân biệt bằng `loaiKeHoach === "DU_BAO"`), có 7 tab. Sau khi tách:

| Tab hiện tại | Về phân hệ |
|---|---|
| Bán hàng | Bán hàng → Kế hoạch / Dự báo bán hàng |
| Nhân sự | Tiền lương → Kế hoạch / Dự báo tiền lương |
| Dòng tiền + Nguồn vốn | Vốn & dòng tiền → Kế hoạch / Dự báo ngân sách |
| Tài sản | Tài sản → Kế hoạch / Dự báo tài sản |
| P&L | Phân tích › P&L (`/bao-cao/pnl-3-lop` đã có) |
| Chi tiết | thành màn nhập liệu bên trong từng phân hệ |
| _(chưa có tab Mua hàng)_ | Mua hàng → phải thêm tab mới |

Hai mục **"Kế hoạch"** và **"Dự báo"** đứng riêng **bị gỡ khỏi sidebar**.
Route `/trung-tam-du-lieu/ke-hoach` và `/du-bao` **giữ lại** để không phải cấp lại quyền.

## 5. Mục đang có nhưng menu mới không nhắc đến — ĐÃ CHỐT

> Chốt ngày 09/09/2026 — xem bảng quyết định ở §9. Cột "Đề xuất" bên dưới giữ lại làm lịch sử.

| Mục | Route | Đề xuất |
|---|---|---|
| Phiếu thu | `/chung-tu/phieu-thu` | → Vốn & dòng tiền |
| Phiếu chi | `/chung-tu/phieu-chi` | → Vốn & dòng tiền |
| Quy trình | `/quy-trinh` | bỏ hay giữ? |
| Chính sách | `/chinh-sach` | bỏ hay giữ? |
| Biểu mẫu | `/bieu-mau` | bỏ hay giữ? |
| Hướng dẫn | `/huong-dan` | bỏ hay giữ? |
| Lĩnh vực | `/cau-hinh/linh-vuc` | → Cấu hình (ngoài sidebar chính?) |
| P&L so sánh KH-DB-TH | `/bao-cao/pnl-3-lop` | → Phân tích › P&L |
| Báo cáo doanh thu | `/bao-cao/doanh-thu` | → Bán hàng › Báo cáo |
| Hàng hóa | `/trung-tam-du-lieu/hang-hoa` | → Kho hay Danh mục? |
| Nguyên vật liệu | `/trung-tam-du-lieu/nguyen-lieu` | → Kho hay Danh mục? |
| Dụng cụ | `/trung-tam-du-lieu/dung-cu` | → CCDC |
| Văn phòng phẩm | `/trung-tam-du-lieu/van-phong-pham` | → Kho hay Danh mục? |

**Chưa chốt xong mục 5 thì chưa xóa route nào.**

## 6. Design tokens

Brand của thiết kế (`#1F7769`) trùng gần như hệt `--primary: 170 59% 29%` đang có → **không đổi token brand**.

| Token | Giá trị | Dùng cho |
|---|---|---|
| `--sidebar-rail` | `#EFEFF2` | nền rail |
| `--sidebar-panel` | `#FAFAFA` | nền panel |
| surface | `#FFFFFF` | thẻ, panel nội dung |
| canvas | `#F5F5F7` | nền trang |
| ink / ink-2 / ink-3 | `#1D1D1F` / `#6E6E73` / `#98989D` | chữ chính / phụ / mờ |
| line / line-soft | `#E5E5EA` / `#F0F0F3` | viền / viền nhạt |
| brand / brand-soft | `#1F7769` / `#E4F0ED` | active, nút chính |
| blue / blue-soft | `#007AFF` / `#E8F2FF` | link, mã chứng từ |
| green / red / amber | `#1F9254` / `#D93025` / `#B26A00` | tăng / giảm / cảnh báo |
| orange (chart) | `#F2994A` | đường Lợi nhuận, Tồn |
| navy / gold (donut) | `#1F3864` / `#C9A227` | biểu đồ tỷ trọng |

**Bo góc:** nút & ô nhập 7 px · thẻ & bảng 9 px · modal 14 px · pill/avatar tròn.

**Cỡ chữ (mật độ cao):** 19/700 số KPI · 16/700 tiêu đề trang · 12,5/700 tiêu đề thẻ ·
11/400 nội dung bảng · 10,5/500 nhãn phụ · 9/700 header cột.

**Icon:** một bộ **lucide** duy nhất, nét 1.5 px, cỡ 10 · 12 · 13 · 17 px.
Bỏ trộn Ant Design icons và emoji như hiện tại.

**Mật độ bảng:** dòng cao 22–24 px · padding thẻ 8–10 px · gap 6–8 px.

## 7. Thứ tự làm (bản gốc — đã thay bằng 3 đợt ở §15)

1. **Sidebar shell** — dựng rail + panel + flyout, đọc menu từ `menuCatalog.ts` mới. Chưa đụng route.
2. **Viết lại `menuCatalog.ts`** theo mục 3, thêm field `status: 'ok' | 'soon'` và `group`.
3. **Bật lại 3 route đang comment** — `/so-quy`, `/cong-no/phai-thu`, `/cong-no/phai-tra`.
4. **Tách `/bao-cao/tai-chinh`** thành 4 route con (mục 3.3).
5. **Tách Kế hoạch/Dự báo** theo mục 4 — route mới trỏ vào đúng tab của `KeHoachTabsPage`.
6. **Đồng bộ ma trận phân quyền** với cấu trúc menu mới.
7. Các mục `NEW` để sau, hiện dạng "sắp có".

Mỗi bước chạy `npm run lint` + `npm run build` trong `fe/`.

## 8. Ngoài phạm vi (YAGNI)

- Không dựng phân hệ Tiền lương / Mua hàng trong đợt này.
- Không đổi bất kỳ bảng nghiệp vụ nào (cột, filter, phân trang giữ nguyên).
- Không đổi backend.
- Không đổi `identity-service`.

---

# Phần II — Quyết định triển khai (chốt 09/09/2026)

Phần I ở trên là thiết kế nghiệp vụ. Phần II là những gì đã chốt với chủ dự án sau khi
đối chiếu spec với code thật, cộng ba ràng buộc mới:

1. **Không đổi logic nghiệp vụ.** Chỉ đổi lớp vỏ (điều hướng + giao diện) và dây phân quyền.
   Không đụng cột bảng, filter, phân trang, lời gọi API, công thức tính.
2. **Trang chưa có thì chỉ dựng trên sidebar**, bấm vào ra đúng trang
   `ComingSoon` hiện có ("Tính năng này đang được phát triển và sẽ sớm ra mắt!").
   Không dựng màn hình mới nào trong đợt này.
3. **Đồng bộ giao diện toàn dự án** theo `docs/design/screens/07-design-system.png`.

## 9. Bảng quyết định — §5 đã chốt

| Vấn đề | Chốt |
|---|---|
| Phiếu thu · Phiếu chi | → phân hệ **Vốn & dòng tiền** (thành 5 mục) |
| Quy trình · Chính sách · Biểu mẫu · Hướng dẫn | → gộp vào **"Trợ giúp & phản hồi"** ở đáy panel. Không chiếm ô trên rail |
| Hàng hóa · Nguyên vật liệu · Văn phòng phẩm | → phân hệ **Kho** |
| Dụng cụ | → phân hệ **CCDC** (mục "Công cụ dụng cụ", `/trung-tam-du-lieu/dung-cu`) |
| Lĩnh vực (`/cau-hinh/linh-vuc`) | → menu bánh răng ở header, không lên rail |
| P&L so sánh KH-DB-TH (`/bao-cao/pnl-3-lop`) | → **Phân tích › P&L** |
| Báo cáo doanh thu (`/bao-cao/doanh-thu`) | → **Bán hàng › Báo cáo** |
| Key quyền | **giữ nguyên 100%** — không migration, không cấp lại quyền cho tenant nào |
| Bo góc | 0 → **7 px** nút/ô nhập · **9 px** thẻ/bảng · **14 px** modal |
| Sidebar | teal đậm → **nền sáng** `#EFEFF2` (rail) / `#FAFAFA` (panel) |
| Mobile | Drawer **2 lớp**, dùng chung component danh sách với panel |
| Icon | **giữ `@ant-design/icons`** ở đợt này. Đổi 152 file sang lucide là đợt riêng, không nằm trong phạm vi |
| Thẻ "Kỳ kế toán" đáy panel | **hoãn** — cần API chưa có (xem §14.2) |

## 10. Kiến trúc: `menuCatalog.ts` là nguồn duy nhất

### 10.1 Vấn đề hiện tại

Bốn danh sách song song phải tự tay giữ khớp nhau:

| File | Đang giữ gì | Lệch ra sao |
|---|---|---|
| `MainLayout.tsx` | menu hard-code 3 khối, 925 dòng | `/so-quy`, `/cong-no/*` bị comment nhưng route vẫn sống |
| `config/menuCatalog.ts` | 66 mục lá, chỉ dùng để lọc lĩnh vực | thiếu `/so-quy`, `/cong-no/*`, Bếp ăn |
| `pages/cau-hinh/phan-quyen/constants/permissionModules.ts` | ma trận phân quyền, nhóm theo 3 khối cũ | chú thích đầy "đã gỡ khỏi sidebar nhưng đừng xóa" |
| `config/routePermissions.ts` | route → `<route>:xem` | gần như 1-1 máy móc |

Cộng `ComingSoon.tsx` có thêm một bảng `pathTitles` hard-code nữa — **năm** danh sách.

### 10.2 Cấu trúc mới

```
config/menuCatalog.ts   ─┬─→ SidebarRail + ModulePanel + Flyout + MobileDrawer
  MENU_MODULES (12)      ├─→ permissionModules  (ma trận, sinh ra, nhóm theo 12 phân hệ)
  MENU_LEAVES  (72)      ├─→ routePermissions   (suy `<route>:xem`, key y hệt cũ)
                         ├─→ ComingSoon.pathTitles (bỏ bảng hard-code)
                         └─→ useEffectiveMenuKeys / trang Danh mục (giữ nguyên cách dùng)
```

### 10.3 Kiểu dữ liệu

```ts
export type ModuleId =
  | 'tong-quan' | 'phan-tich' | 'tong-hop' | 'von-dong-tien'
  | 'mua-hang'  | 'ban-hang'  | 'tien-luong' | 'kho'
  | 'tai-san'   | 'ccdc'      | 'thue'       | 'danh-muc';

export interface MenuModule {
  id: ModuleId;
  label: string;        // tiêu đề panel — 'Vốn & dòng tiền'
  railLabel: string;    // nhãn dưới icon rail — 'Dòng tiền'
  icon: React.ReactNode;
  route?: string;       // nhóm 1 mục → bấm rail vào thẳng, không mở panel
}

export interface MenuLeaf {
  key: string;          // = route. ĐỒNG THỜI là khóa quyền. KHÔNG ĐỔI.
  label: string;
  module: ModuleId;
  cluster?: string;     // caption cụm trong panel — 'BÁO CÁO TÀI CHÍNH'
  status: 'ok' | 'soon';
  icon?: React.ReactNode;
  termKey?: string;     // nhãn động theo ngành (đang dùng cho 'chuDauTu')
  legacy?: true;        // giữ route + quyền, KHÔNG hiện trên sidebar
}
```

`status: 'soon'` gồm cả hai trường hợp: chưa có route, **và** có route nhưng đang trỏ
`ComingSoonPage`. Với người dùng chúng giống hệt nhau, nên chỉ cần một cờ.

### 10.4 Bốn test giữ nhà (`config/menuCatalog.test.ts`)

1. Mọi `key` có `status: 'ok'` phải khớp một route thật trong `App.tsx` **và** route đó
   không trỏ `ComingSoonPage`.
2. Mọi route trong `App.tsx` phải có mặt trong catalog — dưới dạng mục thường hoặc `legacy`.
   Route sống mà không ai khai thì fail (đây chính là chỗ `/so-quy` trôi mất).
3. `key` không trùng nhau; mọi `module` trỏ một `MenuModule` có thật.
4. Tập key sinh ra `routePermissions` phải **là tập con** của `routePermissions` cũ
   — chốt chặn "không cấp lại quyền". Test so với một bản snapshot key cũ.
   Chỉ mục `ok` và `legacy` mới sinh key quyền; mục `soon` không sinh (chưa có gì để cấp),
   nên tập mới luôn ⊆ tập cũ.

### 10.5 Hai mục gộp: Danh mục và Thuế

**Danh mục** trên rail là **1 ô**, panel **1 dòng** trỏ `/danh-muc`. Nhưng 26 trang danh mục
con vẫn phải có quyền riêng và vẫn phải lọc theo lĩnh vực. Chúng **không** nằm trong
`MENU_LEAVES` — nguồn của chúng là `config/danhMucCatalog.ts` (`DANH_MUC_ROUTES`) đang có sẵn:

```
danhMucCatalog.ts (26 route) ─┬─→ trang /danh-muc (lưới link, tự lọc theo quyền — giữ nguyên)
                              ├─→ permissionModules  → cụm 'Danh mục' trong ma trận
                              └─→ routePermissions   → 26 key `:xem` (y hệt cũ)
```

Ô rail "Danh mục" mở được khi user có quyền xem **ít nhất 1** trong 26 route — đúng logic
`AGGREGATE_MENU_ROUTES` hiện có trong `MainLayout`, chuyển nguyên vào `menuCatalog`.

**Thuế** thì ngược lại: sidebar cũ gộp thành 1 mục `/thue` với thanh ngang `THUE_NAV`;
menu mới trải thẳng **4 mục** trong panel. Nên `/thue` rời khỏi `AGGREGATE_MENU_ROUTES`,
chỉ còn `/danh-muc` là mục gộp duy nhất. `THUE_NAV` giữ nguyên trên đầu 4 trang thuế
(hai lối vào cùng tồn tại, không xung đột — thanh ngang là điều hướng trong phân hệ).

## 11. Sidebar shell

### 11.1 Chia component

```
components/layout/sidebar/
├── Sidebar.tsx          # bố cục rail + panel, state thu gọn, phím tắt ⌘\
├── SidebarRail.tsx      # 12 ô, tooltip, chấm phân hệ đang chọn
├── ModulePanel.tsx      # tiêu đề + ô tìm + <MenuItemList> + đáy panel
├── MenuItemList.tsx     # DÙNG CHUNG cho panel · flyout · drawer mobile
├── ModuleFlyout.tsx     # popover khi thu gọn — bọc <MenuItemList>
├── SidebarSearch.tsx    # ⌘K, tìm xuyên 72 mục, hiện đường dẫn phân hệ
├── HelpMenu.tsx         # 'Trợ giúp & phản hồi' — 4 trang thư viện
└── useSidebarState.ts   # thu gọn / phân hệ đang mở / lưu localStorage theo user id
```

`MenuItemList` là chốt chặn đồng nhất: panel, flyout và drawer mobile **không thể lệch**
nhau vì cùng một component, cùng một nguồn dữ liệu.

### 11.2 Bỏ `antd Menu` khỏi sidebar

Viết tay bằng `div` + Tailwind. `antd Menu` không dựng được rail+panel hai lớp, và đang
kéo theo ~250 dòng CSS đè `.ant-menu-*` trong `index.css` — xóa được cùng lúc.
Đây là thay đổi **có chủ đích, khoanh trong sidebar**; `antd Menu` ở Dropdown header và
các trang khác giữ nguyên.

### 11.3 Lọc — giữ đúng hai tầng hiện tại

1. **Lĩnh vực** — `useEffectiveMenuKeys()`, không đổi.
2. **Quyền** — `hasPermission('<key>:xem')`, không đổi. SuperAdmin bỏ qua cả hai.

Phân hệ rỗng sau khi lọc thì **ẩn khỏi rail**. Nghĩa là rail có thể ít hơn 12 ô với user
quyền hẹp — hành vi hiện tại cũng vậy, không phải điều mới. Quy tắc "rail luôn 12 ô,
không cuộn" ở §2.3 là nói về **giới hạn trên**: 12 ô cao 40 px vừa khít mọi màn hình
≥ 640 px, nên không bao giờ cần cuộn.

### 11.4 Mục `soon`

Làm mờ + chấm cam bên phải, **vẫn bấm được** → `navigate(key)` → `ComingSoonPage`.
Mục chưa có route trong `App.tsx` thì đợt A thêm route trỏ thẳng `ComingSoonPage`
(một dòng JSX mỗi mục, không có logic). Tiêu đề trang lấy từ `label` trong catalog,
nên không phải bảo trì `pathTitles` nữa.

## 12. Đồng bộ giao diện toàn dự án

Ba tầng, làm theo thứ tự, tầng sau chỉ dọn phần tầng trước không với tới.

### 12.1 Tầng token — 2 file, 257 trang đổi theo

`src/index.css`:

| Token | Cũ | Mới |
|---|---|---|
| `--radius` | `0px` | `0.4375rem` (7 px) |
| `--radius-card` | — | `9px` |
| `--radius-modal` | — | `14px` |
| `--background` | `220 20% 97%` | `#F5F5F7` |
| `--border` | `220 13% 91%` | `#E5E5EA` |
| `--sidebar-background` | `172 45% 15%` (teal đậm) | `#EFEFF2` |
| `--sidebar-panel` | — | `#FAFAFA` |
| `--ink` / `--ink-2` / `--ink-3` | — | `#1D1D1F` / `#6E6E73` / `#98989D` |
| `--blue` / `--blue-soft` | — | `#007AFF` / `#E8F2FF` |
| `--green` / `--red` / `--amber` | rải rác | `#1F9254` / `#D93025` / `#B26A00` |
| `--chart-orange/navy/gold` | — | `#F2994A` / `#1F3864` / `#C9A227` |

`--primary` giữ nguyên `170 59% 29%` — trùng `#1F7769` của thiết kế.

`src/App.tsx` `ConfigProvider`: `borderRadius: 7`, `borderRadiusLG: 9`, `borderRadiusSM: 6`,
`fontSize: 11`, `Modal.borderRadiusLG: 14`, giữ `controlHeight` 28/24/36 đang có.

### 12.2 Tầng mẫu trang — sửa tay, dùng lại khắp nơi

`SectionNav` · tiêu đề trang · khung bảng + `tableTitleConfig` · modal nhập liệu ·
trang Danh mục gộp · thẻ KPI dashboard · badge/pill trạng thái · hàng nút hành động
(thêm / sửa / xóa / xuất / làm mới).

### 12.3 Tầng quét màu cứng

`grep -rn '#1f7769\|bg-\[#\|borderRadius:\|background: *#' src/pages` → quy về token.
Plan sẽ ghi **số file thực tế** đếm được, không hứa chung chung.

Không đụng: cột bảng, filter, phân trang, gọi API, công thức.

## 13. Phân quyền

- Key quyền **không đổi một ký tự**. Không migration, không cấp lại.
- `permissionModules.ts` → hàm sinh từ `menuCatalog`, ma trận nhóm theo **12 phân hệ**,
  nhìn giống hệt sidebar. Người cấp quyền không phải dịch "ĐIỀU HÀNH" ra "Phân tích" nữa.
- Mục `status: 'soon'` **không hiện** trong ma trận — chưa có gì để cấp.
- Mục `legacy: true` cũng không hiện, nhưng quyền cũ **vẫn còn hiệu lực**.
- `PERMISSION_ACTIONS` (xem/thêm/sửa/xóa/xuất) giữ nguyên.

**Danh sách `legacy`** — đang sống, menu mới không nhắc, giữ route + giữ quyền, ẩn khỏi sidebar:

```
/bep-an/dinh-muc-tien-an · /bep-an/cong-thuc-dinh-luong · /bep-an/diem-danh-an
/bep-an/de-xuat-mua      · /bep-an/kiem-soat-chi-phi
/trung-tam-du-lieu/thu-tien-hop-dong · /trung-tam-du-lieu/hd-ban-ra
/bao-cao/so-cai · /bao-cao/pnl · /bao-cao/bang-can-doi
/trung-tam-du-lieu/ke-hoach · /trung-tam-du-lieu/du-bao   (route giữ, mục sidebar bỏ — §4)
```

## 14. Đính chính so với Phần I

### 14.1 Bản đồ menu đánh dấu `OK` cho nhiều trang thực ra là ComingSoon

Đếm trong `App.tsx`: **22 route đang render `ComingSoonPage`**, trong đó có những mục
`05-ban-do-menu.png` ghi "Đã có — giữ nguyên":

| Route | Bản đồ ghi | Thực tế |
|---|---|---|
| `/phan-tich/ban-hang`, `/mua-hang`, `/cong-no`, `/dong-tien`, `/ton-kho`, `/thanh-khoan` | OK | ComingSoon |
| `/phan-tich/bao-cao-tai-chinh` | MOVE | ComingSoon |
| `/bao-cao/so-chi-tiet-cong-no`, `/bao-cao/so-chi-tiet-phat-sinh` | MOVE | ComingSoon |
| `/trung-tam-du-lieu/tai-san` | OK | ComingSoon |

Nghĩa là **cả phân hệ Phân tích (8 mục) chỉ có 1 mục chạy thật** (`/bao-cao/pnl-khong-khau-hao`).
Con số "16 OK · 29 MOVE · 25 NEW" ở §3 là theo bản đồ, không phải theo code.
`status` trong catalog phải lấy theo **code**, và test §10.4-1 giữ cho nó không nói dối.

Việc này không làm đổi phạm vi — trang ComingSoon vẫn là ComingSoon, đúng ràng buộc số 2.
Chỉ là sidebar sẽ hiện nhiều chấm cam hơn bản đồ vẽ, và đó là hiện trạng thật.

### 14.2 Thẻ "Kỳ kế toán" — hoãn

§2.2 vẽ thẻ hiện kỳ đang mở, "đã ghi sổ 1.284/1.520", "khóa sổ gần nhất 31/08/2026".
FE **không có service nào** cung cấp mấy số này, và spec cấm đổi backend (§8).
Đợt này để trống chỗ đó trong `ModulePanel`; thẻ là việc của một đợt sau, cần API mới.

### 14.3 Số mục: 70 → 74 (đợt A) → 77 (sau đợt C)

§3 cộng ra 70 khi vài mục còn treo. Sau khi chốt §9 và đối chiếu code, con số thật:

| Phân hệ | §3 | Chốt | Chênh vì |
|---|---|---|---|
| Tổng quan | 1 | 1 | |
| Phân tích | 8 | **9** | `/bao-cao/pnl-3-lop` về đây (§9), là trang chạy thật nên không gộp được vào mục P&L |
| Tổng hợp | 12 | **9** → 12 | đợt A giữ `/bao-cao/tai-chinh` là **1 mục**; đợt C tách thành 4 (§15) |
| Vốn & dòng tiền | 3+2 | **5** | Phiếu thu + Phiếu chi |
| Mua hàng | 8 | 8 | |
| Bán hàng | 9 | **10** | `/bao-cao/doanh-thu` là trang chạy thật, phải có lối vào (§9) |
| Tiền lương | 7 | 7 | |
| Kho | 6 | **9** | + Hàng hóa · Nguyên vật liệu · Văn phòng phẩm (§9), cụm "NHÓM HÀNG" |
| Tài sản | 7 | 7 | |
| CCDC | 4 | 4 | |
| Thuế | 4 | 4 | |
| Danh mục | 1 | 1 | 26 trang con lấy từ `danhMucCatalog.ts` (§10.5) |
| **Tổng** | 70 | **74** → 77 | |

### 14.4 Mỗi đợt không được làm mất lối vào trang đang chạy

Ràng buộc bắt buộc khi xếp đợt: một trang đang chạy thật thì **không đợt nào** được để
nó rơi khỏi sidebar rồi đợi đợt sau mới trả lại. Hai chỗ dễ vướng:

- **`/bao-cao/tai-chinh`** — đợt A để nguyên **1 mục** trong cụm BÁO CÁO TÀI CHÍNH.
  Nếu đợt A khai luôn 4 mục con `soon` thì 4 tab đang dùng được biến thành 4 trang
  ComingSoon. Đợt C tách route xong mới đổi catalog.
- **Kế hoạch / Dự báo** — §4 gỡ 2 mục đứng riêng. Đợt A thay bằng mục theo phân hệ trỏ
  `/trung-tam-du-lieu/ke-hoach?tab=<tab>`, và `KeHoachTabsPage` đọc `?tab` để chọn tab
  đầu (đổi 3 dòng khởi tạo state, không đụng logic tính toán). Nhờ vậy mục
  "Kế hoạch bán hàng" chạy được ngay từ đợt A thay vì phải chờ đợt C.

Với hai chỗ này, `key` của mục lá được phép mang query string; khóa quyền khi đó khai
riêng bằng `permKey` (ví dụ key `/trung-tam-du-lieu/ke-hoach?tab=nhan-su`,
`permKey: '/trung-tam-du-lieu/ke-hoach'`) — quyền vẫn là key cũ, đúng cam kết §13.

## 15. Chia đợt — thay §7

Mỗi đợt tự đứng được, deploy được, dừng lại được mà app vẫn chạy.

### Đợt A — Menu + sidebar shell
Viết lại `menuCatalog.ts` (12 phân hệ / 72 mục) · dựng `sidebar/` 8 file ·
`MainLayout` bỏ menu hard-code, chỉ còn bố cục · drawer mobile 2 lớp ·
thêm route ComingSoon cho các mục `soon` chưa có route · `ComingSoon` lấy tiêu đề từ catalog ·
4 test §10.4.
**Không đụng**: route trang thật, phân quyền, token màu.

### Đợt B — Đồng bộ giao diện
Tầng token (§12.1) · tầng mẫu trang (§12.2) · tầng quét màu cứng (§12.3).
**Không đụng**: logic trang.

### Đợt C — Phân quyền + route
`permissionModules` sinh từ catalog · bật lại `/so-quy`, `/cong-no/phai-thu`,
`/cong-no/phai-tra` · tách `/bao-cao/tai-chinh` thành 4 route (**route trỏ vào tab sẵn có,
không sửa component**) · tách Kế hoạch/Dự báo theo §4 (cũng chỉ là route → tab).

### Nghiệm thu mỗi đợt
`npm run lint` · `npm run build` · `npm test` trong `fe/`.
Nhớ: `vite build` **không** typecheck (xem memory "Baseline test đỏ sẵn") → chạy thêm
`npx tsc --noEmit` và chỉ so **số lỗi** với baseline trước khi sửa, không đòi sạch trơn.
Deploy FE theo memory "Deploy FE nguyên tử" (stage rồi `mv`, `index.html` sau cùng) và
verify ở `ketoan.masterceo.com.vn`, không phải `masterceo.com.vn`.

## 16. Ngoài phạm vi (bổ sung cho §8)

- Không đổi `@ant-design/icons` sang lucide (152 file — đợt riêng).
- Không dựng màn hình mới cho 25+ mục `soon`; tất cả ra `ComingSoonPage`.
- Không dựng thẻ "Kỳ kế toán" (thiếu API).
- Không đổi `PERMISSION_ACTIONS`, không đổi key quyền, không migration DB.
- Không đổi logic nghiệp vụ ở bất kỳ trang nào.
