import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  MENU_MODULES, MENU_LEAVES, MENU_CATALOG, pathOf, permKeyOf, permissionKeys,
} from './menuCatalog';
import { routePermissions } from './routePermissions';
import { DANH_MUC_ROUTES } from './danhMucCatalog';
import {
  permissionModules,
  type PermissionModule,
} from '@/pages/cau-hinh/phan-quyen/constants/permissionModules';
import keysTruocDoi from './__snapshots__/permission-keys-truoc-doi.json';
import routeTruocDoi from './__snapshots__/route-permissions-truoc-doi.json';
import maTranTruocDoi from '@/pages/cau-hinh/phan-quyen/constants/__snapshots__/matrix-keys-truoc-doi.json';

/**
 * Đọc App.tsx bằng AST của chính TypeScript, KHÔNG dùng regex theo dòng.
 * Lý do: 51 thẻ <Route> trong App.tsx viết xuống nhiều dòng và có 3 thẻ
 * <Route index>; regex một dòng bỏ sót gần hết, làm test báo sai hàng loạt.
 *
 * Trả map: đường dẫn đầy đủ → có phải ComingSoonPage không.
 * Chỉ ghi những Route CÓ `element` (route thật). Thẻ bọc như
 * `<Route path="danh-muc">` không có element nên bị bỏ qua — nó là nhóm,
 * không phải trang.
 */
function docRouteTuApp(): Map<string, boolean> {
  const file = path.resolve(__dirname, '../App.tsx');
  const src = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const out = new Map<string, boolean>();

  const thuocTinh = (
    the: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
    ten: string,
  ): ts.JsxAttribute | undefined =>
    the.attributes.properties.find(
      (a): a is ts.JsxAttribute => ts.isJsxAttribute(a) && a.name.getText() === ten,
    );

  const duyet = (node: ts.Node, cha: string): void => {
    let hienTai = cha;
    const the = ts.isJsxElement(node)
      ? node.openingElement
      : ts.isJsxSelfClosingElement(node)
        ? node
        : undefined;

    if (the && the.tagName.getText() === 'Route') {
      const aPath = thuocTinh(the, 'path');
      const aIndex = thuocTinh(the, 'index');
      const aElement = thuocTinh(the, 'element');

      if (aPath?.initializer && ts.isStringLiteral(aPath.initializer)) {
        hienTai = (cha + '/' + aPath.initializer.text).replace(/\/+/g, '/');
      } else if (aIndex) {
        hienTai = cha || '/';
      }
      if (aElement) {
        out.set(hienTai, /ComingSoonPage/.test(aElement.getText()));
      }
    }

    node.forEachChild((con) => duyet(con, hienTai));
  };

  duyet(src, '');
  return out;
}

/**
 * Tập key quyền ĐÃ TỒN TẠI trong hệ thống = hợp của hai nguồn:
 * `routePermissions` (nơi ProtectedRoute tra) và ma trận `permissionModules`
 * (nơi admin bấm cấp quyền). Một key có ở bất kỳ nguồn nào cũng là quyền cũ,
 * không phải quyền mới. Ví dụ `/bao-cao/bang-tong-hop` có trong ma trận nhưng
 * thiếu trong routePermissions — lỗ hổng có sẵn, không phải do đợt này tạo ra.
 */
function keyQuyenDaCo(): Set<string> {
  const la = (ds: PermissionModule[]): string[] =>
    ds.flatMap((m) => (m.children ? la(m.children) : [m.key]));
  return new Set([...(keysTruocDoi as string[]), ...la(permissionModules)]);
}

const ROUTES = docRouteTuApp();

describe('menuCatalog ↔ App.tsx', () => {
  it('mọi mục status=ok phải có route thật, không phải ComingSoon', () => {
    const sai = MENU_LEAVES.filter((l) => l.status === 'ok').filter((l) => {
      const p = pathOf(l);
      return !ROUTES.has(p) || ROUTES.get(p) === true;
    });
    expect(sai.map((l) => l.key)).toEqual([]);
  });

  it('mọi mục soon phải có route, dù chỉ là ComingSoon', () => {
    const thieu = MENU_LEAVES.filter(
      (l) => l.status === 'soon' && !ROUTES.has(pathOf(l)),
    );
    expect(thieu.map((l) => l.key)).toEqual([]);
  });

  it('mọi route trong App.tsx phải được khai trong catalog', () => {
    const BO_QUA = [
      '/login', '/profile', '/*',
      '/cau-hinh/',        // trang cấu hình vào từ menu bánh răng
      '/tao-moi', '/sua',  // route con của trang biểu mẫu
      '/:',                // route có tham số
    ];
    // MENU_CATALOG chứ không phải MENU_LEAVES: 26 trang danh mục con nằm ở
    // danhMucCatalog và chỉ xuất hiện qua MENU_CATALOG.
    const daKhai = new Set(MENU_CATALOG.map((e) => e.key));
    const thieu = [...ROUTES.keys()].filter(
      (r) => !daKhai.has(r) && !BO_QUA.some((b) => r.includes(b)),
    );
    expect(thieu).toEqual([]);
  });
});

describe('menuCatalog — toàn vẹn', () => {
  it('key không trùng nhau', () => {
    const keys = MENU_LEAVES.map((l) => l.key);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('mọi mục trỏ một phân hệ có thật', () => {
    const ids = new Set(MENU_MODULES.map((m) => m.id));
    const sai = MENU_LEAVES.filter((l) => !ids.has(l.module));
    expect(sai.map((l) => l.key)).toEqual([]);
  });

  it('mục mang query string bắt buộc khai permKey', () => {
    const sai = MENU_LEAVES.filter((l) => l.key.includes('?') && !l.permKey);
    expect(sai.map((l) => l.key)).toEqual([]);
  });

  /**
   * MENU_CATALOG quy mọi mục về `pathOf`, nên 8 mục mang `?tab=` cộng 2 mục
   * legacy dồn về 2 path. Key trùng làm <Tree> của trang Lĩnh vực báo lỗi key
   * trùng, và `handleSubmit` lưu cùng một key nhiều lần xuống `menuKeys`.
   */
  it('MENU_CATALOG không có key trùng', () => {
    const keys = MENU_CATALOG.map((e) => e.key);
    const trung = [...new Set(keys.filter((k, i) => keys.indexOf(k) !== i))];
    expect(trung).toEqual([]);
  });
});

describe('phân quyền — không cấp lại', () => {
  it('key quyền sinh ra là tập con của key quyền cũ', () => {
    const cu = keyQuyenDaCo();
    const themMoi = permissionKeys().filter((k) => !cu.has(k));
    expect(themMoi).toEqual([]);
  });

  it('MENU_CATALOG tương thích giữ đủ 26 route danh mục con', () => {
    const keys = new Set(MENU_CATALOG.map((e) => e.key));
    const thieu = DANH_MUC_ROUTES.filter((r) => !keys.has(r));
    expect(thieu).toEqual([]);
  });

  /**
   * Chiều ngược của test dưới: không chỉ "có khai trong MENU_LEAVES" mà phải
   * được `permissionKeys()` SINH RA. Đợt sau sinh ma trận phân quyền từ hàm
   * này — khoá nào rơi khỏi đây thì biến khỏi ma trận, và mỗi lần lưu trang
   * Phân quyền sẽ xoá nó khỏi vai trò.
   */
  it('mọi khoá routePermissions đều được permissionKeys() sinh lại', () => {
    const sinhRa = new Set([...permissionKeys(), ...DANH_MUC_ROUTES]);
    const roiRung = Object.keys(routePermissions).filter(
      (k) => !sinhRa.has(k) && !k.startsWith('/cau-hinh/'),
    );
    expect(roiRung).toEqual([]);
  });

  it('không key nào trong routePermissions bị catalog bỏ rơi', () => {
    const daKhai = new Set([
      ...MENU_LEAVES.map(permKeyOf),
      ...DANH_MUC_ROUTES,
    ]);
    const roiRung = Object.keys(routePermissions).filter(
      (k) => !daKhai.has(k) && !k.startsWith('/cau-hinh/'),
    );
    expect(roiRung).toEqual([]);
  });
});

/**
 * `routePermissions` giờ SINH từ catalog, nên hai test ở trên
 * ("mọi khoá routePermissions đều được permissionKeys() sinh lại" và "không key
 * nào bị catalog bỏ rơi") đã thành vòng tròn — chúng chỉ còn canh phần khai tay.
 * Chốt chặn thật nằm ở đây: đối chiếu với ẢNH CHỤP ĐÓNG BĂNG của bảng cũ.
 * KHÔNG sinh lại hai file snapshot này.
 */
describe('routePermissions — ảnh chụp đóng băng', () => {
  const cu = routeTruocDoi as Record<string, string>;

  it('mọi cặp route→quyền cũ còn NGUYÊN, cả giá trị', () => {
    const lech = Object.entries(cu)
      .filter(([k, v]) => routePermissions[k] !== v)
      .map(([k, v]) => `${k}: ${v} → ${routePermissions[k]}`);
    expect(lech).toEqual([]);
  });

  it('route mới thêm chỉ được dùng khoá quyền ĐÃ TỒN TẠI', () => {
    const daCo = new Set([...(maTranTruocDoi as string[]), ...Object.keys(cu)]);
    const la = Object.keys(routePermissions).filter((k) => !daCo.has(k));
    expect(la).toEqual([]);
  });
});
