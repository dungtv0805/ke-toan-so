# Đợt A — việc còn nợ sau khi gộp

Ghi lại từ 12 vòng review của đợt dựng sidebar. Không cái nào chặn gộp; xếp theo mức đáng làm.

## Cần làm ở nơi khác, không phải FE

**Dọn `menuKeys` bẩn trong MongoDB.** Trước khi `MENU_CATALOG` được khử trùng, trang Quản lý Lĩnh vực lưu `menuKeys` chứa cùng một khoá lặp tới 5 lần (`/trung-tam-du-lieu/ke-hoach`, `/trung-tam-du-lieu/du-bao`). Nguồn đã chặn, nhưng dữ liệu cũ vẫn còn. Nó tự sạch khi ai đó mở và lưu lại từng lĩnh vực; muốn dứt điểm thì cần một script dọn ở BE. Triệu chứng nhìn thấy: cột "Số menu" đếm phồng.

## Một dòng, nên làm sớm

| Việc | Chỗ | Vì sao |
|---|---|---|
| `placement="topRight"` → `topLeft` | `sidebar/HelpMenu.tsx` (biến thể rail) | menu bung ra từ cột 62px sát mép trái, hiện đang phải nhờ cơ chế tự nắn kéo lại |
| thêm `overflow-y-auto` cho rail | `sidebar/SidebarRail.tsx` | rail cao 562px trong `overflow-hidden`; thêm phân hệ thứ 13 hoặc màn hình rất thấp là cắt mất ô đáy, không cuộn tới được |
| bỏ `<div>` bọc rỗng | `sidebar/SidebarRail.tsx` | khi `HelpMenu` trả `null` (user không có quyền trang nào) vẫn còn một div rỗng |

## Đáng cân nhắc

- **Sidebar sáng mục cũ khi đổi tab trong trang.** `KeHoachTabsPage` chỉ đọc `?tab=`, bấm tab trong trang không ghi lại URL. Vào bằng "Kế hoạch bán hàng" rồi đổi sang tab Dòng tiền thì sidebar vẫn sáng mục cũ. Vẫn tốt hơn trước (trước sáng cả 4 mục), nhưng chưa đúng hẳn. Sửa bằng cách cho tab ghi ngược lên URL.
- **Mất logo và tên "Master CEO" khỏi sidebar.** Sidebar cũ có; bản mới không. Tiêu đề drawer mobile cũng chỉ còn chữ "Menu".
- **Panel biến mất trên `/profile` và `/cau-hinh/*`.** Hai trang này không thuộc phân hệ nào nên panel ẩn, sidebar co về 62px; muốn mở lại phải bấm icon rail.
- **Mục Trợ giúp xuất hiện hai lần khi panel mở** (một icon ở đáy rail, một hàng chữ ở đáy panel). Không gây hiểu nhầm về thị giác, nhưng trình đọc màn hình đọc trùng nhãn.
- **Tenant nhiều lĩnh vực không còn thấy mục nào thuộc lĩnh vực nào** — sidebar cũ có tiêu đề nhóm theo lĩnh vực. Bỏ có chủ đích theo thiết kế 12 phân hệ.

## Code chết phát hiện được, dọn khi tiện

- `src/components/ui/sidebar.tsx` — ~700 dòng shadcn, không file nào import, nhưng tiêu thụ đúng bộ token `--sidebar-*` và trùng tên với thư mục `layout/sidebar/`.
- `MenuLeaf.termKey` — chưa leaf nào gán, chưa nơi nào đọc.
- `.menu-coming-soon` và `.coming-soon-badge` trong `index.css` — 0 nơi dùng sau khi gỡ menu cũ.
- `toggleDarkMode` trong `MainLayout` — không có nút nào gọi.
- `.coming-soon-dot` viết cứng `hsl(38 92% 50%)`; đợt B đưa vào `--amber` thì 40+ chấm cam trên sidebar sẽ lệch màu với phần còn lại.

## Lỗ hổng của bộ test, biết để đừng tin nhầm

- Không test nào canh "trang đang chạy phải có lối vào" — đánh dấu nhầm `legacy` vẫn xanh.
- Không test nào chạm `LinhVucPage`; lỗi khoá trùng ghi xuống DB lọt qua toàn bộ 1269 test.
- Lưới an toàn token chỉ bắt `var(--…)` trong thư mục `sidebar/`; class tailwind ngữ nghĩa (`bg-primary`) lọt.
- `MenuItemList.test.tsx` dùng `module: 'mod'` không phải `ModuleId` hợp lệ — hiện không lỗi vì test nằm ngoài tsconfig, sẽ vỡ khi bật typecheck cho test.
