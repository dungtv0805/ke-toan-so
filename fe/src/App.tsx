import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { routePermissions } from "./config/routePermissions";

import MainLayout from "./components/layout/MainLayout";
import {
  LoginPage,
  Dashboard,
  ProfilePage,
  TaiKhoanPage,
  DoiTuongPage,
  SanPhamPage,
  DuAnPage,
  BoPhanPage,
  KhoanMucPage,
  NganHangPage,
  DongTienPage,
  ChuDauTuPage,
  NhomKhuyenMaiPage,
  NhomQuanLyPage,
  LoaiChungTuPage,
  NhomKhoanMucPage,
  LoaiGiaoDichPage,
  HopDongPage,
  PhieuThuPage,
  PhieuChiPage,
  NhatKyChungPage,
  NhatKyChungFormPage,
  SoQuyPage,
  CongNoPhaiThuPage,
  CongNoPhaiTraPage,
  PnLPage,
  SoCaiPage,
  BangCanDoiPage,
  QuyChaunPage,
  PhanQuyenPage,
  TenantPage,
  ComingSoonPage,
  NotFound
} from "./pages/loadable";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public route */}
              <Route path="/login" element={<LoginPage />} />

              {/* Protected routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={routePermissions['/']}>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="profile" element={<ProfilePage />} />
                
                {/* Danh mục */}
                <Route path="danh-muc">
                  <Route
                    path="tai-khoan"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/danh-muc/tai-khoan']}>
                        <TaiKhoanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="doi-tuong"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/danh-muc/doi-tuong']}>
                        <DoiTuongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="du-an" element={<DuAnPage />} />
                  <Route path="san-pham" element={<SanPhamPage />} />
                  <Route path="bo-phan" element={<BoPhanPage />} />
                  <Route path="khoan-muc" element={<KhoanMucPage />} />
                  <Route path="ngan-hang" element={<NganHangPage />} />
                  <Route path="dong-tien" element={<DongTienPage />} />
                  <Route path="chu-dau-tu" element={<ChuDauTuPage />} />
                  <Route path="nhom-khuyen-mai" element={<NhomKhuyenMaiPage />} />
                  <Route path="nhom-quan-ly" element={<NhomQuanLyPage />} />
                  <Route path="loai-chung-tu" element={<LoaiChungTuPage />} />
                  <Route path="nhom-khoan-muc" element={<NhomKhoanMucPage />} />
                  <Route path="loai-giao-dich" element={<LoaiGiaoDichPage />} />
                  <Route path="hop-dong" element={<HopDongPage />} />
                  <Route
                    path="quy-chuan"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/danh-muc/quy-chuan']}>
                        <QuyChaunPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Coming Soon */}
                  <Route path="kho" element={<ComingSoonPage />} />
                </Route>

                {/* Chứng từ */}
                <Route path="chung-tu">
                  <Route
                    path="phieu-thu"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/chung-tu/phieu-thu']}>
                        <PhieuThuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="phieu-chi"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/chung-tu/phieu-chi']}>
                        <PhieuChiPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/chung-tu/nhat-ky-chung']}>
                        <NhatKyChungPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung/tao-moi"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/chung-tu/nhat-ky-chung']}>
                        <NhatKyChungFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung/:soPhieu/sua"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/chung-tu/nhat-ky-chung']}>
                        <NhatKyChungFormPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Coming Soon */}
                  <Route path="phieu-nhap" element={<ComingSoonPage />} />
                  <Route path="phieu-xuat" element={<ComingSoonPage />} />
                  <Route path="phieu-luong" element={<ComingSoonPage />} />
                  <Route path="bang-tinh-luong" element={<ComingSoonPage />} />
                  <Route path="bang-cham-cong" element={<ComingSoonPage />} />
                  <Route path="cham-cong-lam-them" element={<ComingSoonPage />} />
                  <Route path="phan-bo-khau-hao" element={<ComingSoonPage />} />
                  <Route path="phieu-ke-toan" element={<ComingSoonPage />} />
                  <Route path="de-nghi-thanh-toan" element={<ComingSoonPage />} />
                </Route>

                {/* Sổ quỹ */}
                <Route
                  path="so-quy"
                  element={
                    <ProtectedRoute allowedRoles={routePermissions['/so-quy']}>
                      <SoQuyPage />
                    </ProtectedRoute>
                  }
                />

                {/* Công nợ */}
                <Route path="cong-no">
                  <Route
                    path="phai-thu"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/cong-no/phai-thu']}>
                        <CongNoPhaiThuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="phai-tra"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/cong-no/phai-tra']}>
                        <CongNoPhaiTraPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Báo cáo */}
                <Route path="bao-cao">
                  <Route
                    path="pnl"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/bao-cao/pnl']}>
                        <PnLPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="so-cai"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/bao-cao/so-cai']}>
                        <SoCaiPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bang-can-doi"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/bao-cao/bang-can-doi']}>
                        <BangCanDoiPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Coming Soon */}
                  <Route path="tai-chinh" element={<ComingSoonPage />} />
                  <Route path="so-chi-tiet-tai-khoan" element={<ComingSoonPage />} />
                  <Route path="so-chi-tiet-cong-no" element={<ComingSoonPage />} />
                  <Route path="so-chi-tiet-phat-sinh" element={<ComingSoonPage />} />
                  <Route path="bang-tong-hop" element={<ComingSoonPage />} />
                </Route>

                {/* Phân tích - Coming Soon */}
                <Route path="phan-tich">
                  <Route path="bao-cao-tai-chinh" element={<ComingSoonPage />} />
                  <Route path="ban-hang" element={<ComingSoonPage />} />
                  <Route path="mua-hang" element={<ComingSoonPage />} />
                  <Route path="cong-no" element={<ComingSoonPage />} />
                  <Route path="dong-tien" element={<ComingSoonPage />} />
                  <Route path="ton-kho" element={<ComingSoonPage />} />
                  <Route path="thanh-khoan" element={<ComingSoonPage />} />
                </Route>

                {/* Trung tâm dữ liệu - Coming Soon */}
                <Route path="trung-tam-du-lieu">
                  <Route path="ke-hoach" element={<ComingSoonPage />} />
                  <Route path="du-bao" element={<ComingSoonPage />} />
                  <Route path="tai-san" element={<ComingSoonPage />} />
                  <Route path="hang-hoa" element={<ComingSoonPage />} />
                  <Route path="nguyen-lieu" element={<ComingSoonPage />} />
                  <Route path="dung-cu" element={<ComingSoonPage />} />
                  <Route path="hop-dong" element={<ComingSoonPage />} />
                  <Route path="nhan-su" element={<ComingSoonPage />} />
                  <Route path="luong-bhxh" element={<ComingSoonPage />} />
                </Route>

                {/* Thư viện - Coming Soon */}
                <Route path="quy-trinh" element={<ComingSoonPage />} />
                <Route path="chinh-sach" element={<ComingSoonPage />} />
                <Route path="bieu-mau" element={<ComingSoonPage />} />
                <Route path="huong-dan" element={<ComingSoonPage />} />

                {/* Cấu hình */}
                <Route path="cau-hinh">
                  <Route
                    path="phan-quyen"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/cau-hinh/phan-quyen']}>
                        <PhanQuyenPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="tenant"
                    element={<TenantPage />}
                  />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;