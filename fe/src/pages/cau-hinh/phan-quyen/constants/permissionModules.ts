import {
  MENU_MODULES,
  MENU_LEAVES,
  permKeyOf,
  coKhoaQuyenRieng,
  type MenuLeaf,
} from "@/config/menuCatalog";
import { DANH_MUC_GROUPS } from "@/config/danhMucCatalog";

export interface PermissionModule {
  key: string;
  label: string;
  isSection?: boolean;
  children?: PermissionModule[];
}

export type PermissionAction = 'xem' | 'them' | 'sua' | 'xoa' | 'xuat';

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'xem', label: 'Xem' },
  { key: 'them', label: 'Thêm' },
  { key: 'sua', label: 'Sửa' },
  { key: 'xoa', label: 'Xoá' },
  { key: 'xuat', label: 'Xuất' },
];

/**
 * Trang chủ: route là '/', nhưng khoá quyền đã cấp cho người dùng thật từ
 * trước tới nay là '/tong-quan' (routePermissions ánh xạ '/' → '/tong-quan:xem',
 * App.tsx và useVisibleMenu cũng đi theo khoá đó). Để nguyên '/' thì ma trận
 * sinh ra '/:xem' — khoá chưa từng tồn tại — và '/tong-quan:xem' bị xoá khỏi
 * mọi vai trò ở lần lưu kế tiếp, tức cả công ty mất Bảng điều hành.
 */
const KHOA_MA_TRAN: Record<string, string> = { '/': '/tong-quan' };

const khoaCua = (leaf: MenuLeaf): string => {
  const k = permKeyOf(leaf);
  return KHOA_MA_TRAN[k] ?? k;
};

/**
 * Trang cấu hình vào từ nút bánh răng, không nằm trong MENU_MODULES nên phải
 * khai tay. Phải khớp với BE PERMISSION_MODULES (tenant.service.ts) — thiếu ở
 * đây thì mỗi lần lưu trên trang Phân quyền sẽ xoá các quyền này khỏi vai trò.
 */
const PHAN_HE_CAU_HINH: PermissionModule = {
  key: 'cau-hinh',
  label: 'Cấu hình',
  isSection: true,
  children: [
    { key: '/cau-hinh/vai-tro', label: 'Quản lý Vai trò' },
    { key: '/cau-hinh/phan-quyen', label: 'Phân quyền' },
    { key: '/cau-hinh/thanh-vien', label: 'Quản lý Thành viên' },
  ],
};

/**
 * Ma trận phân quyền SINH từ menuCatalog — không chép tay nữa. Thêm trang mới
 * vào menuCatalog là ma trận tự có.
 *
 * Quy tắc:
 * - Cấp 1 = phân hệ (`isSection`), đúng thứ tự rail; phân hệ không còn khoá
 *   nào của riêng nó thì không hiện (Tiền lương: mọi trang hoặc dùng chung
 *   route Kế hoạch/Dự báo, hoặc chưa có quyền nào được cấp).
 * - Mục `ok` vào hết, kể cả `legacy` — trang còn sống thì quyền còn hiệu lực.
 * - Mục `soon` chỉ vào khi có cờ `quyenDaCap` (quyền đã cấp cho vai trò từ
 *   trước). Bỏ chúng ra là xoá quyền khỏi vai trò khi admin bấm Lưu.
 * - Khử trùng theo khoá trên TOÀN ma trận, không theo từng phân hệ: 8 mục
 *   `?tab=` của Kế hoạch/Dự báo quy về 2 khoá và nằm rải ở 4 phân hệ. Khoá
 *   trùng làm `convertPermissionsToMatrix` sinh hai dòng cùng moduleKey (tick
 *   một dòng không đồng bộ dòng kia) và `convertMatrixToPermissions` ghi trùng
 *   chuỗi quyền. Mục dùng chung route thuộc về phân hệ khai nó TRƯỚC.
 * - Phân hệ Danh mục: 26 trang con của danhMucCatalog, giữ nhóm nhỏ, RỒI mới
 *   tới các mục còn lại mang module 'danh-muc' (/quy-trinh, /chinh-sach,
 *   /bieu-mau, /huong-dan — quyền thật, không được bỏ).
 */
function dungMaTran(): PermissionModule[] {
  const daCo = new Set<string>();
  const phanHe: PermissionModule[] = [];

  for (const m of MENU_MODULES) {
    const con: PermissionModule[] = [];

    if (m.id === 'danh-muc') {
      for (const nhom of DANH_MUC_GROUPS) {
        const links = nhom.links.filter((l) => !daCo.has(l.path));
        links.forEach((l) => daCo.add(l.path));
        if (links.length === 0) continue;
        con.push({
          key: `danh-muc/${nhom.title}`,
          label: nhom.title,
          children: links.map((l) => ({ key: l.path, label: l.label })),
        });
      }
    }

    for (const leaf of MENU_LEAVES) {
      if (leaf.module !== m.id) continue;
      if (leaf.status !== 'ok' && !leaf.quyenDaCap) continue;
      if (!coKhoaQuyenRieng(leaf)) continue;
      const key = khoaCua(leaf);
      if (daCo.has(key)) continue;
      daCo.add(key);
      con.push({ key, label: leaf.label });
    }

    if (con.length === 0) continue;
    phanHe.push({ key: m.id, label: m.label, isSection: true, children: con });
  }

  phanHe.push(PHAN_HE_CAU_HINH);
  return phanHe;
}

export const permissionModules: PermissionModule[] = dungMaTran();
