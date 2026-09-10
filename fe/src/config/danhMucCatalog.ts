import {
  Banknote,
  BookOpen,
  Building2,
  FilePen,
  FileSearch,
  FileText,
  Landmark,
  Layers,
  List,
  Package,
  PackageSearch,
  Receipt,
  Repeat,
  Ruler,
  Scale,
  Split,
  Store,
  Target,
  TriangleAlert,
  Users,
  Wallet,
  Waves,
  type LucideIcon,
} from 'lucide-react';

export interface DanhMucLink {
  label: string;
  path: string;
  /** Nhãn đổi theo ngành (glossary) — nếu có thì ưu tiên dùng t(termKey). */
  termKey?: string;
  icon: LucideIcon;
}

export interface DanhMucGroup {
  title: string;
  links: DanhMucLink[];
  icon: LucideIcon;
  /**
   * Màu nhấn của nhóm — dùng cho icon, huy hiệu đếm và nền dải đầu thẻ.
   * Nền dải KHÔNG dùng màu pastel cứng của bản vẽ mà pha loãng chính màu này,
   * để chế độ tối không bị chói.
   */
  mau: string;
}

/**
 * Nội dung trang Danh mục (toàn màn hình) — thay cho danh sách thả xuống ở sidebar.
 * Danh mục chỉ cập nhật một lần khi phát sinh nên gom hết vào 1 trang cho dễ nhìn.
 * CẬP NHẬT cùng lúc với MENU_CATALOG / permissionModules khi thêm danh mục mới.
 */
export const DANH_MUC_GROUPS: DanhMucGroup[] = [
  {
    title: 'Đối tượng',
    icon: Users,
    mau: '#2F6FED',
    links: [
      { label: 'Đối tượng', path: '/danh-muc/doi-tuong', icon: Users },
      { label: 'Chủ đầu tư', path: '/danh-muc/chu-dau-tu', termKey: 'chuDauTu', icon: Building2 },
      { label: 'Nhóm quản lý', path: '/danh-muc/nhom-quan-ly', icon: Layers },
      { label: 'Bộ phận', path: '/danh-muc/bo-phan', icon: Split },
    ],
  },
  {
    title: 'Tài khoản',
    icon: BookOpen,
    mau: '#1F7769',
    links: [
      { label: 'Hệ thống tài khoản', path: '/danh-muc/tai-khoan', icon: List },
      { label: 'Số dư đầu kỳ', path: '/danh-muc/so-du-dau-ky', icon: Wallet },
      { label: 'Quy chuẩn hạch toán', path: '/danh-muc/quy-chuan', icon: Scale },
    ],
  },
  {
    title: 'Vật tư, hàng hóa',
    icon: Package,
    mau: '#B26A00',
    links: [
      { label: 'Hàng hóa vật tư', path: '/danh-muc/hang-hoa-vat-tu', icon: Package },
      { label: 'Nhóm vật tư', path: '/danh-muc/nhom-vat-tu', icon: Layers },
      { label: 'Đơn vị tính', path: '/danh-muc/don-vi-tinh', icon: Ruler },
      { label: 'Kho', path: '/danh-muc/kho', icon: PackageSearch },
    ],
  },
  {
    title: 'Bán hàng',
    icon: Store,
    mau: '#7C3AED',
    links: [
      { label: 'Hợp đồng', path: '/danh-muc/hop-dong', icon: FilePen },
      { label: 'Sản phẩm', path: '/danh-muc/san-pham', icon: Package },
      { label: 'Nhóm sản phẩm', path: '/danh-muc/nhom-san-pham', icon: Layers },
      { label: 'Dự án', path: '/danh-muc/du-an', icon: Target },
      { label: 'Nhóm khuyến mại', path: '/danh-muc/nhom-khuyen-mai', icon: Receipt },
    ],
  },
  {
    title: 'Tiền, dòng tiền',
    icon: Banknote,
    mau: '#1F9254',
    links: [
      { label: 'Ngân hàng & Quỹ', path: '/danh-muc/ngan-hang', icon: Landmark },
      { label: 'Dòng tiền', path: '/danh-muc/dong-tien', icon: Waves },
      { label: 'Nhóm dòng tiền', path: '/danh-muc/nhom-dong-tien', icon: Layers },
      { label: 'Khoản mục', path: '/danh-muc/khoan-muc', icon: List },
      { label: 'Nhóm khoản mục', path: '/danh-muc/nhom-khoan-muc', icon: Layers },
    ],
  },
  {
    title: 'Chứng từ',
    icon: FileText,
    mau: '#475569',
    links: [
      { label: 'Loại chứng từ', path: '/danh-muc/loai-chung-tu', icon: FileText },
      { label: 'Loại giao dịch', path: '/danh-muc/loai-giao-dich', icon: Repeat },
      { label: 'Hồ sơ chứng từ', path: '/danh-muc/ho-so-chung-tu', icon: FileSearch },
      { label: 'Lý do không hợp lệ', path: '/danh-muc/ly-do-khong-hop-le', icon: TriangleAlert },
      { label: 'Tài khoản kết chuyển', path: '/danh-muc/tai-khoan-ket-chuyen', icon: Repeat },
    ],
  },
];

/** Mọi route danh mục — dùng để quyết định có hiện mục "Danh mục" ở sidebar không. */
export const DANH_MUC_ROUTES: string[] = DANH_MUC_GROUPS.flatMap((g) =>
  g.links.map((l) => l.path),
);
