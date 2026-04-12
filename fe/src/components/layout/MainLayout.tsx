import React, { useState, useEffect, useRef } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Tooltip,
  Tag,
  message,
  Drawer,
} from "antd";
import {
  DashboardOutlined,
  BookOutlined,
  FileTextOutlined,
  WalletOutlined,
  TeamOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  DollarOutlined,
  AuditOutlined,
  QuestionCircleOutlined,
  MenuOutlined,
  CloseOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
  SwapOutlined,
  LineChartOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  StockOutlined,
  CalculatorOutlined,
  CarOutlined,
  ToolOutlined,
  ContainerOutlined,
  SolutionOutlined,
  InsuranceOutlined,
  FormOutlined,
  FileProtectOutlined,
  DatabaseOutlined,
  ScheduleOutlined,
  RiseOutlined,
  InboxOutlined,
  ReconciliationOutlined,
  ProfileOutlined,
  FileDoneOutlined,
  TableOutlined,
  ClockCircleOutlined,
  FieldTimeOutlined,
  PartitionOutlined,
  CreditCardOutlined,
  FileSearchOutlined,
  AccountBookOutlined,
  PieChartOutlined,
  SnippetsOutlined,
  NodeIndexOutlined,
  FileAddOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import type { MenuProps } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { vaiTroOptions } from "@/mock-data/nguoi-dung";
import { TenantSwitcher } from "./TenantSwitcher";
import { routePermissions } from "@/config/routePermissions";
import { VaiTro } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

// Danh sách các routes đã có component
const existingRoutes = new Set([
  "/",
  "/profile",
  "/danh-muc/tai-khoan",
  "/danh-muc/doi-tuong",
  "/danh-muc/du-an",
  "/danh-muc/san-pham",
  "/danh-muc/bo-phan",
  "/danh-muc/khoan-muc",
  "/danh-muc/ngan-hang",
  "/danh-muc/dong-tien",
  "/danh-muc/chu-dau-tu",
  "/danh-muc/nhom-khuyen-mai",
  "/danh-muc/nhom-quan-ly",
  "/danh-muc/loai-chung-tu",
  "/danh-muc/nhom-khoan-muc",
  "/danh-muc/loai-giao-dich",
  "/danh-muc/hop-dong",
  "/danh-muc/quy-chuan",
  "/chung-tu/nhat-ky-chung",
  "/so-quy",
  "/cong-no/phai-thu",
  "/cong-no/phai-tra",
  "/bao-cao/tai-chinh",
  "/bao-cao/pnl",
  "/bao-cao/so-cai",
  "/bao-cao/bang-can-doi",
  "/bao-cao/kqkd",
  "/cau-hinh/phan-quyen",
]);

// Helper để tạo label với badge "Sắp ra mắt"
const createLabel = (text: string, path: string) => {
  const isComingSoon = !existingRoutes.has(path);
  if (isComingSoon) {
    return (
      <span className="menu-coming-soon" title={`${text} - Sắp ra mắt`}>
        <span className="menu-text">{text}</span>
        <span className="coming-soon-dot" />
      </span>
    );
  }
  return text;
};

function getItem(
  label: React.ReactNode,
  key: string,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: "group"
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem;
}

// Helper để tạo menu item với check coming soon
function getMenuItem(
  text: string,
  path: string,
  icon?: React.ReactNode,
  children?: MenuItem[]
): MenuItem {
  const isComingSoon = !existingRoutes.has(path) && !children;
  return {
    key: path,
    icon,
    children,
    label: createLabel(text, path),
    className: isComingSoon ? "menu-item-coming-soon" : undefined,
  } as MenuItem;
}

// ===== ĐIỀU HÀNH =====
const dieuHanhMenuItems: MenuItem[] = [
  getMenuItem("Tổng quan", "/", <DashboardOutlined />),

  getItem("Phân tích", "/phan-tich", <LineChartOutlined />, [
    getMenuItem("Kế toán", "/phan-tich/bao-cao-tai-chinh", <PieChartOutlined />),
    getMenuItem("Bán hàng", "/phan-tich/ban-hang", <ShoppingCartOutlined />),
    getMenuItem("Mua hàng", "/phan-tich/mua-hang", <ShoppingOutlined />),
    getMenuItem("Công nợ", "/phan-tich/cong-no", <ReconciliationOutlined />),
    getMenuItem("Dòng tiền", "/phan-tich/dong-tien", <DollarOutlined />),
    getMenuItem("Tồn kho", "/phan-tich/ton-kho", <InboxOutlined />),
    getMenuItem("Khả năng thanh khoản", "/phan-tich/thanh-khoan", <StockOutlined />),
  ]),
];

// ===== KẾ TOÁN =====
const keToAnMenuItems: MenuItem[] = [
  getItem("Báo cáo", "/bao-cao", <BarChartOutlined />, [
    getMenuItem("Báo cáo tài chính", "/bao-cao/tai-chinh", <PieChartOutlined />),
    getMenuItem("Kết quả kinh doanh", "/bao-cao/kqkd", <BarChartOutlined />),
    getMenuItem("Sổ chi tiết tài khoản", "/bao-cao/so-chi-tiet-tai-khoan", <AccountBookOutlined />),
    getMenuItem("Sổ chi tiết công nợ", "/bao-cao/so-chi-tiet-cong-no", <FileSearchOutlined />),
    getMenuItem("Sổ chi tiết phát sinh", "/bao-cao/so-chi-tiet-phat-sinh", <ProfileOutlined />),
    getMenuItem("Bảng tổng hợp", "/bao-cao/bang-tong-hop", <TableOutlined />),
  ]),

  getItem("Trung tâm dữ liệu", "/trung-tam-du-lieu", <DatabaseOutlined />, [
    getMenuItem("Kế hoạch", "/trung-tam-du-lieu/ke-hoach", <ScheduleOutlined />),
    getMenuItem("Dự báo", "/trung-tam-du-lieu/du-bao", <RiseOutlined />),
    getMenuItem("Dữ liệu tổng hợp", "/chung-tu/nhat-ky-chung", <AuditOutlined />),
    getMenuItem("Quản lý Tài sản", "/trung-tam-du-lieu/tai-san", <CarOutlined />),
    getMenuItem("Quản lý Hàng hóa", "/trung-tam-du-lieu/hang-hoa", <AppstoreOutlined />),
    getMenuItem("Quản lý Nguyên liệu", "/trung-tam-du-lieu/nguyen-lieu", <ContainerOutlined />),
    getMenuItem("Quản lý Dụng cụ", "/trung-tam-du-lieu/dung-cu", <ToolOutlined />),
    getMenuItem("Quản lý Hợp đồng", "/trung-tam-du-lieu/hop-dong", <FileProtectOutlined />),
    getMenuItem("Quản lý nhân sự", "/trung-tam-du-lieu/nhan-su", <SolutionOutlined />),
    getMenuItem("Lương & BHXH", "/trung-tam-du-lieu/luong-bhxh", <InsuranceOutlined />),
  ]),

  getItem("Chứng từ", "/chung-tu", <FileTextOutlined />, [
    getMenuItem("Phiếu thu", "/chung-tu/phieu-thu", <CreditCardOutlined />),
    getMenuItem("Phiếu chi", "/chung-tu/phieu-chi", <WalletOutlined />),
    getMenuItem("Phiếu nhập", "/chung-tu/phieu-nhap", <FileAddOutlined />),
    getMenuItem("Phiếu xuất", "/chung-tu/phieu-xuat", <FileDoneOutlined />),
    getMenuItem("Phiếu lương", "/chung-tu/phieu-luong", <SnippetsOutlined />),
    getMenuItem("Bảng tính lương", "/chung-tu/bang-tinh-luong", <CalculatorOutlined />),
    getMenuItem("Bảng chấm công", "/chung-tu/bang-cham-cong", <ClockCircleOutlined />),
    getMenuItem("Bảng chấm công làm thêm giờ", "/chung-tu/cham-cong-lam-them", <FieldTimeOutlined />),
    getMenuItem("Bảng phân bổ khấu hao TSCĐ", "/chung-tu/phan-bo-khau-hao", <PartitionOutlined />),
    getMenuItem("Phiếu kế toán", "/chung-tu/phieu-ke-toan", <AuditOutlined />),
    getMenuItem("Đề nghị thanh toán", "/chung-tu/de-nghi-thanh-toan", <FormOutlined />),
  ]),
];

// ===== THƯ VIỆN - Library menu =====
const thuVienMenuItems: MenuItem[] = [
  // Danh mục
  getItem("Danh mục", "/danh-muc", <BookOutlined />, [
    getMenuItem("Tài khoản", "/danh-muc/tai-khoan", <BankOutlined />),
    getMenuItem("Đối tượng", "/danh-muc/doi-tuong", <TeamOutlined />),
    getMenuItem("Dự án", "/danh-muc/du-an", <ProjectOutlined />),
    getMenuItem("Sản phẩm", "/danh-muc/san-pham", <AppstoreOutlined />),
    getMenuItem("Hợp đồng", "/danh-muc/hop-dong", <FileProtectOutlined />),
    getMenuItem("Bộ phận", "/danh-muc/bo-phan", <TeamOutlined />),
    getMenuItem("Khoản mục", "/danh-muc/khoan-muc", <DollarOutlined />),
    getMenuItem("Kho", "/danh-muc/kho", <InboxOutlined />),
    getItem("Khác", "/danh-muc/khac", <AppstoreOutlined />, [
      getMenuItem("Chủ đầu tư", "/danh-muc/chu-dau-tu", <UserOutlined />),
      getMenuItem("Nhóm khoản mục", "/danh-muc/nhom-khoan-muc", <TagOutlined />),
      getMenuItem("Ngân hàng & Quỹ", "/danh-muc/ngan-hang", <BankOutlined />),
      getMenuItem("Dòng tiền", "/danh-muc/dong-tien", <DollarOutlined />),
      getMenuItem("Nhóm khuyến mại", "/danh-muc/nhom-khuyen-mai", <AppstoreOutlined />),
      getMenuItem("Nhóm quản lý", "/danh-muc/nhom-quan-ly", <TeamOutlined />),
      getMenuItem("Loại chứng từ", "/danh-muc/loai-chung-tu", <FileTextOutlined />),
      getMenuItem("Loại giao dịch", "/danh-muc/loai-giao-dich", <SwapOutlined />),
      getMenuItem("Quy chuẩn hạch toán", "/danh-muc/quy-chuan", <AuditOutlined />),
    ]),
  ]),

  // Quy trình
  getMenuItem("Quy trình", "/quy-trinh", <NodeIndexOutlined />),

  // Chính sách
  getMenuItem("Chính sách", "/chinh-sach", <SafetyCertificateOutlined />),

  // Biểu mẫu
  getMenuItem("Biểu mẫu", "/bieu-mau", <FormOutlined />),

  // Hướng dẫn
  getMenuItem("Hướng dẫn", "/huong-dan", <QuestionCircleOutlined />),
];

// Helper function to check if current route is a form screen (create/edit)
const isFormScreen = (pathname: string): boolean => {
  return pathname.includes('/tao-moi') || pathname.includes('/sua');
};

const MainLayout: React.FC = () => {
  // Initialize collapsed based on current URL - if on form screen, start collapsed
  const [collapsed, setCollapsed] = useState(() => isFormScreen(window.location.pathname));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : false;
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, currentTenant } = useAuth();
  const currentRole = currentTenant?.role as VaiTro | undefined;
  const isSuperAdmin = user?.isSuperAdmin || false;
  const isMobile = useIsMobile();

  const roleInfo = currentRole ? vaiTroOptions.find((v) => v.value === currentRole) : null;

  // Filter menu items based on user role
  const canAccessRoute = (path: string, userRole: VaiTro): boolean => {
    // Super admin can access all routes
    if (isSuperAdmin) return true;
    const allowedRoles = routePermissions[path];
    if (!allowedRoles) return true; // No restriction defined = accessible
    return allowedRoles.includes(userRole);
  };

  const filterMenuItems = (items: MenuItem[], userRole: VaiTro): MenuItem[] => {
    return items
      .map((item) => {
        if (!item || typeof item !== "object") return null;

        const menuItem = item as {
          key?: string;
          children?: MenuItem[];
          label?: React.ReactNode;
          icon?: React.ReactNode;
        };
        const key = menuItem.key as string;

        // Check if user can access this route
        if (!canAccessRoute(key, userRole)) {
          return null;
        }

        // If has children, filter them too
        if (menuItem.children && menuItem.children.length > 0) {
          const filteredChildren = filterMenuItems(menuItem.children, userRole);
          if (filteredChildren.length === 0) {
            return null; // Hide parent if no accessible children
          }
          return {
            ...menuItem,
            children: filteredChildren,
          } as MenuItem;
        }

        return item;
      })
      .filter(Boolean) as MenuItem[];
  };

  // Filter menu sections
  // Super admin sees all menus, regular users filter by role
  const filteredDieuHanhMenu = isSuperAdmin
    ? dieuHanhMenuItems
    : (currentRole ? filterMenuItems(dieuHanhMenuItems, currentRole) : []);
  const filteredKeToAnMenu = isSuperAdmin
    ? keToAnMenuItems
    : (currentRole ? filterMenuItems(keToAnMenuItems, currentRole) : []);
  const filteredThuVienMenu = isSuperAdmin
    ? thuVienMenuItems
    : (currentRole ? filterMenuItems(thuVienMenuItems, currentRole) : []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  // Track previous pathname to detect navigation
  const prevPathnameRef = useRef(location.pathname);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Auto collapse sidebar when navigating to form screens (create/edit)
  useEffect(() => {
    // Skip on initial render (when prev === current)
    if (prevPathnameRef.current !== location.pathname) {
      if (!isMobile && !collapsed && isFormScreen(location.pathname)) {
        setCollapsed(true);
      }
      prevPathnameRef.current = location.pathname;
    }
  }, [location.pathname, isMobile, collapsed]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleLogout = () => {
    logout();
    message.success("Đã đăng xuất thành công");
    navigate("/login");
  };

  const handleMenuClick: MenuProps["onClick"] = (e) => {
    navigate(e.key);
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "user-info",
      label: (
        <div className="py-2 px-1">
          <div className="font-medium">{user?.hoTen}</div>
          <div className="text-xs text-muted-foreground">{user?.email}</div>
          <Tag color={roleInfo?.color} className="mt-1">
            {roleInfo?.label}
          </Tag>
        </div>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "Thông tin cá nhân",
      onClick: () => navigate("/profile"),
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "Đăng xuất",
      danger: true,
      onClick: handleLogout,
    },
  ];

  // Settings menu items for gear icon dropdown
  const settingsMenuItems: MenuProps["items"] = [
    {
      key: "phan-quyen",
      icon: <SafetyCertificateOutlined />,
      label: "Phân quyền",
      onClick: () => navigate("/cau-hinh/phan-quyen"),
    },
    // Only show Tenant management for super admin
    ...(user?.isSuperAdmin ? [{
      key: "tenant",
      icon: <TeamOutlined />,
      label: "Quản lý Công ty",
      onClick: () => navigate("/cau-hinh/tenant"),
    }] : []),
  ];

  const getSelectedKeys = () => {
    const path = location.pathname;
    if (path === "/") return ["/"];
    return [path];
  };

  const getOpenKeys = () => {
    const path = location.pathname;
    const parts = path.split("/").filter(Boolean);
    if (parts.length > 0) {
      return ["/" + parts[0]];
    }
    return [];
  };

  const siderWidth = collapsed ? 56 : 240;

  // Mobile Drawer Menu
  const MobileDrawer = () => (
    <Drawer
      title={
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpg"
            alt="Master CEO"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="font-semibold">Master CEO</span>
        </div>
      }
      placement="left"
      onClose={() => setMobileMenuOpen(false)}
      open={mobileMenuOpen}
      width={300}
      closeIcon={<CloseOutlined />}
      styles={{
        body: { padding: 0, background: "hsl(var(--sidebar-background))", overflowY: "auto" },
        header: {
          background: "hsl(var(--sidebar-background))",
          borderBottom: "1px solid hsl(var(--sidebar-border))",
          color: "hsl(var(--sidebar-foreground))",
        },
      }}
    >
      {/* ĐIỀU HÀNH Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">ĐIỀU HÀNH</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={filteredDieuHanhMenu}
          onClick={handleMenuClick}
          className="!bg-transparent border-r-0 sidebar-menu"
        />
      </div>

      {/* KẾ TOÁN Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">KẾ TOÁN</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={filteredKeToAnMenu}
          onClick={handleMenuClick}
          className="!bg-transparent border-r-0 sidebar-menu"
        />
      </div>

      {/* THƯ VIỆN Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span className="sidebar-section-title">THƯ VIỆN</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={filteredThuVienMenu}
          onClick={handleMenuClick}
          className="!bg-transparent border-r-0 sidebar-menu"
        />
      </div>
    </Drawer>
  );

  return (
    <Layout className="min-h-screen">
      {/* Mobile Drawer */}
      {isMobile && <MobileDrawer />}

      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={56}
          className={`!bg-sidebar ${collapsed ? "sidebar-collapsed" : ""}`}
          style={{
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Logo & Collapse Button */}
          <div className="h-12 flex items-center justify-between px-3 border-b border-sidebar-border flex-shrink-0">
            {collapsed ? (
              <Button
                type="text"
                size="small"
                icon={<MenuUnfoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="!text-sidebar-foreground/70 hover:!text-sidebar-foreground hover:!bg-sidebar-accent mx-auto"
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <img
                    src="/logo.jpg"
                    alt="Master CEO"
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                  <span className="text-sidebar-foreground font-semibold text-sm">
                    Master CEO
                  </span>
                </div>
                <Button
                  type="text"
                  size="small"
                  icon={<MenuFoldOutlined />}
                  onClick={() => setCollapsed(!collapsed)}
                  className="!text-sidebar-foreground/70 hover:!text-sidebar-foreground hover:!bg-sidebar-accent"
                />
              </>
            )}
          </div>

          {/* Scrollable Menu Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
            {/* ĐIỀU HÀNH Section */}
            <div className="sidebar-section">
              {!collapsed && (
                <div className="sidebar-section-header">
                  <span className="sidebar-section-title">ĐIỀU HÀNH</span>
                </div>
              )}
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={getSelectedKeys()}
                defaultOpenKeys={collapsed ? [] : getOpenKeys()}
                items={filteredDieuHanhMenu}
                onClick={handleMenuClick}
                className="!bg-transparent border-r-0 sidebar-menu"
              />
            </div>

            {/* KẾ TOÁN Section */}
            <div className="sidebar-section">
              {!collapsed && (
                <div className="sidebar-section-header">
                  <span className="sidebar-section-title">KẾ TOÁN</span>
                </div>
              )}
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={getSelectedKeys()}
                defaultOpenKeys={collapsed ? [] : getOpenKeys()}
                items={filteredKeToAnMenu}
                onClick={handleMenuClick}
                className="!bg-transparent border-r-0 sidebar-menu"
              />
            </div>

            {/* THƯ VIỆN Section */}
            <div className="sidebar-section">
              {!collapsed && (
                <div className="sidebar-section-header">
                  <span className="sidebar-section-title">THƯ VIỆN</span>
                </div>
              )}
              <Menu
                theme="dark"
                mode="inline"
                selectedKeys={getSelectedKeys()}
                defaultOpenKeys={collapsed ? [] : getOpenKeys()}
                items={filteredThuVienMenu}
                onClick={handleMenuClick}
                className="!bg-transparent border-r-0 sidebar-menu"
              />
            </div>
          </div>
        </Sider>
      )}

      {/* Main Content Area */}
      <Layout
        style={{
          marginLeft: isMobile ? 0 : siderWidth,
          transition: "margin-left 0.2s ease",
          minHeight: "100vh",
        }}
      >
        {/* Header - Compact */}
        <Header
          className="!px-3 sm:!px-4 flex items-center justify-between sticky top-0 z-50"
          style={{
            background: "hsl(var(--card))",
            borderBottom: "1px solid hsl(var(--border))",
            height: 48,
            minHeight: 48,
          }}
        >
          {/* Left: Mobile menu button or empty space */}
          <div className="flex items-center gap-2 sm:gap-4">
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuOpen(true)}
                className="!text-foreground"
              />
            )}
            {/* Mobile Logo */}
            {isMobile && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">
                    KT
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Center: Search Bar - Hide on small mobile */}
          {/* <div className="hidden sm:flex flex-1 max-w-md mx-4 lg:mx-8">
            <Input
              placeholder="Tìm kiếm (Ctrl+K)..."
              prefix={<SearchOutlined className="text-muted-foreground" />}
              suffix={
                <span className="hidden md:inline text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  ⌘K
                </span>
              }
              className="!bg-muted/50 w-full"
            />
          </div> */}

          {/* Right: Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Tenant Switcher */}
            <TenantSwitcher />

            {/* Settings dropdown with gear icon */}
            {user && (isSuperAdmin || currentRole === 'ADMIN' || currentRole === 'KE_TOAN_TRUONG' || currentRole === 'KE_TOAN_TONG_HOP') && (
              <Dropdown
                menu={{ items: settingsMenuItems }}
                placement="bottomRight"
                trigger={["click"]}
              >
                <Tooltip title="Cấu hình">
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    className="!text-muted-foreground hover:!text-foreground"
                  />
                </Tooltip>
              </Dropdown>
            )}

            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <div className="flex items-center gap-1.5 cursor-pointer hover:bg-muted px-2 py-1 rounded-md transition-colors">
                <Avatar
                  size={24}
                  style={{ backgroundColor: roleInfo?.color || "#1890ff" }}
                  icon={<UserOutlined />}
                />
                <div className="hidden md:block">
                  <div className="text-xs font-medium text-foreground leading-tight">
                    {user?.hoTen}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Content */}
        <Content
          className="p-2 sm:p-3"
          style={{
            background: "hsl(var(--background))",
            height: "calc(100vh - 48px)",
            overflow: "auto",
          }}
        >
          <div className="h-full">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
