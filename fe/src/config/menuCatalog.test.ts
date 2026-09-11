import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import {
  MENU_MODULES, MENU_LEAVES, MENU_CATALOG, pathOf, permissionKeys, leavesOfModule,
  type ModuleId,
} from './menuCatalog';
import { routePermissions } from './routePermissions';
import { DANH_MUC_ROUTES } from './danhMucCatalog';
import keysTruocDoi from './__snapshots__/permission-keys-truoc-doi.json';
import routeTruocDoi from './__snapshots__/route-permissions-truoc-doi.json';
import maTranTruocDoi from '@/pages/cau-hinh/phan-quyen/constants/__snapshots__/matrix-keys-truoc-doi.json';
import khoaMoi from './__snapshots__/khoa-moi-menu-tai-chinh.json';
import khoaBo from './__snapshots__/khoa-bo-menu-tai-chinh.json';

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
 * Tập key quyền ĐÃ TỒN TẠI trong hệ thống = hợp của hai ẢNH CHỤP ĐÓNG BĂNG
 * trước đợt sửa: `permission-keys-truoc-doi.json` (từ `permissionKeys()` cũ)
 * và `matrix-keys-truoc-doi.json` (từ ma trận `permissionModules` cũ).
 *
 * CỐ Ý dùng snapshot TĨNH, không dùng `permissionModules` SỐNG: ma trận sống
 * cũng sinh từ `MENU_LEAVES` giống hệt `permissionKeys()`, nên hợp với nguồn
 * sống sẽ luôn chứa MỌI khoá mà `permissionKeys()` sinh ra — test "tập con"
 * bên dưới thành hằng đúng, không bắt được khoá mới lạ nào. Đã kiểm bằng
 * mutation: thêm một mục `ok` với khoá hoàn toàn mới vào catalog thì bản dùng
 * nguồn sống vẫn xanh; dùng snapshot tĩnh thì đỏ đúng như kỳ vọng.
 */
function keyQuyenDaCo(): Set<string> {
  return new Set([...(keysTruocDoi as string[]), ...(maTranTruocDoi as string[])]);
}

/**
 * Đợt dựng lại menu theo sheet "Menu tài chính" (10/09/2026) CỐ Ý đổi tập khoá:
 * - `khoa-moi-menu-tai-chinh.json`: 18 khoá Quy trình / Hướng dẫn riêng của 9
 *   phân hệ. Khoá mới = chưa vai trò nào có → sau deploy phải cấp cho Admin.
 * - `khoa-bo-menu-tai-chinh.json`: 7 khoá của trang chỉ là khung "đang phát
 *   triển" mà sheet bỏ khỏi menu — không ai mất một trang đang chạy thật.
 * Hai danh sách viết TAY, không sinh lại: thêm/bớt khoá nào khác là test đỏ.
 */
const KHOA_MOI = new Set(khoaMoi as string[]);
const KHOA_BO = new Set(khoaBo as string[]);

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

  it('trang thư viện riêng của phân hệ render thư viện thật, không phải ComingSoon', () => {
    const muc = MENU_LEAVES.filter((l) => l.thuVien);
    expect(muc.length).toBe(18);
    expect(muc.filter((l) => ROUTES.get(pathOf(l)) !== false).map((l) => l.key)).toEqual([]);
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
  it('key quyền sinh ra là tập con của key quyền cũ + đúng danh sách khoá mới', () => {
    const cu = keyQuyenDaCo();
    const themMoi = permissionKeys().filter((k) => !cu.has(k) && !KHOA_MOI.has(k));
    expect(themMoi).toEqual([]);
  });

  it('khoá mới nào cũng thật sự được sinh ra (danh sách không thừa)', () => {
    const sinh = new Set(permissionKeys());
    expect([...KHOA_MOI].filter((k) => !sinh.has(k))).toEqual([]);
  });

  it('khoá bị bỏ không thuộc trang nào đang chạy thật', () => {
    const sai = [...KHOA_BO].filter((k) => ROUTES.has(k) && ROUTES.get(k) === false);
    expect(sai).toEqual([]);
  });

  it('MENU_CATALOG tương thích giữ đủ 26 route danh mục con', () => {
    const keys = new Set(MENU_CATALOG.map((e) => e.key));
    const thieu = DANH_MUC_ROUTES.filter((r) => !keys.has(r));
    expect(thieu).toEqual([]);
  });

  /**
   * XOÁ hai test trước đây ở đây — "mọi khoá routePermissions đều được
   * permissionKeys() sinh lại" và "không key nào trong routePermissions bị
   * catalog bỏ rơi" — vì chúng vòng tròn THẬT SỰ, không chỉ tình cờ đúng lúc
   * viết: `routePermissions.ts` dựng bằng đúng `permissionKeys() ∪
   * DANH_MUC_ROUTES` (hàm `sinhTuCatalog()`), nên so `Object.keys(routePermissions)`
   * với `permissionKeys() ∪ DANH_MUC_ROUTES` hay với `MENU_LEAVES.map(permKeyOf)
   * ∪ DANH_MUC_ROUTES` (tập cha của vế trên) là so một giá trị với chính công
   * thức đã sinh ra nó — không có cách nào đỏ được, kể cả khi catalog sai.
   * Đã kiểm bằng mutation (thêm khoá lạ `/kiem-thu/khoa-la` vào catalog): cả
   * hai vẫn xanh, trong khi test "tập con của key quyền cũ" ở trên (đã sửa
   * dùng snapshot tĩnh) và test "route mới thêm chỉ dùng khoá đã tồn tại" bên
   * dưới đỏ đúng như kỳ vọng — hai test đó đã phủ hết phần việc thật.
   */
});

describe('routePermissions — ảnh chụp đóng băng', () => {
  const cu = routeTruocDoi as Record<string, string>;

  /** Trang chỉ là khung "đang phát triển" nay đánh `soon` cho khỏi nói dối —
   *  khoá vẫn nằm trong ma trận (quyenDaCap) nhưng soon không vào routePermissions. */
  const THANH_SOON = new Set(['/trung-tam-du-lieu/dung-cu']);

  it('mọi cặp route→quyền cũ còn NGUYÊN, cả giá trị (trừ khoá bỏ có chủ ý)', () => {
    const lech = Object.entries(cu)
      .filter(([k]) => !KHOA_BO.has(k) && !THANH_SOON.has(k))
      .filter(([k, v]) => routePermissions[k] !== v)
      .map(([k, v]) => `${k}: ${v} → ${routePermissions[k]}`);
    expect(lech).toEqual([]);
  });

  it('route mới thêm chỉ được dùng khoá quyền ĐÃ TỒN TẠI', () => {
    const daCo = new Set([...(maTranTruocDoi as string[]), ...Object.keys(cu), ...KHOA_MOI]);
    const la = Object.keys(routePermissions).filter((k) => !daCo.has(k));
    expect(la).toEqual([]);
  });
});

/**
 * Chép tay từ sheet "Menu tài chính" (docs/THIẾT KẾ_KẾ TOÁN.xlsx, bản 10/09/2026):
 * cột A = phân hệ, cột B = mục con, đúng thứ tự. "Báo cáo tài chính" là cụm
 * cuối của Tổng hợp (sheet "TỔNG HỢP" xếp nó là một mục của Tổng hợp).
 * Sheet đổi thì sửa bảng này TRƯỚC, rồi mới sửa catalog.
 */
const THEO_SHEET: Record<string, string[]> = {
  'tong-quan': ['Bảng điều hành'],
  'phan-tich': ['P&L Kế hoạch', 'P&L Dự báo', 'P&L', 'So sánh', 'P&L không khấu hao', 'Công nợ', 'Dòng tiền', 'Tồn kho', 'Khả năng thanh toán', 'Chỉ số tài chính'],
  'tong-hop': [
    'Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Thực hiện', 'Quyết toán tạm ứng', 'Bù trừ công nợ',
    'Kết chuyển lãi lỗ', 'Khóa sổ', 'Sổ nhật ký chung', 'Sổ chi tiết tài khoản', 'Sổ chi tiết công nợ',
    'Tổng hợp công nợ', 'Hệ thống tài khoản', 'Quy chuẩn hạch toán', 'Tài khoản kết chuyển',
    'Bảng cân đối kế toán', 'Kết quả kinh doanh', 'Bảng cân đối tài khoản', 'Lưu chuyển tiền tệ', 'Thuyết minh',
  ],
  'von-dong-tien': ['Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Báo cáo', 'Thu tiền', 'Chi tiền', 'Kiểm kê', 'Sổ quỹ', 'Vay, Cho vay', 'Vốn'],
  'mua-hang': ['Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Báo cáo', 'Hợp đồng mua', 'Mua hàng', 'Sổ chi tiết mua hàng', 'Tổng hợp mua hàng', 'Công nợ phải trả'],
  // "Báo cáo doanh thu" KHÔNG có trong sheet — thêm 11/09/2026 khi bỏ thanh ngang Bán
  // hàng (lối vào duy nhất của trang). Xem chú thích ở menuCatalog.
  'ban-hang': ['Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Báo cáo', 'Báo cáo doanh thu', 'Hợp đồng bán', 'Bán hàng', 'Sổ chi tiết bán hàng', 'Tổng hợp bán hàng', 'Công nợ phải thu'],
  'tien-luong': ['Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Báo cáo', 'Chấm công', 'Tính lương', 'Trả lương', 'Hạch toán lương', 'Nộp bảo hiểm', 'Thuế TNCN'],
  kho: ['Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Báo cáo', 'Nhập kho', 'Xuất kho', 'Chuyển kho', 'Tính giá xuất kho', 'Tổng hợp xuất kho', 'Báo cáo nhập xuất tồn'],
  'tai-san': ['Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Báo cáo', 'Quản lý tài sản', 'Phân bổ khấu hao', 'Tính khấu hao', 'Điều chuyển'],
  ccdc: ['Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Báo cáo', 'Quản lý công cụ dụng cụ', 'Phân bổ', 'Điều chuyển'],
  thue: ['Quy trình', 'Hướng dẫn', 'Kế hoạch', 'Dự báo', 'Tạm tính Thuế TNDN', 'Tổng hợp', 'Bảng kê mua vào', 'Bảng kê bán ra'],
  'yc-thanh-toan': ['Cổng yêu cầu thanh toán'],
  'yc-xuat-hoa-don': ['Cổng yêu cầu xuất hóa đơn'],
  'thu-vien': ['Quy trình', 'Chính sách', 'Biểu mẫu', 'Hướng dẫn'],
  'danh-muc': ['Danh mục'],
};

describe('menu khớp sheet "Menu tài chính"', () => {
  it('đúng phân hệ, đúng thứ tự', () => {
    expect(MENU_MODULES.map((m) => m.id)).toEqual(Object.keys(THEO_SHEET));
  });

  it.each(Object.entries(THEO_SHEET))('phân hệ %s: đúng mục, đúng thứ tự', (id, nhan) => {
    expect(leavesOfModule(id as ModuleId).map((l) => l.label)).toEqual(nhan);
  });

  it('mọi phân hệ nghiệp vụ có Quy trình + Hướng dẫn là thư viện riêng', () => {
    const coThuVien = MENU_MODULES.filter((m) =>
      leavesOfModule(m.id).some((l) => l.thuVien),
    ).map((m) => m.id);
    expect(coThuVien).toEqual([
      'tong-hop', 'von-dong-tien', 'mua-hang', 'ban-hang', 'tien-luong', 'kho', 'tai-san', 'ccdc', 'thue',
    ]);
  });
});
