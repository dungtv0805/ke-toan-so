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
import { routePermissions } from "@/config/routePermissions";
import { VaiTro } from "@/types";
import { useIsMobile } from "@/hooks/use-mobile";

const { Header, Sider, Content } = Layout;

type MenuItem = Required<MenuProps>["items"][number];

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

// ===== KẾ TOÁN - Main accounting menu =====
const keToAnMenuItems: MenuItem[] = [
  // 5. Tổng quan
  getItem(
    <span className="menu-section-label">5</span>,
    "section-5",
    null,
    [getItem("Tổng quan", "/", <DashboardOutlined />)],
    "group"
  ),

  // 4. Phân tích
  getItem(
    <span className="menu-section-label">4</span>,
    "section-4",
    null,
    [
      getItem("Phân tích", "/phan-tich", <LineChartOutlined />, [
        getItem("Báo cáo tài chính", "/phan-tich/bao-cao-tai-chinh", <PieChartOutlined />),
        getItem("Bán hàng", "/phan-tich/ban-hang", <ShoppingCartOutlined />),
        getItem("Mua hàng", "/phan-tich/mua-hang", <ShoppingOutlined />),
        getItem("Công nợ", "/phan-tich/cong-no", <ReconciliationOutlined />),
        getItem("Dòng tiền", "/phan-tich/dong-tien", <DollarOutlined />),
        getItem("Tồn kho", "/phan-tich/ton-kho", <InboxOutlined />),
        getItem("Khả năng thanh khoản", "/phan-tich/thanh-khoan", <StockOutlined />),
      ]),
    ],
    "group"
  ),

  // 3. Báo cáo
  getItem(
    <span className="menu-section-label">3</span>,
    "section-3",
    null,
    [
      getItem("Báo cáo", "/bao-cao", <BarChartOutlined />, [
        getItem("Báo cáo tài chính", "/bao-cao/tai-chinh", <PieChartOutlined />),
        getItem("Sổ chi tiết tài khoản", "/bao-cao/so-chi-tiet-tai-khoan", <AccountBookOutlined />),
        getItem("Sổ chi tiết công nợ", "/bao-cao/so-chi-tiet-cong-no", <FileSearchOutlined />),
        getItem("Sổ chi tiết phát sinh", "/bao-cao/so-chi-tiet-phat-sinh", <ProfileOutlined />),
        getItem("Bảng tổng hợp", "/bao-cao/bang-tong-hop", <TableOutlined />),
      ]),
    ],
    "group"
  ),

  // 2. Trung tâm dữ liệu
  getItem(
    <span className="menu-section-label">2</span>,
    "section-2",
    null,
    [
      getItem("Trung tâm dữ liệu", "/trung-tam-du-lieu", <DatabaseOutlined />, [
        getItem("Kế hoạch", "/trung-tam-du-lieu/ke-hoach", <ScheduleOutlined />),
        getItem("Dự báo", "/trung-tam-du-lieu/du-bao", <RiseOutlined />),
        getItem("Nhật ký chung", "/chung-tu/nhat-ky-chung", <AuditOutlined />),
        getItem("Quản lý Tài sản", "/trung-tam-du-lieu/tai-san", <CarOutlined />),
        getItem("Quản lý Hàng hóa", "/trung-tam-du-lieu/hang-hoa", <AppstoreOutlined />),
        getItem("Quản lý Nguyên liệu", "/trung-tam-du-lieu/nguyen-lieu", <ContainerOutlined />),
        getItem("Quản lý Dụng cụ", "/trung-tam-du-lieu/dung-cu", <ToolOutlined />),
        getItem("Quản lý Hợp đồng", "/trung-tam-du-lieu/hop-dong", <FileProtectOutlined />),
        getItem("Quản lý nhân sự", "/trung-tam-du-lieu/nhan-su", <SolutionOutlined />),
        getItem("Lương & BHXH", "/trung-tam-du-lieu/luong-bhxh", <InsuranceOutlined />),
      ]),
    ],
    "group"
  ),

  // 1. Chứng từ
  getItem(
    <span className="menu-section-label">1</span>,
    "section-1",
    null,
    [
      getItem("Chứng từ", "/chung-tu", <FileTextOutlined />, [
        getItem("Phiếu thu", "/chung-tu/phieu-thu", <CreditCardOutlined />),
        getItem("Phiếu chi", "/chung-tu/phieu-chi", <WalletOutlined />),
        getItem("Phiếu nhập", "/chung-tu/phieu-nhap", <FileAddOutlined />),
        getItem("Phiếu xuất", "/chung-tu/phieu-xuat", <FileDoneOutlined />),
        getItem("Phiếu lương", "/chung-tu/phieu-luong", <SnippetsOutlined />),
        getItem("Bảng tính lương", "/chung-tu/bang-tinh-luong", <CalculatorOutlined />),
        getItem("Bảng chấm công", "/chung-tu/bang-cham-cong", <ClockCircleOutlined />),
        getItem("Bảng chấm công làm thêm giờ", "/chung-tu/cham-cong-lam-them", <FieldTimeOutlined />),
        getItem("Bảng phân bổ khấu hao TSCĐ", "/chung-tu/phan-bo-khau-hao", <PartitionOutlined />),
        getItem("Phiếu kế toán", "/chung-tu/phieu-ke-toan", <AuditOutlined />),
        getItem("Đề nghị thanh toán", "/chung-tu/de-nghi-thanh-toan", <FormOutlined />),
      ]),
    ],
    "group"
  ),
];

// ===== THƯ VIỆN - Library menu =====
const thuVienMenuItems: MenuItem[] = [
  // Danh mục
  getItem("Danh mục", "/danh-muc", <BookOutlined />, [
    getItem("Tài khoản", "/danh-muc/tai-khoan", <BankOutlined />),
    getItem("Đối tượng", "/danh-muc/doi-tuong", <TeamOutlined />),
    getItem("Dự án", "/danh-muc/du-an", <ProjectOutlined />),
    getItem("Sản phẩm", "/danh-muc/san-pham", <AppstoreOutlined />),
    getItem("Hợp đồng", "/danh-muc/hop-dong", <FileProtectOutlined />),
    getItem("Bộ phận", "/danh-muc/bo-phan", <TeamOutlined />),
    getItem("Khoản mục", "/danh-muc/khoan-muc", <DollarOutlined />),
    getItem("Kho", "/danh-muc/kho", <InboxOutlined />),
    getItem("Khác", "/danh-muc/khac", <AppstoreOutlined />, [
      getItem("Chủ đầu tư", "/danh-muc/chu-dau-tu", <UserOutlined />),
      getItem("Nhóm khoản mục", "/danh-muc/nhom-khoan-muc", <TagOutlined />),
      getItem("Ngân hàng & Quỹ", "/danh-muc/ngan-hang", <BankOutlined />),
      getItem("Dòng tiền", "/danh-muc/dong-tien", <DollarOutlined />),
      getItem("Nhóm khuyến mại", "/danh-muc/nhom-khuyen-mai", <AppstoreOutlined />),
      getItem("Nhóm quản lý", "/danh-muc/nhom-quan-ly", <TeamOutlined />),
      getItem("Loại chứng từ", "/danh-muc/loai-chung-tu", <FileTextOutlined />),
      getItem("Loại giao dịch", "/danh-muc/loai-giao-dich", <SwapOutlined />),
      getItem("Quy chuẩn hạch toán", "/danh-muc/quy-chuan", <AuditOutlined />),
    ]),
  ]),

  // Quy trình
  getItem("Quy trình", "/quy-trinh", <NodeIndexOutlined />),

  // Chính sách
  getItem("Chính sách", "/chinh-sach", <SafetyCertificateOutlined />),

  // Biểu mẫu
  getItem("Biểu mẫu", "/bieu-mau", <FormOutlined />),

  // Hướng dẫn
  getItem("Hướng dẫn", "/huong-dan", <QuestionCircleOutlined />),
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
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const roleInfo = vaiTroOptions.find((v) => v.value === user?.vaiTro);

  // Filter menu items based on user role
  const canAccessRoute = (path: string, userRole: VaiTro): boolean => {
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

  // Filter both menu sections
  const filteredKeToAnMenu = user ? filterMenuItems(keToAnMenuItems, user.vaiTro) : [];
  const filteredThuVienMenu = user ? filterMenuItems(thuVienMenuItems, user.vaiTro) : [];

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
            overflow: "hidden",
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
          {/* Logo */}
          <div className="h-12 flex items-center justify-center border-b border-sidebar-border flex-shrink-0">
            {collapsed ? (
              <img
                src="/logo.jpg"
                alt="Master CEO"
                className="w-8 h-8 rounded-lg object-cover"
              />
            ) : (
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
            )}
          </div>

          {/* Scrollable Menu Container */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden sidebar-scroll">
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

          {/* Collapse button at bottom */}
          <div className="flex-shrink-0 p-2 border-t border-sidebar-border">
            <Button
              type="text"
              size="small"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="w-full !text-sidebar-foreground/70 hover:!text-sidebar-foreground hover:!bg-sidebar-accent"
            />
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
            {/* Settings dropdown with gear icon */}
            {user && (user.vaiTro === 'ADMIN' || user.vaiTro === 'KE_TOAN_TRUONG' || user.vaiTro === 'KE_TOAN_TONG_HOP') && (
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
            overflow: "hidden",
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
