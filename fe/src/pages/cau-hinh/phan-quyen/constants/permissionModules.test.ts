import { describe, it, expect } from 'vitest';
import { permissionModules, type PermissionModule } from './permissionModules';
import {
  MENU_MODULES, MENU_LEAVES, permKeyOf, coKhoaQuyenRieng,
} from '@/config/menuCatalog';
import { DANH_MUC_ROUTES } from '@/config/danhMucCatalog';
import maTranTruocDoi from './__snapshots__/matrix-keys-truoc-doi.json';
import routeTruocDoi from '@/config/__snapshots__/route-permissions-truoc-doi.json';
import khoaMoi from '@/config/__snapshots__/khoa-moi-menu-tai-chinh.json';
import khoaBo from '@/config/__snapshots__/khoa-bo-menu-tai-chinh.json';
import fs from 'node:fs';
import path from 'node:path';

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

    // Phân hệ không có khoá riêng nào thì không hiện (hai Cổng yêu cầu). Phần còn
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

  it('đủ 26 trang danh mục con, mỗi trang đúng một dòng (ở Danh mục hoặc phân hệ sheet đặt nó)', () => {
    const keys = moiKey();
    const thieuHoacLap = DANH_MUC_ROUTES.filter(
      (r) => keys.filter((k) => k === r).length !== 1,
    );
    expect(thieuHoacLap).toEqual([]);
  });

  it('Hệ thống tài khoản / Quy chuẩn / TK kết chuyển nằm ở Tổng hợp, không lặp ở Danh mục', () => {
    const tongHop = new Set(moiKey(permissionModules.find((m) => m.label === 'Tổng hợp')!.children));
    for (const k of ['/danh-muc/tai-khoan', '/danh-muc/quy-chuan', '/danh-muc/tai-khoan-ket-chuyen']) {
      expect(tongHop.has(k)).toBe(true);
    }
  });

  it('4 trang Thư viện chung nằm ở phân hệ Thư viện', () => {
    const tv = permissionModules.find((m) => m.label === 'Thư viện')!;
    expect(moiKey(tv.children)).toEqual(['/quy-trinh', '/chinh-sach', '/bieu-mau', '/huong-dan']);
  });

  it('mỗi phân hệ nghiệp vụ có quyền Quy trình + Hướng dẫn RIÊNG', () => {
    for (const goc of ['tong-hop', 'von-dong-tien', 'mua-hang', 'ban-hang', 'tien-luong', 'kho', 'tai-san', 'ccdc', 'thue']) {
      const ph = permissionModules.find((m) => m.key === goc)!;
      expect(moiKey(ph.children)).toEqual(
        expect.arrayContaining([`/${goc}/quy-trinh`, `/${goc}/huong-dan`]),
      );
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
  it('không khoá nào của ma trận cũ biến mất (trừ 7 khoá bỏ có chủ ý)', () => {
    const bayGio = new Set(moiKey());
    const bo = new Set(khoaBo as string[]);
    const mat = (maTranTruocDoi as string[]).filter((k) => !bayGio.has(k) && !bo.has(k));
    expect(mat).toEqual([]);
  });

  it('không sinh khoá quyền chưa từng tồn tại (trừ 18 khoá thư viện phân hệ)', () => {
    const moi = new Set(khoaMoi as string[]);
    const la = moiKey().filter((k) => !KHOA_DA_CO.has(k) && !moi.has(k));
    expect(la).toEqual([]);
  });
});

/**
 * BE `PERMISSION_MODULES` là thứ cấp quyền cho công ty TẠO MỚI (và danh sách
 * category Thư viện hợp lệ của config-service suy từ nó). Lệch với ma trận là:
 * thiếu → công ty mới không có quyền trang đó; thừa → quyền "ma" không dòng
 * nào trong ma trận thu hồi được. Đọc thẳng file BE, so hai chiều.
 */
describe('ma trận ↔ BE PERMISSION_MODULES', () => {
  const file = path.resolve(__dirname, '../../../../../../be/libs/core/src/permissions/all-permissions.ts');
  const src = fs.readFileSync(file, 'utf8');
  const dau = src.indexOf('export const PERMISSION_MODULES');
  const khoi = src.slice(dau, src.indexOf('];', dau));
  const be = [...khoi.matchAll(/'([^']+)'/g)].map((m) => m[1]);

  it('BE không lặp khoá', () => {
    expect(be.length).toBe(new Set(be).size);
  });

  it('hai bên đúng cùng một tập khoá', () => {
    const fe = new Set(moiKey());
    const beSet = new Set(be);
    expect({
      beThieu: [...fe].filter((k) => !beSet.has(k)),
      beThua: be.filter((k) => !fe.has(k)),
    }).toEqual({ beThieu: [], beThua: [] });
  });
});

/**
 * Khoá nào bị nhiều mục sidebar dùng chung thì ma trận chỉ hiện được một dòng
 * cho nó — nếu dòng đó mang nhãn của MỘT mục (vd 'Bảng cân đối kế toán') thì
 * admin tưởng tick vào là chỉ cấp báo cáo đó, và không tìm ra dòng nào để thu
 * hồi riêng ba báo cáo còn lại. Test này khẳng định các khoá dùng chung phải
 * mang nhãn nêu rõ "dùng chung", không phải nhãn của mục đầu tiên khai nó.
 */
describe('ma trận — nhãn khoá dùng chung nhiều mục sidebar', () => {
  const timTheoKey = (
    ds: PermissionModule[],
    key: string,
  ): PermissionModule | undefined => {
    for (const m of ds) {
      if (m.key === key) return m;
      if (m.children) {
        const found = timTheoKey(m.children, key);
        if (found) return found;
      }
    }
    return undefined;
  };

  it.each([
    ['/bao-cao/tai-chinh', 'Báo cáo tài chính (cả 4 tab)'],
    [
      '/trung-tam-du-lieu/ke-hoach',
      'Kế hoạch (dùng chung: P&L Kế hoạch, Tổng hợp, Vốn & dòng tiền, Bán hàng, Tiền lương, Tài sản)',
    ],
    [
      '/trung-tam-du-lieu/du-bao',
      'Dự báo (dùng chung: P&L Dự báo, Tổng hợp, Vốn & dòng tiền, Bán hàng, Tiền lương, Tài sản)',
    ],
  ])('khoá %s hiện nhãn đè "%s", không phải nhãn mục đầu tiên', (key, nhan) => {
    const dong = timTheoKey(permissionModules, key);
    expect(dong?.label).toBe(nhan);
  });
});
