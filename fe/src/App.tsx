import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

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
  SoDuDauKyPage,
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
  SoChiTietTaiKhoanPage,
  BangCanDoiPage,
  BangTongHopCongNoPage,
  BaoCaoTaiChinhPage,

  QuyChaunPage,
  PhanQuyenPage,
  VaiTroPage,
  ThanhVienPage,
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
                  <ProtectedRoute>
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
                      <ProtectedRoute requiredPermission="/danh-muc/tai-khoan:xem">
                        <TaiKhoanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="doi-tuong"
                    element={
                      <ProtectedRoute requiredPermission="/danh-muc/doi-tuong:xem">
                        <DoiTuongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="du-an" element={
                    <ProtectedRoute requiredPermission="/danh-muc/du-an:xem">
                      <DuAnPage />
                    </ProtectedRoute>
                  } />
                  <Route path="san-pham" element={
                    <ProtectedRoute requiredPermission="/danh-muc/san-pham:xem">
                      <SanPhamPage />
                    </ProtectedRoute>
                  } />
                  <Route path="bo-phan" element={
                    <ProtectedRoute requiredPermission="/danh-muc/bo-phan:xem">
                      <BoPhanPage />
                    </ProtectedRoute>
                  } />
                  <Route path="khoan-muc" element={
                    <ProtectedRoute requiredPermission="/danh-muc/khoan-muc:xem">
                      <KhoanMucPage />
                    </ProtectedRoute>
                  } />
                  <Route path="so-du-dau-ky" element={
                    <ProtectedRoute requiredPermission="/danh-muc/so-du-dau-ky:xem">
                      <SoDuDauKyPage />
                    </ProtectedRoute>
                  } />
                  <Route path="ngan-hang" element={
                    <ProtectedRoute requiredPermission="/danh-muc/ngan-hang:xem">
                      <NganHangPage />
                    </ProtectedRoute>
                  } />
                  <Route path="dong-tien" element={
                    <ProtectedRoute requiredPermission="/danh-muc/dong-tien:xem">
                      <DongTienPage />
                    </ProtectedRoute>
                  } />
                  <Route path="chu-dau-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/chu-dau-tu:xem">
                      <ChuDauTuPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-khuyen-mai" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-khuyen-mai:xem">
                      <NhomKhuyenMaiPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-quan-ly" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-quan-ly:xem">
                      <NhomQuanLyPage />
                    </ProtectedRoute>
                  } />
                  <Route path="loai-chung-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/loai-chung-tu:xem">
                      <LoaiChungTuPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-khoan-muc" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-khoan-muc:xem">
                      <NhomKhoanMucPage />
                    </ProtectedRoute>
                  } />
                  <Route path="loai-giao-dich" element={
                    <ProtectedRoute requiredPermission="/danh-muc/loai-giao-dich:xem">
                      <LoaiGiaoDichPage />
                    </ProtectedRoute>
                  } />
                  <Route path="hop-dong" element={
                    <ProtectedRoute requiredPermission="/danh-muc/hop-dong:xem">
                      <HopDongPage />
                    </ProtectedRoute>
                  } />
                  <Route
                    path="quy-chuan"
                    element={
                      <ProtectedRoute requiredPermission="/danh-muc/quy-chuan:xem">
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
                      <ProtectedRoute requiredPermission="/chung-tu/phieu-thu:xem">
                        <PhieuThuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="phieu-chi"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/phieu-chi:xem">
                        <PhieuChiPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/nhat-ky-chung:xem">
                        <NhatKyChungPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung/tao-moi"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/nhat-ky-chung:xem">
                        <NhatKyChungFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="nhat-ky-chung/:soPhieu/sua"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/nhat-ky-chung:xem">
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
                    <ProtectedRoute requiredPermission="/so-quy:xem">
                      <SoQuyPage />
                    </ProtectedRoute>
                  }
                />

                {/* Công nợ */}
                <Route path="cong-no">
                  <Route
                    path="phai-thu"
                    element={
                      <ProtectedRoute requiredPermission="/cong-no/phai-thu:xem">
                        <CongNoPhaiThuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="phai-tra"
                    element={
                      <ProtectedRoute requiredPermission="/cong-no/phai-tra:xem">
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
                      <ProtectedRoute requiredPermission="/bao-cao/pnl:xem">
                        <PnLPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="so-cai"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/so-cai:xem">
                        <SoCaiPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bang-can-doi"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/bang-can-doi:xem">
                        <BangCanDoiPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Coming Soon */}
                  <Route
                    path="tai-chinh"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/tai-chinh:xem">
                        <BaoCaoTaiChinhPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="so-chi-tiet-tai-khoan"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/so-chi-tiet-tai-khoan:xem">
                        <SoChiTietTaiKhoanPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="so-chi-tiet-cong-no" element={<ComingSoonPage />} />
                  <Route path="so-chi-tiet-phat-sinh" element={<ComingSoonPage />} />
                  <Route
                    path="bang-tong-hop"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/bang-tong-hop:xem">
                        <BangTongHopCongNoPage />
                      </ProtectedRoute>
                    }
                  />
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
                      <ProtectedRoute requiredPermission="/cau-hinh/phan-quyen:xem">
                        <PhanQuyenPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="vai-tro"
                    element={
                      <ProtectedRoute requiredPermission="/cau-hinh/vai-tro:xem">
                        <VaiTroPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="thanh-vien"
                    element={
                      <ProtectedRoute requiredPermission="/cau-hinh/thanh-vien:xem">
                        <ThanhVienPage />
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