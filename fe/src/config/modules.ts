/**
 * Module / Lĩnh vực catalog (code-defined).
 *
 * Tầng "entitlement": công ty (tenant) được cấp 1 hoặc nhiều lĩnh vực. Mỗi lĩnh vực
 * quyết định nhóm menu hiển thị (xem MainLayout). Đây KHÔNG phải phân quyền role —
 * role vẫn lọc tinh từng menu bên trong lĩnh vực.
 *
 * Thêm lĩnh vực mới: thêm code vào ModuleCode + 1 entry vào MODULES, rồi gắn nhãn
 * module cho menu tương ứng trong MainLayout.
 */
import React from 'react';
import { AccountBookOutlined, InboxOutlined } from '@ant-design/icons';

export type ModuleCode = 'KE_TOAN' | 'KHO';

export interface ModuleDef {
  code: ModuleCode;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export const MODULES: ModuleDef[] = [
  {
    code: 'KE_TOAN',
    name: 'Kế toán',
    description: 'Báo cáo, chứng từ, sổ sách, công nợ',
    icon: React.createElement(AccountBookOutlined),
    color: '#1B3A6B',
  },
  {
    code: 'KHO',
    name: 'Kho',
    description: 'Nhập, xuất, chuyển kho và hàng hóa vật tư',
    icon: React.createElement(InboxOutlined),
    color: '#C9A227',
  },
];

export const MODULE_CODES: ModuleCode[] = MODULES.map((m) => m.code);

export const getModuleDef = (code: string): ModuleDef | undefined =>
  MODULES.find((m) => m.code === code);

/**
 * Lĩnh vực khả dụng cho người dùng hiện tại:
 * - SuperAdmin: toàn bộ catalog.
 * - User thường: theo modules công ty được cấp (mặc định ['KE_TOAN']).
 */
export function getAvailableModules(
  tenantModules: string[] | undefined,
  isSuperAdmin: boolean,
): ModuleCode[] {
  if (isSuperAdmin) return MODULE_CODES;
  const codes = (tenantModules ?? ['KE_TOAN']).filter((c): c is ModuleCode =>
    MODULE_CODES.includes(c as ModuleCode),
  );
  return codes.length ? codes : ['KE_TOAN'];
}

// ===== Gắn lĩnh vực cho từng mục menu (theo key/path) =====
// Menu chia theo SECTION (trực giao với lĩnh vực); mỗi mục lá quy về 1 lĩnh vực.
// COMMON = luôn hiện ở mọi lĩnh vực.
export const COMMON_MENU_KEYS = new Set<string>([
  '/',
  '/quy-trinh',
  '/chinh-sach',
  '/bieu-mau',
  '/huong-dan',
]);

export const KHO_MENU_KEYS: string[] = [
  '/kho', // /kho/nhap-kho, /kho/xuat-kho, /kho/chuyen-kho
  '/phan-tich/ton-kho',
  '/chung-tu/phieu-nhap',
  '/chung-tu/phieu-xuat',
  '/danh-muc/kho',
  '/danh-muc/hang-hoa-vat-tu',
  '/danh-muc/don-vi-tinh',
  '/danh-muc/nhom-vat-tu',
  '/trung-tam-du-lieu/hang-hoa',
  '/trung-tam-du-lieu/nguyen-lieu',
];

/** Lĩnh vực của một mục menu theo key; mặc định KE_TOAN (nghiệp vụ kế toán). */
export function moduleOfMenuKey(key: string): ModuleCode | 'COMMON' {
  if (COMMON_MENU_KEYS.has(key)) return 'COMMON';
  if (KHO_MENU_KEYS.some((k) => key === k || key.startsWith(k + '/'))) return 'KHO';
  return 'KE_TOAN';
}

const STORAGE_PREFIX = 'selectedModule:';

export const getStoredModule = (tenantId: string): string | null =>
  localStorage.getItem(STORAGE_PREFIX + tenantId);

export const setStoredModule = (tenantId: string, code: string | null): void => {
  if (code) localStorage.setItem(STORAGE_PREFIX + tenantId, code);
  else localStorage.removeItem(STORAGE_PREFIX + tenantId);
};
