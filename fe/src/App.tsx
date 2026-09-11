import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';

import { AuthProvider } from "./contexts/AuthContext";
import { TermProvider } from "./contexts/TermContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

import MainLayout from "./components/layout/MainLayout";
import InstallPWA from "./components/shared/InstallPWA";
import PWAUpdatePrompt from "./components/shared/PWAUpdatePrompt";
import {
  LoginPage,
  Dashboard,
  ProfilePage,
  DanhMucIndexPage,
  TaiKhoanPage,
  DoiTuongPage,
  SanPhamPage,
  DinhMucTienAnPage,
  CongThucDinhLuongPage,
  DiemDanhAnPage,
  DeXuatMuaPage,
  KiemSoatChiPhiPage,
  NhapKhoPage,
  XuatKhoPage,
  ChuyenKhoPage,
  DuAnPage,
  BoPhanPage,
  KhoanMucPage,
  SoDuDauKyPage,
  NganHangPage,
  DongTienPage,
  NhomDongTienPage,
  TaiKhoanKetChuyenPage,
  ChuDauTuPage,
  NhomKhuyenMaiPage,
  NhomQuanLyPage,
  LoaiChungTuPage,
  NhomKhoanMucPage,
  LoaiGiaoDichPage,
  HopDongPage,
  KhoPage,
  DonViTinhPage,
  LyDoKhongHopLePage,
  NhomVatTuPage,
  NhomSanPhamPage,
  HangHoaVatTuPage,
  PhieuThuPage,
  PhieuChiPage,
  NhatKyChungPage,
  KeHoachTabsPage,
  KeHoachFormPage,
  NhatKyChungFormPage,
  KetChuyenLaiLoListPage,
  KetChuyenLaiLoFormPage,
  SoQuyPage,
  CongNoPhaiThuPage,
  CongNoPhaiTraPage,
  PnLPage,
  SoCaiPage,
  SoChiTietTaiKhoanPage,
  BangCanDoiPage,
  BangTongHopCongNoPage,
  BaoCaoTaiChinhPage,

  QuyTrinhPage,
  TaiLieuPhanHePage,
  BieuMauPage,
  ChinhSachPage,
  HuongDanPage,
  QuyChaunPage,
  HoSoChungTuPage,
  PhanQuyenPage,
  VaiTroPage,
  ThanhVienPage,
  TenantPage,
  LinhVucPage,
  SaoChepDanhMucPage,
  ComingSoonPage,
  QuanLyHopDongPage,
  BaoCaoHopDongPage,
  BaoCaoDoanhThuPage,
  PnlKhongKhauHaoPage,
  Pnl3LopPage,
  SoThuTienPage,
  SoHoaDonBanRaPage,
  BangKeMuaVaoPage,
  BangKeBanRaPage,
  TongHopThuePage,
  BaoCaoTNDNPage,
  NotFound
} from "./pages/loadable";
import ThueIndexRoute from "./pages/thue/ThueIndexRoute";

const queryClient = new QueryClient();

/**
 * Thư viện Quy trình / Hướng dẫn RIÊNG của từng phân hệ (menuCatalog cờ
 * `thuVien`). `key` bắt buộc: hai route cùng render một component ở cùng chỗ
 * trong cây, không có key thì React giữ nguyên instance khi chuyển
 * /kho/quy-trinh → /thue/quy-trinh (bộ lọc, cột ghim của bảng trước còn dính).
 */
const thuVien = (duongDan: string) => (
  <ProtectedRoute requiredPermission={`${duongDan}:xem`}>
    <TaiLieuPhanHePage key={duongDan} duongDan={duongDan} />
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          // Màu thương hiệu MasterCEO — giữ nguyên.
          colorPrimary: '#1f7769',
          // Inter (nạp ở đầu index.css). antd tự đặt font-family hệ thống lên mọi
          // component, nên khai ở body là CHƯA đủ — thiếu dòng này thì Inter được
          // tải về mà không chỗ nào dùng. Inter đo hẹp hơn SF/Segoe ở 8.5–11px
          // nên nhãn rail và cột bảng không bị cắt thêm.
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          // Bo góc theo 07-design-system: nút/ô nhập 7 · thẻ/bảng 9 · nhỏ 6.
          borderRadius: 7,
          borderRadiusLG: 9,
          borderRadiusSM: 6,
          borderRadiusXS: 4,
          // Mật độ cao: nội dung bảng 11px.
          fontSize: 11,
          // antd suy cả thang chữ từ fontSize, nên base 11 kéo fontSizeSM
          // xuống 10 (mặc định 12) — cỡ chữ của Tag/Badge, và fontSizeIcon
          // (= fontSizeSM) xuống 10. Tiếng Việt có dấu ở 10px khó đọc, nên
          // ghim lại 11. Các cỡ khác bị kéo theo nhưng vẫn giữ đúng thứ tự
          // và vẫn đọc được (fontSizeLG 12 · Heading5 12 · Heading4 16),
          // nên để nguyên.
          fontSizeSM: 11,
          // Chiều cao control giữ như đợt trước.
          controlHeight: 28,
          controlHeightSM: 24,
          controlHeightLG: 36,
          colorBorder: '#E5E5EA',
          colorText: '#1D1D1F',
          colorTextSecondary: '#6E6E73',
          // antd map colorTextTertiary sang colorIcon (và colorTextDescription),
          // nên nó là màu của icon x-xoá, mũi tên Select, nút đóng Modal, phễu
          // lọc bảng. #98989D chỉ cho 2.87:1 trên nền trắng — dưới ngưỡng 3:1
          // của thành phần phi văn bản. #8A8A8F cho 3.44:1 trên #FFFFFF và
          // 3.16:1 trên nền trang #F5F5F7.
          colorTextTertiary: '#8A8A8F',
          colorBgLayout: '#F5F5F7',
        },
        components: {
          // Card header + body padding 12px đồng bộ nhịp 12
          // (var --ant-card-header-padding / --ant-card-body-padding).
          Card: { headerPadding: 12, bodyPadding: 12, borderRadiusLG: 9 },
          Modal: { borderRadiusLG: 14 },
          Table: { borderRadius: 9, headerBorderRadius: 9, cellPaddingBlockSM: 3 },
        },
      }}
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <PWAUpdatePrompt />
        <InstallPWA />
        <BrowserRouter>
          <AuthProvider>
            <TermProvider>
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
                  {/* Trang tổng hợp toàn màn hình — tự lọc link theo quyền/lĩnh vực */}
                  <Route index element={<DanhMucIndexPage />} />
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
                  <Route path="nhom-dong-tien" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-dong-tien:xem">
                      <NhomDongTienPage />
                    </ProtectedRoute>
                  } />
                  <Route path="tai-khoan-ket-chuyen" element={
                    <ProtectedRoute requiredPermission="/danh-muc/tai-khoan-ket-chuyen:xem">
                      <TaiKhoanKetChuyenPage />
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
                  <Route path="ho-so-chung-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/ho-so-chung-tu:xem">
                      <HoSoChungTuPage />
                    </ProtectedRoute>
                  } />
                  <Route path="kho" element={
                    <ProtectedRoute requiredPermission="/danh-muc/kho:xem">
                      <KhoPage />
                    </ProtectedRoute>
                  } />
                  <Route path="don-vi-tinh" element={
                    <ProtectedRoute requiredPermission="/danh-muc/don-vi-tinh:xem">
                      <DonViTinhPage />
                    </ProtectedRoute>
                  } />
                  <Route path="ly-do-khong-hop-le" element={
                    <ProtectedRoute requiredPermission="/danh-muc/ly-do-khong-hop-le:xem">
                      <LyDoKhongHopLePage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-vat-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-vat-tu:xem">
                      <NhomVatTuPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhom-san-pham" element={
                    <ProtectedRoute requiredPermission="/danh-muc/nhom-san-pham:xem">
                      <NhomSanPhamPage />
                    </ProtectedRoute>
                  } />
                  <Route path="hang-hoa-vat-tu" element={
                    <ProtectedRoute requiredPermission="/danh-muc/hang-hoa-vat-tu:xem">
                      <HangHoaVatTuPage />
                    </ProtectedRoute>
                  } />
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
                  <Route
                    path="nhat-ky-chung/:soPhieu/nhan-ban"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/nhat-ky-chung:xem">
                        <NhatKyChungFormPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="ket-chuyen-lai-lo"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/ket-chuyen-lai-lo:xem">
                        <KetChuyenLaiLoListPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="ket-chuyen-lai-lo/tao-moi"
                    element={
                      <ProtectedRoute requiredPermission="/chung-tu/ket-chuyen-lai-lo:xem">
                        <KetChuyenLaiLoFormPage />
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

                {/* Bếp ăn */}
                <Route path="bep-an">
                  <Route
                    path="dinh-muc-tien-an"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/dinh-muc-tien-an:xem">
                        <DinhMucTienAnPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="cong-thuc-dinh-luong"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/cong-thuc-dinh-luong:xem">
                        <CongThucDinhLuongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="diem-danh-an"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/diem-danh-an:xem">
                        <DiemDanhAnPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="de-xuat-mua"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/de-xuat-mua:xem">
                        <DeXuatMuaPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="kiem-soat-chi-phi"
                    element={
                      <ProtectedRoute requiredPermission="/bep-an/kiem-soat-chi-phi:xem">
                        <KiemSoatChiPhiPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Kho */}
                <Route path="kho">
                  <Route
                    path="nhap-kho"
                    element={
                      <ProtectedRoute requiredPermission="/kho/nhap-kho:xem">
                        <NhapKhoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="xuat-kho"
                    element={
                      <ProtectedRoute requiredPermission="/kho/xuat-kho:xem">
                        <XuatKhoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="chuyen-kho"
                    element={
                      <ProtectedRoute requiredPermission="/kho/chuyen-kho:xem">
                        <ChuyenKhoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="quy-trinh" element={thuVien("/kho/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/kho/huong-dan")} />
                  <Route path="ke-hoach" element={<ComingSoonPage />} />
                  <Route path="du-bao" element={<ComingSoonPage />} />
                  <Route path="bao-cao" element={<ComingSoonPage />} />
                  {/* Kiểm kê kho — mới có mục trên thanh ngang, chức năng làm sau */}
                  <Route path="kiem-ke" element={<ComingSoonPage />} />
                  <Route path="tinh-gia-xuat" element={<ComingSoonPage />} />
                  <Route path="tong-hop-xuat" element={<ComingSoonPage />} />
                  <Route path="nhap-xuat-ton" element={<ComingSoonPage />} />
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
                  <Route
                    path="bang-tong-hop"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/bang-tong-hop:xem">
                        <BangTongHopCongNoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="hop-dong"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/hop-dong:xem">
                        <BaoCaoHopDongPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="doanh-thu"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/doanh-thu:xem">
                        <BaoCaoDoanhThuPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="pnl-khong-khau-hao"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/pnl-khong-khau-hao:xem">
                        <PnlKhongKhauHaoPage />
                      </ProtectedRoute>
                    }
                  />
                  {/* Bảng so sánh 3 lớp KH-DB-TH: là BÁO CÁO, không phải tab
                      trong trang Kế hoạch/Dự báo. */}
                  <Route
                    path="pnl-3-lop"
                    element={
                      <ProtectedRoute requiredPermission="/bao-cao/pnl-3-lop:xem">
                        <Pnl3LopPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Thuế */}
                <Route path="thue">
                  {/* Sidebar chỉ còn 1 mục "Thuế" → /thue tự đưa vào trang con. */}
                  <Route index element={<ThueIndexRoute />} />
                  <Route path="quy-trinh" element={thuVien("/thue/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/thue/huong-dan")} />
                  <Route path="ke-hoach" element={<ComingSoonPage />} />
                  <Route path="du-bao" element={<ComingSoonPage />} />
                  <Route
                    path="bang-ke-mua-vao"
                    element={
                      <ProtectedRoute requiredPermission="/thue/bang-ke-mua-vao:xem">
                        <BangKeMuaVaoPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bang-ke-ban-ra"
                    element={
                      <ProtectedRoute requiredPermission="/thue/bang-ke-ban-ra:xem">
                        <BangKeBanRaPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="tong-hop"
                    element={
                      <ProtectedRoute requiredPermission="/thue/tong-hop:xem">
                        <TongHopThuePage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="bao-cao-tndn"
                    element={
                      <ProtectedRoute requiredPermission="/thue/bao-cao-tndn:xem">
                        <BaoCaoTNDNPage />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Phân tích - Coming Soon */}
                <Route path="phan-tich">
                  <Route path="cong-no" element={<ComingSoonPage />} />
                  <Route path="dong-tien" element={<ComingSoonPage />} />
                  <Route path="ton-kho" element={<ComingSoonPage />} />
                  <Route path="thanh-khoan" element={<ComingSoonPage />} />
                  <Route path="chi-so-tai-chinh" element={<ComingSoonPage />} />
                </Route>

                {/* Trung tâm dữ liệu - Coming Soon */}
                <Route path="trung-tam-du-lieu">
                  <Route
                    path="ke-hoach"
                    element={
                      <ProtectedRoute requiredPermission="/trung-tam-du-lieu/ke-hoach:xem">
                        <KeHoachTabsPage loaiKeHoach="KE_HOACH" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="ke-hoach/tao-moi"
                    element={
                      <ProtectedRoute requiredPermission="/trung-tam-du-lieu/ke-hoach:xem">
                        <KeHoachFormPage loaiKeHoach="KE_HOACH" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="du-bao"
                    element={
                      <ProtectedRoute requiredPermission="/trung-tam-du-lieu/du-bao:xem">
                        <KeHoachTabsPage loaiKeHoach="DU_BAO" />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="du-bao/tao-moi"
                    element={
                      <ProtectedRoute requiredPermission="/trung-tam-du-lieu/du-bao:xem">
                        <KeHoachFormPage loaiKeHoach="DU_BAO" />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="tai-san" element={<ComingSoonPage />} />
                  <Route path="dung-cu" element={<ComingSoonPage />} />
                  <Route path="hop-dong" element={
                    <ProtectedRoute requiredPermission="/trung-tam-du-lieu/hop-dong:xem">
                      <QuanLyHopDongPage />
                    </ProtectedRoute>
                  } />
                  <Route path="thu-tien-hop-dong" element={
                    <ProtectedRoute requiredPermission="/trung-tam-du-lieu/thu-tien-hop-dong:xem">
                      <SoThuTienPage />
                    </ProtectedRoute>
                  } />
                  <Route path="hd-ban-ra" element={
                    <ProtectedRoute requiredPermission="/trung-tam-du-lieu/hd-ban-ra:xem">
                      <SoHoaDonBanRaPage />
                    </ProtectedRoute>
                  } />
                  <Route path="nhan-su" element={<ComingSoonPage />} />
                  <Route path="luong-bhxh" element={<ComingSoonPage />} />
                </Route>

                {/* Thư viện */}
                <Route
                  path="quy-trinh"
                  element={
                    <ProtectedRoute requiredPermission="/quy-trinh:xem">
                      <QuyTrinhPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="chinh-sach"
                  element={
                    <ProtectedRoute requiredPermission="/chinh-sach:xem">
                      <ChinhSachPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="bieu-mau"
                  element={
                    <ProtectedRoute requiredPermission="/bieu-mau:xem">
                      <BieuMauPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="huong-dan"
                  element={
                    <ProtectedRoute requiredPermission="/huong-dan:xem">
                      <HuongDanPage />
                    </ProtectedRoute>
                  }
                />

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
                  <Route
                    path="linh-vuc"
                    element={<LinhVucPage />}
                  />
                  <Route
                    path="sao-chep-danh-muc"
                    element={<SaoChepDanhMucPage />}
                  />
                </Route>

                {/* Mục đã lên sidebar nhưng chưa có màn hình — ra thẳng trang "đang phát triển".
                    Danh sách sinh từ menuCatalog; thêm mục soon mới thì thêm một dòng ở đây.
                    Quy trình / Hướng dẫn mỗi phân hệ là trang THẬT (thư viện riêng). */}
                <Route path="tong-hop">
                  <Route path="quy-trinh" element={thuVien("/tong-hop/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/tong-hop/huong-dan")} />
                  <Route path="quyet-toan-tam-ung" element={<ComingSoonPage />} />
                  <Route path="bu-tru-cong-no" element={<ComingSoonPage />} />
                  <Route path="khoa-so" element={<ComingSoonPage />} />
                  <Route path="so-nhat-ky-chung" element={<ComingSoonPage />} />
                </Route>
                <Route path="bao-cao/tai-chinh/luu-chuyen-tien-te" element={<ComingSoonPage />} />
                <Route path="bao-cao/tai-chinh/thuyet-minh" element={<ComingSoonPage />} />
                <Route path="von-dong-tien">
                  <Route path="quy-trinh" element={thuVien("/von-dong-tien/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/von-dong-tien/huong-dan")} />
                  <Route path="bao-cao" element={<ComingSoonPage />} />
                  <Route path="kiem-ke" element={<ComingSoonPage />} />
                  <Route path="vay" element={<ComingSoonPage />} />
                  <Route path="von" element={<ComingSoonPage />} />
                </Route>
                <Route path="mua-hang">
                  <Route path="quy-trinh" element={thuVien("/mua-hang/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/mua-hang/huong-dan")} />
                  <Route path="ke-hoach" element={<ComingSoonPage />} />
                  <Route path="du-bao" element={<ComingSoonPage />} />
                  <Route path="hop-dong" element={<ComingSoonPage />} />
                  <Route path="mua-hang" element={<ComingSoonPage />} />
                  <Route path="so-chi-tiet" element={<ComingSoonPage />} />
                  <Route path="tong-hop" element={<ComingSoonPage />} />
                  <Route path="bao-cao" element={<ComingSoonPage />} />
                </Route>
                <Route path="ban-hang">
                  <Route path="quy-trinh" element={thuVien("/ban-hang/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/ban-hang/huong-dan")} />
                  <Route path="so-chi-tiet" element={<ComingSoonPage />} />
                  <Route path="tong-hop" element={<ComingSoonPage />} />
                </Route>
                <Route path="tien-luong">
                  <Route path="quy-trinh" element={thuVien("/tien-luong/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/tien-luong/huong-dan")} />
                  <Route path="bao-cao" element={<ComingSoonPage />} />
                  <Route path="cham-cong" element={<ComingSoonPage />} />
                  <Route path="tinh-luong" element={<ComingSoonPage />} />
                  <Route path="tra-luong" element={<ComingSoonPage />} />
                  <Route path="hach-toan" element={<ComingSoonPage />} />
                  <Route path="bhxh" element={<ComingSoonPage />} />
                  <Route path="thue-tncn" element={<ComingSoonPage />} />
                </Route>
                <Route path="tai-san">
                  <Route path="quy-trinh" element={thuVien("/tai-san/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/tai-san/huong-dan")} />
                  <Route path="bao-cao" element={<ComingSoonPage />} />
                  <Route path="phan-bo-khau-hao" element={<ComingSoonPage />} />
                  <Route path="khau-hao" element={<ComingSoonPage />} />
                  <Route path="dieu-chuyen" element={<ComingSoonPage />} />
                </Route>
                <Route path="ccdc">
                  <Route path="quy-trinh" element={thuVien("/ccdc/quy-trinh")} />
                  <Route path="huong-dan" element={thuVien("/ccdc/huong-dan")} />
                  <Route path="ke-hoach" element={<ComingSoonPage />} />
                  <Route path="du-bao" element={<ComingSoonPage />} />
                  <Route path="bao-cao" element={<ComingSoonPage />} />
                  <Route path="phan-bo" element={<ComingSoonPage />} />
                  <Route path="dieu-chuyen" element={<ComingSoonPage />} />
                </Route>
                <Route path="cong-yeu-cau">
                  <Route path="thanh-toan" element={<ComingSoonPage />} />
                  <Route path="xuat-hoa-don" element={<ComingSoonPage />} />
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
                </Routes>
            </TermProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ConfigProvider>
  </QueryClientProvider>
);

export default App;