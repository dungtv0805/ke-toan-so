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
                  <Route
                    path="quy-chuan"
                    element={
                      <ProtectedRoute allowedRoles={routePermissions['/danh-muc/quy-chuan']}>
                        <QuyChaunPage />
                      </ProtectedRoute>
                    }
                  />
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
                </Route>

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