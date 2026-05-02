export interface PermissionModule {
  key: string;
  label: string;
  isSection?: boolean;
  children?: PermissionModule[];
}

export type PermissionAction = 'xem' | 'them' | 'sua' | 'xoa' | 'xuat';

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'xem', label: 'Xem' },
  { key: 'them', label: 'Thêm' },
  { key: 'sua', label: 'Sửa' },
  { key: 'xoa', label: 'Xoá' },
  { key: 'xuat', label: 'Xuất' },
];

export const permissionModules: PermissionModule[] = [
  {
    key: 'dieu-hanh',
    label: 'ĐIỀU HÀNH',
    isSection: true,
    children: [
      { key: '/', label: 'Tổng quan' },
      {
        key: '/phan-tich',
        label: 'Phân tích',
        children: [
          { key: '/phan-tich/bao-cao-tai-chinh', label: 'Kế toán' },
          { key: '/phan-tich/ban-hang', label: 'Bán hàng' },
          { key: '/phan-tich/mua-hang', label: 'Mua hàng' },
          { key: '/phan-tich/cong-no', label: 'Công nợ' },
          { key: '/phan-tich/dong-tien', label: 'Dòng tiền' },
          { key: '/phan-tich/ton-kho', label: 'Tồn kho' },
          { key: '/phan-tich/thanh-khoan', label: 'Khả năng thanh khoản' },
        ],
      },
    ],
  },
  {
    key: 'ke-toan',
    label: 'KẾ TOÁN',
    isSection: true,
    children: [
      {
        key: '/bao-cao',
        label: 'Báo cáo',
        children: [
          { key: '/bao-cao/tai-chinh', label: 'Báo cáo tài chính' },
          { key: '/bao-cao/so-chi-tiet-tai-khoan', label: 'Sổ chi tiết tài khoản' },
          { key: '/bao-cao/so-chi-tiet-cong-no', label: 'Sổ chi tiết công nợ' },
          { key: '/bao-cao/so-chi-tiet-phat-sinh', label: 'Sổ chi tiết phát sinh' },
          { key: '/bao-cao/bang-tong-hop', label: 'Bảng tổng hợp' },
        ],
      },
      {
        key: '/trung-tam-du-lieu',
        label: 'Trung tâm dữ liệu',
        children: [
          { key: '/trung-tam-du-lieu/ke-hoach', label: 'Kế hoạch' },
          { key: '/trung-tam-du-lieu/du-bao', label: 'Dự báo' },
          { key: '/chung-tu/nhat-ky-chung', label: 'Dữ liệu tổng hợp' },
          { key: '/trung-tam-du-lieu/tai-san', label: 'Quản lý Tài sản' },
          { key: '/trung-tam-du-lieu/hang-hoa', label: 'Quản lý Hàng hóa' },
          { key: '/trung-tam-du-lieu/nguyen-lieu', label: 'Quản lý Nguyên liệu' },
          { key: '/trung-tam-du-lieu/dung-cu', label: 'Quản lý Dụng cụ' },
          { key: '/trung-tam-du-lieu/hop-dong', label: 'Quản lý Hợp đồng' },
          { key: '/trung-tam-du-lieu/nhan-su', label: 'Quản lý nhân sự' },
          { key: '/trung-tam-du-lieu/luong-bhxh', label: 'Lương & BHXH' },
        ],
      },
      {
        key: '/chung-tu',
        label: 'Chứng từ',
        children: [
          { key: '/chung-tu/phieu-thu', label: 'Phiếu thu' },
          { key: '/chung-tu/phieu-chi', label: 'Phiếu chi' },
          { key: '/chung-tu/phieu-nhap', label: 'Phiếu nhập' },
          { key: '/chung-tu/phieu-xuat', label: 'Phiếu xuất' },
          { key: '/chung-tu/phieu-luong', label: 'Phiếu lương' },
          { key: '/chung-tu/bang-tinh-luong', label: 'Bảng tính lương' },
          { key: '/chung-tu/bang-cham-cong', label: 'Bảng chấm công' },
          { key: '/chung-tu/cham-cong-lam-them', label: 'Chấm công làm thêm giờ' },
          { key: '/chung-tu/phan-bo-khau-hao', label: 'Phân bổ khấu hao TSCĐ' },
          { key: '/chung-tu/phieu-ke-toan', label: 'Phiếu kế toán' },
          { key: '/chung-tu/de-nghi-thanh-toan', label: 'Đề nghị thanh toán' },
        ],
      },
    ],
  },
  {
    key: 'thu-vien',
    label: 'THƯ VIỆN',
    isSection: true,
    children: [
      {
        key: '/danh-muc',
        label: 'Danh mục',
        children: [
          { key: '/danh-muc/tai-khoan', label: 'Tài khoản' },
          { key: '/danh-muc/doi-tuong', label: 'Đối tượng' },
          { key: '/danh-muc/du-an', label: 'Dự án' },
          { key: '/danh-muc/san-pham', label: 'Sản phẩm' },
          { key: '/danh-muc/hop-dong', label: 'Hợp đồng' },
          { key: '/danh-muc/bo-phan', label: 'Bộ phận' },
          { key: '/danh-muc/khoan-muc', label: 'Khoản mục' },
          { key: '/danh-muc/kho', label: 'Kho' },
          { key: '/danh-muc/chu-dau-tu', label: 'Chủ đầu tư' },
          { key: '/danh-muc/nhom-khoan-muc', label: 'Nhóm khoản mục' },
          { key: '/danh-muc/ngan-hang', label: 'Ngân hàng & Quỹ' },
          { key: '/danh-muc/dong-tien', label: 'Dòng tiền' },
          { key: '/danh-muc/nhom-khuyen-mai', label: 'Nhóm khuyến mại' },
          { key: '/danh-muc/nhom-quan-ly', label: 'Nhóm quản lý' },
          { key: '/danh-muc/loai-chung-tu', label: 'Loại chứng từ' },
          { key: '/danh-muc/loai-giao-dich', label: 'Loại giao dịch' },
          { key: '/danh-muc/quy-chuan', label: 'Quy chuẩn hạch toán' },
        ],
      },
      { key: '/so-quy', label: 'Sổ quỹ' },
      { key: '/cong-no/phai-thu', label: 'Phải thu' },
      { key: '/cong-no/phai-tra', label: 'Phải trả' },
      { key: '/quy-trinh', label: 'Quy trình' },
      { key: '/chinh-sach', label: 'Chính sách' },
      { key: '/bieu-mau', label: 'Biểu mẫu' },
      { key: '/huong-dan', label: 'Hướng dẫn' },
    ],
  },
];
