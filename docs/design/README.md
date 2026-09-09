# Design — sidebar & menu mới (2026-09-09)

Tài sản thiết kế cho đợt làm lại sidebar + chia lại menu theo nghiệp vụ.

**Spec đầy đủ:** [`../superpowers/specs/2026-09-09-sidebar-menu-redesign-design.md`](../superpowers/specs/2026-09-09-sidebar-menu-redesign-design.md)

## Ảnh màn hình (`screens/`)

| File | Nội dung |
|---|---|
| `01-dashboard-tong-quan.png` | Dashboard 5 tab + 7 khối, vẽ theo đúng `Dashboard.tsx` hiện có |
| `02-cong-no-phai-thu.png` | Trang bảng, cột đúng `CongNoPhaiThuPage.tsx`, 2 view Chi tiết / Tổng hợp |
| `03-modal-phieu-thu.png` | Modal thêm phiếu thu + bảng phân bổ vào hóa đơn còn nợ |
| `04-sidebar-thu-gon-flyout.png` | Sidebar thu gọn 62px + flyout mục con |
| `05-ban-do-menu.png` | **Bản đồ 12 phân hệ / 70 mục**, đối chiếu từng mục với route hiện có |
| `06a-sidebar-cau-tao.png` | Sidebar 1:1 + bảng kích thước, quy tắc, đổi so với hiện tại |
| `06b-sidebar-12-panel.png` | Nội dung panel của cả 12 phân hệ |
| `06c-sidebar-trang-thai.png` | Thu gọn + flyout · tooltip · ⌘K · mục sắp có |
| `07-design-system.png` | Màu, bo góc, cỡ chữ, nút, pill, icon |

Tất cả ảnh đều ≤ 2000px mỗi chiều để Claude Code đọc được trực tiếp.

## HTML tham chiếu

| File | Nội dung |
|---|---|
| `sidebar.html` | Rail + panel + flyout, xuất Tailwind — lấy giá trị px/màu chính xác |
| `dashboard-header.html` | Header dính của dashboard: 5 tab + chọn kỳ |

Hai file HTML là **bản xuất từ canvas, không phải code sản phẩm** — dùng để tra số đo,
đừng copy nguyên vào `src/`.

## Dùng với Claude Code

Vào `fe/` rồi chạy:

```
Đọc docs/superpowers/specs/2026-09-09-sidebar-menu-redesign-design.md
và xem 3 ảnh: docs/design/screens/06a-sidebar-cau-tao.png,
06b-sidebar-12-panel.png, 05-ban-do-menu.png.
Làm bước 1 và 2 trong mục "Thứ tự làm": dựng sidebar rail+panel+flyout
và viết lại menuCatalog.ts. Chưa đụng vào route.
```

Trả lời 3 câu hỏi ở **mục 5 của spec** trước khi làm bước 3 trở đi
(Phiếu thu/Phiếu chi về đâu · nhóm THƯ VIỆN giữ hay bỏ · 4 nhóm hàng trong kho về đâu).

## Nguồn menu

Sheet **"Menu tài chính"** trong `docs/THIẾT KẾ_KẾ TOÁN.xlsx`.
Link Google Sheets tương ứng trả HTTP 401, không đọc được bằng tool — luôn dùng file xlsx local.
