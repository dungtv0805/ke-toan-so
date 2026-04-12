import loadable from '@loadable/component';

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Auth
export const LoginPage = loadable(() => import('./auth/LoginPage'), {
  fallback: <PageLoader />
});

// Dashboard
export const Dashboard = loadable(() => import('./dashboard/Dashboard'), {
  fallback: <PageLoader />
});

// Profile
export const ProfilePage = loadable(() => import('./profile/ProfilePage'), {
  fallback: <PageLoader />
});

// Danh mục
export const TaiKhoanPage = loadable(() => import('./danh-muc/tai-khoan/TaiKhoanPage'), {
  fallback: <PageLoader />
});

export const DoiTuongPage = loadable(() => import('./danh-muc/doi-tuong/DoiTuongPage'), {
  fallback: <PageLoader />
});

export const SanPhamPage = loadable(() => import('./danh-muc/san-pham/SanPhamPage'), {
  fallback: <PageLoader />
});

export const DuAnPage = loadable(() => import('./danh-muc/du-an/DuAnPage'), {
  fallback: <PageLoader />
});

export const BoPhanPage = loadable(() => import('./danh-muc/bo-phan/BoPhanPage'), {
  fallback: <PageLoader />
});

export const KhoanMucPage = loadable(() => import('./danh-muc/khoan-muc/KhoanMucPage'), {
  fallback: <PageLoader />
});

export const NganHangPage = loadable(() => import('./danh-muc/ngan-hang/NganHangPage'), {
  fallback: <PageLoader />
});

export const DongTienPage = loadable(() => import('./danh-muc/dong-tien/DongTienPage'), {
  fallback: <PageLoader />
});

export const ChuDauTuPage = loadable(() => import('./danh-muc/chu-dau-tu/ChuDauTuPage'), {
  fallback: <PageLoader />
});

export const NhomKhuyenMaiPage = loadable(() => import('./danh-muc/nhom-khuyen-mai/NhomKhuyenMaiPage'), {
  fallback: <PageLoader />
});

export const NhomQuanLyPage = loadable(() => import('./danh-muc/nhom-quan-ly/NhomQuanLyPage'), {
  fallback: <PageLoader />
});

export const LoaiChungTuPage = loadable(() => import('./danh-muc/loai-chung-tu/LoaiChungTuPage'), {
  fallback: <PageLoader />
});

export const NhomKhoanMucPage = loadable(() => import('./danh-muc/nhom-khoan-muc/NhomKhoanMucPage'), {
  fallback: <PageLoader />
});

export const LoaiGiaoDichPage = loadable(() => import('./danh-muc/loai-giao-dich/LoaiGiaoDichPage'), {
  fallback: <PageLoader />
});

export const HopDongPage = loadable(() => import('./danh-muc/hop-dong/HopDongPage'), {
  fallback: <PageLoader />
});

// Chứng từ
export const PhieuThuPage = loadable(() => import('./chung-tu/phieu-thu/PhieuThuPage'), {
  fallback: <PageLoader />
});

export const PhieuChiPage = loadable(() => import('./chung-tu/phieu-chi/PhieuChiPage'), {
  fallback: <PageLoader />
});

export const NhatKyChungPage = loadable(() => import('./chung-tu/nhat-ky-chung/NhatKyChungPage'), {
  fallback: <PageLoader />
});

export const NhatKyChungFormPage = loadable(() => import('./chung-tu/nhat-ky-chung/NhatKyChungFormPage'), {
  fallback: <PageLoader />
});

// Sổ quỹ
export const SoQuyPage = loadable(() => import('./so-quy/SoQuyPage'), {
  fallback: <PageLoader />
});

// Công nợ
export const CongNoPhaiThuPage = loadable(() => import('./cong-no/phai-thu/CongNoPhaiThuPage'), {
  fallback: <PageLoader />
});

export const CongNoPhaiTraPage = loadable(() => import('./cong-no/phai-tra/CongNoPhaiTraPage'), {
  fallback: <PageLoader />
});

// Báo cáo
export const PnLPage = loadable(() => import('./bao-cao/pnl/PnLPage'), {
  fallback: <PageLoader />
});

export const SoCaiPage = loadable(() => import('./bao-cao/so-cai/SoCaiPage'), {
  fallback: <PageLoader />
});

export const BangCanDoiPage = loadable(() => import('./bao-cao/bang-can-doi/BangCanDoiPage'), {
  fallback: <PageLoader />
});

export const BaoCaoTaiChinhPage = loadable(() => import('./bao-cao/tai-chinh/BaoCaoTaiChinhPage'), {
  fallback: <PageLoader />
});

export const KqkdPage = loadable(() => import('./bao-cao/kqkd/KqkdPage'), {
  fallback: <PageLoader />
});

// Cấu hình
export const QuyChaunPage = loadable(() => import('./danh-muc/quy-chuan/QuyChaunPage'), {
  fallback: <PageLoader />
});

export const PhanQuyenPage = loadable(() => import('./cau-hinh/phan-quyen/PhanQuyenPage'), {
  fallback: <PageLoader />
});

export const TenantPage = loadable(() => import('./cau-hinh/tenant/TenantPage'), {
  fallback: <PageLoader />
});

// Other pages
export const PlaceholderPage = loadable(() => import('./PlaceholderPage'), {
  fallback: <PageLoader />
});

export const ComingSoonPage = loadable(() => import('./ComingSoon'), {
  fallback: <PageLoader />
});

export const NotFound = loadable(() => import('./NotFound'), {
  fallback: <PageLoader />
});
