export interface DanhMucLink {
  label: string;
  path: string;
  /** Nhãn đổi theo ngành (glossary) — nếu có thì ưu tiên dùng t(termKey). */
  termKey?: string;
}

export interface DanhMucGroup {
  title: string;
  links: DanhMucLink[];
}

/**
 * Nội dung trang Danh mục (toàn màn hình) — thay cho danh sách thả xuống ở sidebar.
 * Danh mục chỉ cập nhật một lần khi phát sinh nên gom hết vào 1 trang cho dễ nhìn.
 * CẬP NHẬT cùng lúc với MENU_CATALOG / permissionModules khi thêm danh mục mới.
 */
export const DANH_MUC_GROUPS: DanhMucGroup[] = [
  {
    title: 'Đối tượng',
    links: [
      { label: 'Đối tượng', path: '/danh-muc/doi-tuong' },
      { label: 'Chủ đầu tư', path: '/danh-muc/chu-dau-tu', termKey: 'chuDauTu' },
      { label: 'Nhóm quản lý', path: '/danh-muc/nhom-quan-ly' },
      { label: 'Bộ phận', path: '/danh-muc/bo-phan' },
    ],
  },
  {
    title: 'Tài khoản',
    links: [
      { label: 'Hệ thống tài khoản', path: '/danh-muc/tai-khoan' },
      { label: 'Số dư đầu kỳ', path: '/danh-muc/so-du-dau-ky' },
      { label: 'Quy chuẩn hạch toán', path: '/danh-muc/quy-chuan' },
    ],
  },
  {
    title: 'Vật tư, hàng hóa',
    links: [
      { label: 'Hàng hóa vật tư', path: '/danh-muc/hang-hoa-vat-tu' },
      { label: 'Nhóm vật tư', path: '/danh-muc/nhom-vat-tu' },
      { label: 'Đơn vị tính', path: '/danh-muc/don-vi-tinh' },
      { label: 'Kho', path: '/danh-muc/kho' },
    ],
  },
  {
    title: 'Bán hàng',
    links: [
      { label: 'Hợp đồng', path: '/danh-muc/hop-dong' },
      { label: 'Sản phẩm', path: '/danh-muc/san-pham' },
      { label: 'Nhóm sản phẩm', path: '/danh-muc/nhom-san-pham' },
      { label: 'Dự án', path: '/danh-muc/du-an' },
      { label: 'Nhóm khuyến mại', path: '/danh-muc/nhom-khuyen-mai' },
    ],
  },
  {
    title: 'Tiền, dòng tiền',
    links: [
      { label: 'Ngân hàng & Quỹ', path: '/danh-muc/ngan-hang' },
      { label: 'Dòng tiền', path: '/danh-muc/dong-tien' },
      { label: 'Khoản mục', path: '/danh-muc/khoan-muc' },
      { label: 'Nhóm khoản mục', path: '/danh-muc/nhom-khoan-muc' },
    ],
  },
  {
    title: 'Chứng từ',
    links: [
      { label: 'Loại chứng từ', path: '/danh-muc/loai-chung-tu' },
      { label: 'Loại giao dịch', path: '/danh-muc/loai-giao-dich' },
      { label: 'Hồ sơ chứng từ', path: '/danh-muc/ho-so-chung-tu' },
      { label: 'Lý do không hợp lệ', path: '/danh-muc/ly-do-khong-hop-le' },
    ],
  },
];

/** Mọi route danh mục — dùng để quyết định có hiện mục "Danh mục" ở sidebar không. */
export const DANH_MUC_ROUTES: string[] = DANH_MUC_GROUPS.flatMap((g) =>
  g.links.map((l) => l.path),
);
