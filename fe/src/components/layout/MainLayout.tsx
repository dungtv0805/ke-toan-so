import React, { useState, useEffect, useRef } from "react";
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Badge,
  Button,
  Input,
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
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BankOutlined,
  ProjectOutlined,
  AppstoreOutlined,
  DollarOutlined,
  AuditOutlined,
  FundOutlined,
  SearchOutlined,
  MoonOutlined,
  SunOutlined,
  QuestionCircleOutlined,
  MenuOutlined,
  CloseOutlined,
  SafetyCertificateOutlined,
  TagOutlined,
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
  children?: MenuItem[]
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
  } as MenuItem;
}

// Main sidebar menu items - organized into 3 groups
const menuItems: MenuItem[] = [
  // ===== NHÓM 1: TỔNG QUAN =====
  getItem("Tổng quan", "/", <DashboardOutlined />),

  // ===== NHÓM 2: LÀM VIỆC THƯỜNG XUYÊN =====
  getItem("Chứng từ", "/chung-tu", <FileTextOutlined />, [
    getItem("Dữ liệu tổng hợp", "/chung-tu/nhat-ky-chung", <AuditOutlined />),
  ]),
  getItem("Trung tâm dữ liệu", "/trung-tam-du-lieu", <FundOutlined />, [
    getItem("Sổ quỹ", "/so-quy", <WalletOutlined />),
    getItem("Công nợ phải thu", "/cong-no/phai-thu", <FundOutlined />),
    getItem("Công nợ phải trả", "/cong-no/phai-tra", <FundOutlined />),
  ]),
  getItem("Báo cáo", "/bao-cao", <BarChartOutlined />, [
    getItem("Báo cáo P&L", "/bao-cao/pnl", <BarChartOutlined />),
    getItem("Sổ cái", "/bao-cao/so-cai", <BookOutlined />),
    getItem("Bảng cân đối", "/bao-cao/bang-can-doi", <BarChartOutlined />),
  ]),
  // getItem("Phân tích", "/phan-tich", <LineChartOutlined />, [
  //   // Sắp cập nhật
  // ]),

  // ===== NHÓM 3: NHẬP 1 LẦN =====
  getItem("Danh mục", "/danh-muc", <BookOutlined />, [
    getItem("Tài khoản kế toán", "/danh-muc/tai-khoan", <BankOutlined />),
    getItem("Đối tượng", "/danh-muc/doi-tuong", <TeamOutlined />),
    getItem("Dự án", "/danh-muc/du-an", <ProjectOutlined />),
    getItem("Chủ đầu tư", "/danh-muc/chu-dau-tu", <UserOutlined />),
    getItem("Sản phẩm", "/danh-muc/san-pham", <AppstoreOutlined />),
    getItem("Bộ phận", "/danh-muc/bo-phan", <TeamOutlined />),
    getItem("Khoản mục", "/danh-muc/khoan-muc", <DollarOutlined />),
    getItem("Nhóm khoản mục", "/danh-muc/nhom-khoan-muc", <TagOutlined />),
    getItem("Ngân hàng & Quỹ", "/danh-muc/ngan-hang", <BankOutlined />),
    getItem("Dòng tiền", "/danh-muc/dong-tien", <DollarOutlined />),
    getItem("Nhóm khuyến mại", "/danh-muc/nhom-khuyen-mai", <AppstoreOutlined />),
    getItem("Nhóm quản lý", "/danh-muc/nhom-quan-ly", <TeamOutlined />),
    getItem("Loại chứng từ", "/danh-muc/loai-chung-tu", <FileTextOutlined />),
    getItem("Quy chuẩn hạch toán", "/danh-muc/quy-chuan", <AuditOutlined />),
  ]),
  // getItem("Quy chế - Chính sách", "/quy-che", <SafetyCertificateOutlined />, [
  //   // Sắp cập nhật
  // ]),
  // getItem("Biểu mẫu", "/bieu-mau", <FormOutlined />, [
  //   // Sắp cập nhật
  // ]),
  // getItem("Hướng dẫn", "/huong-dan", <QuestionCircleOutlined />, [
  //   // Sắp cập nhật
  // ]),
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

  const filteredMenuItems = user ? filterMenuItems(menuItems, user.vaiTro) : [];

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

  const siderWidth = collapsed ? 56 : 220;

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
      width={280}
      closeIcon={<CloseOutlined />}
      styles={{
        body: { padding: 0, background: "hsl(var(--sidebar-background))" },
        header: {
          background: "hsl(var(--sidebar-background))",
          borderBottom: "1px solid hsl(var(--sidebar-border))",
          color: "hsl(var(--sidebar-foreground))",
        },
      }}
    >
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        defaultOpenKeys={getOpenKeys()}
        items={filteredMenuItems}
        onClick={handleMenuClick}
        className="!bg-transparent border-r-0"
      />
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
          width={220}
          collapsedWidth={56}
          className={`!bg-sidebar ${collapsed ? "sidebar-collapsed" : ""}`}
          style={{
            overflow: "auto",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
          }}
        >
          {/* Logo */}
          <div className="h-12 flex items-center justify-center border-b border-sidebar-border">
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

          {/* Menu */}
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={getSelectedKeys()}
            defaultOpenKeys={collapsed ? [] : getOpenKeys()}
            items={filteredMenuItems}
            onClick={handleMenuClick}
            className="!bg-transparent border-r-0 mt-1 compact-menu"
          />

          {/* Collapse button at bottom */}
          <div className="absolute bottom-2 left-0 right-0 px-2">
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
