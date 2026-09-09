import { describe, it, expect } from 'vitest';
import { permissionModules, type PermissionModule } from './permissionModules';
import {
  MENU_MODULES, MENU_LEAVES, permKeyOf, coKhoaQuyenRieng,
} from '@/config/menuCatalog';
import { DANH_MUC_ROUTES } from '@/config/danhMucCatalog';
import maTranTruocDoi from './__snapshots__/matrix-keys-truoc-doi.json';
import routeTruocDoi from '@/config/__snapshots__/route-permissions-truoc-doi.json';

const moiKey = (ds: PermissionModule[] = permissionModules): string[] =>
  ds.flatMap((m) => (m.children ? moiKey(m.children) : [m.key]));

/**
 * Tập khoá quyền ĐÃ TỒN TẠI, đóng băng trước đợt này: khoá của ma trận cũ hợp
 * với khoá của routePermissions cũ. '/' trong routePermissions là khoá ROUTE,
 * khoá QUYỀN tương ứng của nó là '/tong-quan' (giá trị '/tong-quan:xem').
 */
const KHOA_DA_CO = new Set<string>([
  ...(maTranTruocDoi as string[]),
  ...Object.keys(routeTruocDoi as Record<string, string>).map((k) =>
    k === '/' ? '/tong-quan' : k,
  ),
]);

describe('permissionModules sinh từ catalog', () => {
  it('cấp 1 toàn là phân hệ, đúng thứ tự rail', () => {
    expect(permissionModules.every((m) => m.isSection)).toBe(true);

    const nhan = permissionModules.map((m) => m.label);
    expect(nhan[nhan.length - 1]).toBe('Cấu hình');

    // Phân hệ không còn khoá riêng nào thì không hiện (Tiền lương). Phần còn
    // lại phải giữ NGUYÊN thứ tự của rail.
    const cuaRail = nhan.slice(0, -1);
    const thuTuRail = MENU_MODULES.map((m) => m.label);
    expect(cuaRail).toEqual(thuTuRail.filter((l) => cuaRail.includes(l)));
  });

  it('mọi mục ok trên sidebar đều cấp quyền được', () => {
    const trongMaTran = new Set(moiKey());
    const thieu = MENU_LEAVES
      .filter((l) => l.status === 'ok' && !l.legacy && l.module !== 'danh-muc')
      .filter((l) => coKhoaQuyenRieng(l))
      .filter((l) => !trongMaTran.has(permKeyOf(l)) && permKeyOf(l) !== '/');
    expect(thieu.map((l) => l.key)).toEqual([]);
  });

  it('mục legacy vẫn cấp quyền được — trang còn sống', () => {
    const trongMaTran = new Set(moiKey());
    expect(trongMaTran.has('/bep-an/kiem-soat-chi-phi')).toBe(true);
    expect(trongMaTran.has('/bao-cao/so-cai')).toBe(true);
  });

  it('phân hệ Danh mục liệt kê đủ 26 trang con', () => {
    const dm = permissionModules.find((m) => m.label === 'Danh mục')!;
    const keys = new Set(moiKey(dm.children ?? []));
    expect(DANH_MUC_ROUTES.filter((r) => !keys.has(r))).toEqual([]);
  });

  it('4 mục thư viện mang module danh-muc KHÔNG bị nhóm Danh mục nuốt mất', () => {
    const trongMaTran = new Set(moiKey());
    for (const k of ['/quy-trinh', '/chinh-sach', '/bieu-mau', '/huong-dan']) {
      expect(trongMaTran.has(k)).toBe(true);
    }
  });

  it('không key nào trùng nhau trong toàn ma trận', () => {
    const keys = moiKey();
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('mục soon chưa từng được cấp quyền thì không vào ma trận', () => {
    const trongMaTran = new Set(moiKey());
    const okKeys = new Set(
      MENU_LEAVES.filter((l) => l.status === 'ok').map(permKeyOf),
    );
    const thua = MENU_LEAVES
      .filter((l) => l.status === 'soon' && !l.quyenDaCap)
      .filter((l) => !okKeys.has(permKeyOf(l)))
      .filter((l) => trongMaTran.has(permKeyOf(l)));
    expect(thua.map((l) => l.key)).toEqual([]);
  });
});

/**
 * Hai chốt chặn thật của cả đợt. Trang Phân quyền lưu bằng cách ghi đè toàn bộ
 * danh sách quyền của vai trò, dựng lại từ đúng các lá của ma trận này:
 * khoá biến mất = quyền bị xoá khỏi vai trò; khoá lạ = quyền chưa ai có.
 * Hai file snapshot là ảnh chụp ĐÓNG BĂNG trước đợt sửa, KHÔNG sinh lại.
 */
describe('ma trận — không cấp lại, không đánh rơi', () => {
  it('không khoá nào của ma trận cũ biến mất', () => {
    const bayGio = new Set(moiKey());
    const mat = (maTranTruocDoi as string[]).filter((k) => !bayGio.has(k));
    expect(mat).toEqual([]);
  });

  it('không sinh khoá quyền chưa từng tồn tại', () => {
    const la = moiKey().filter((k) => !KHOA_DA_CO.has(k));
    expect(la).toEqual([]);
  });
});
