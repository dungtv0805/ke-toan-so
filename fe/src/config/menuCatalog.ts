export interface MenuCatalogEntry {
  key: string; // = path route, vd '/danh-muc/tai-khoan'
  label: string; // 'Tài khoản'
  parentLabel?: string; // 'Danh mục' (nhóm cha), undefined nếu là mục gốc
}

// Nguồn: fe/src/components/layout/MainLayout.tsx
// (dieuHanhMenuItems, keToAnMenuItems, thuVienMenuItems).
// Mỗi entry là MỘT mục lá (có route thật) trong sidebar.
// CẬP NHẬT danh sách này khi thêm/sửa menu ở MainLayout.
export const MENU_CATALOG: MenuCatalogEntry[] = [
  // ===== ĐIỀU HÀNH =====
  { key: '/', label: 'Tổng quan' },
  { key: '/phan-tich/bao-cao-tai-chinh', label: 'Kế toán', parentLabel: 'Phân tích' },
  { key: '/phan-tich/ban-hang', label: 'Bán hàng', parentLabel: 'Phân tích' },
  { key: '/phan-tich/mua-hang', label: 'Mua hàng', parentLabel: 'Phân tích' },
  { key: '/phan-tich/cong-no', label: 'Công nợ', parentLabel: 'Phân tích' },
  { key: '/phan-tich/dong-tien', label: 'Dòng tiền', parentLabel: 'Phân tích' },
  { key: '/phan-tich/ton-kho', label: 'Tồn kho', parentLabel: 'Phân tích' },
  { key: '/phan-tich/thanh-khoan', label: 'Khả năng thanh khoản', parentLabel: 'Phân tích' },

  // ===== KẾ TOÁN — Báo cáo =====
  { key: '/bao-cao/tai-chinh', label: 'Báo cáo tài chính', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/so-chi-tiet-tai-khoan', label: 'Sổ chi tiết tài khoản', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/so-chi-tiet-cong-no', label: 'Sổ chi tiết công nợ', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/so-chi-tiet-phat-sinh', label: 'Sổ chi tiết phát sinh', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/bang-tong-hop', label: 'Tổng hợp công nợ', parentLabel: 'Báo cáo' },
  { key: '/bao-cao/hop-dong', label: 'Báo cáo', parentLabel: 'Bán hàng' },
  { key: '/bao-cao/doanh-thu', label: 'Báo cáo doanh thu', parentLabel: 'Báo cáo' },

  // ===== KẾ TOÁN — Thuế =====
  { key: '/thue/bang-ke-mua-vao', label: 'Bảng kê mua vào', parentLabel: 'Thuế' },
  { key: '/thue/bang-ke-ban-ra', label: 'Bảng kê bán ra', parentLabel: 'Thuế' },
  { key: '/thue/tong-hop', label: 'Tổng hợp thuế', parentLabel: 'Thuế' },
  { key: '/thue/bao-cao-tndn', label: 'Báo cáo nhanh thuế TNDN', parentLabel: 'Thuế' },

  // ===== KẾ TOÁN — mục gốc (đứng ngang hàng "Báo cáo" / "Thuế" / "Kho") =====
  // Nhóm bọc "Trung tâm dữ liệu" đã bỏ → không còn parentLabel.
  { key: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch' },
  { key: '/trung-tam-du-lieu/du-bao', label: 'Dự báo' },
  { key: '/chung-tu/nhat-ky-chung', label: 'Thực hiện' },
  { key: '/chung-tu/phieu-thu', label: 'Phiếu thu' },
  { key: '/chung-tu/phieu-chi', label: 'Phiếu chi' },
  { key: '/chung-tu/ket-chuyen-lai-lo', label: 'Kết chuyển lãi lỗ' },
  { key: '/trung-tam-du-lieu/tai-san', label: 'Quản lý Tài sản' },
  { key: '/trung-tam-du-lieu/hop-dong', label: 'Bán hàng' },

  // ===== KẾ TOÁN — Kho =====
  // 4 nhóm hàng là mục sidebar; Nhập/Xuất/Chuyển/Kiểm kê kho nằm trên thanh ngang.
  { key: '/trung-tam-du-lieu/hang-hoa', label: 'Hàng hóa', parentLabel: 'Kho' },
  { key: '/trung-tam-du-lieu/nguyen-lieu', label: 'Nguyên vật liệu', parentLabel: 'Kho' },
  { key: '/trung-tam-du-lieu/dung-cu', label: 'Dụng cụ', parentLabel: 'Kho' },
  { key: '/trung-tam-du-lieu/van-phong-pham', label: 'Văn phòng phẩm', parentLabel: 'Kho' },
  { key: '/kho/nhap-kho', label: 'Nhập kho', parentLabel: 'Kho' },
  { key: '/kho/xuat-kho', label: 'Xuất kho', parentLabel: 'Kho' },
  { key: '/kho/chuyen-kho', label: 'Chuyển kho', parentLabel: 'Kho' },

  // ===== KẾ TOÁN — Bếp ăn =====

  // ===== THƯ VIỆN — Danh mục =====
  { key: '/danh-muc/tai-khoan', label: 'Tài khoản', parentLabel: 'Danh mục' },
  { key: '/danh-muc/doi-tuong', label: 'Đối tượng', parentLabel: 'Danh mục' },
  { key: '/danh-muc/du-an', label: 'Dự án', parentLabel: 'Danh mục' },
  { key: '/danh-muc/san-pham', label: 'Sản phẩm', parentLabel: 'Danh mục' },
  { key: '/danh-muc/hop-dong', label: 'Hợp đồng', parentLabel: 'Danh mục' },
  { key: '/danh-muc/bo-phan', label: 'Bộ phận', parentLabel: 'Danh mục' },
  { key: '/danh-muc/khoan-muc', label: 'Khoản mục', parentLabel: 'Danh mục' },
  { key: '/danh-muc/so-du-dau-ky', label: 'Số dư đầu kỳ', parentLabel: 'Danh mục' },
  { key: '/danh-muc/kho', label: 'Kho', parentLabel: 'Danh mục' },
  { key: '/danh-muc/hang-hoa-vat-tu', label: 'Hàng hóa vật tư', parentLabel: 'Danh mục' },
  { key: '/danh-muc/don-vi-tinh', label: 'Đơn vị tính', parentLabel: 'Danh mục' },
  { key: '/danh-muc/ly-do-khong-hop-le', label: 'Lý do không hợp lệ', parentLabel: 'Danh mục' },
  { key: '/danh-muc/nhom-vat-tu', label: 'Nhóm vật tư', parentLabel: 'Danh mục' },
  { key: '/danh-muc/nhom-san-pham', label: 'Nhóm sản phẩm', parentLabel: 'Danh mục' },

  // ===== THƯ VIỆN — Danh mục › Khác =====
  { key: '/danh-muc/chu-dau-tu', label: 'Chủ đầu tư', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/nhom-khoan-muc', label: 'Nhóm khoản mục', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/ngan-hang', label: 'Ngân hàng & Quỹ', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/dong-tien', label: 'Dòng tiền', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/nhom-dong-tien', label: 'Nhóm dòng tiền', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/tai-khoan-ket-chuyen', label: 'Tài khoản kết chuyển', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/nhom-khuyen-mai', label: 'Nhóm khuyến mại', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/nhom-quan-ly', label: 'Nhóm quản lý', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/loai-chung-tu', label: 'Loại chứng từ', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/loai-giao-dich', label: 'Loại giao dịch', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/quy-chuan', label: 'Quy chuẩn hạch toán', parentLabel: 'Danh mục › Khác' },
  { key: '/danh-muc/ho-so-chung-tu', label: 'Hồ sơ chứng từ', parentLabel: 'Danh mục › Khác' },

  // ===== THƯ VIỆN — gốc =====
  { key: '/cau-hinh/linh-vuc', label: 'Lĩnh vực', parentLabel: 'Cấu hình' },
  { key: '/quy-trinh', label: 'Quy trình' },
  { key: '/chinh-sach', label: 'Chính sách' },
  { key: '/bieu-mau', label: 'Biểu mẫu' },
  { key: '/huong-dan', label: 'Hướng dẫn' },
];

// Tất cả menu key (path) trong catalog — tiện cho việc gom/đối chiếu.
export const flattenMenuKeys = (
  entries: MenuCatalogEntry[] = MENU_CATALOG,
): string[] => entries.map((e) => e.key);
