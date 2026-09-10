// Cấp quyền cho các mục menu mới theo sheet "Menu tài chính" (10/09/2026).
//
// KHÔNG cấp tràn cho vai trò Admin: nhiều công ty đã cố ý thu hẹp Admin còn
// 3 quyền Cấu hình. Thay vào đó, quyền mới đi theo quyền TƯƠNG ỨNG đang có,
// trên MỌI vai trò, giữ nguyên từng hành động (xem/them/sua/xoa/xuat):
//   - có `/quy-trinh:<a>`  → thêm `/<phân hệ>/quy-trinh:<a>` cho 9 phân hệ
//   - có `/huong-dan:<a>`  → thêm `/<phân hệ>/huong-dan:<a>` cho 9 phân hệ
//   - có `/phan-tich/bao-cao-tai-chinh:<a>` (mục "P&L" cũ, trang chưa có)
//     → thêm `/bao-cao/pnl:<a>` (mục "P&L" mới trỏ trang P&L thật)
//   - vai trò Admin đang mang BỘ CẤP PHÁT ĐẦY ĐỦ (>= 300 quyền, sinh bởi
//     generateAllPermissions lúc tạo công ty) → nâng lên đủ bộ mới, đúng như
//     công ty tạo mới hôm nay nhận được. Admin đã bị thu hẹp thì không đụng.
// Chỉ $addToSet — không xoá quyền nào, chạy lại bao nhiêu lần cũng vậy.
//
// Chạy: mongosh '<uri>/digital_book?authSource=admin' --quiet --file grant-menu-tai-chinh.js
// Dry-run (mặc định): chỉ in; đặt biến môi trường thật bằng --eval 'var APPLY=true' trước --file.
(function () {
  var apply = typeof APPLY !== 'undefined' && APPLY === true;
  var PHAN_HE = ['tong-hop', 'von-dong-tien', 'mua-hang', 'ban-hang', 'tien-luong', 'kho', 'tai-san', 'ccdc', 'thue'];
  var ACTS = ['xem', 'them', 'sua', 'xoa', 'xuat'];
  // Bản chép của be/libs/core/src/permissions/all-permissions.ts PERMISSION_MODULES (10/09/2026).
  var MODULES = ["/tong-quan", "/trung-tam-du-lieu/ke-hoach", "/trung-tam-du-lieu/du-bao", "/bao-cao/pnl", "/bao-cao/pnl-3-lop", "/bao-cao/pnl-khong-khau-hao", "/phan-tich/cong-no", "/phan-tich/dong-tien", "/phan-tich/ton-kho", "/phan-tich/thanh-khoan", "/tong-hop/quy-trinh", "/tong-hop/huong-dan", "/chung-tu/ket-chuyen-lai-lo", "/chung-tu/nhat-ky-chung", "/bao-cao/so-chi-tiet-tai-khoan", "/bao-cao/so-chi-tiet-cong-no", "/bao-cao/bang-tong-hop", "/danh-muc/tai-khoan", "/danh-muc/quy-chuan", "/danh-muc/tai-khoan-ket-chuyen", "/bao-cao/tai-chinh", "/bep-an/dinh-muc-tien-an", "/bep-an/cong-thuc-dinh-luong", "/bep-an/diem-danh-an", "/bep-an/de-xuat-mua", "/bep-an/kiem-soat-chi-phi", "/bao-cao/so-cai", "/bao-cao/bang-can-doi", "/von-dong-tien/quy-trinh", "/von-dong-tien/huong-dan", "/chung-tu/phieu-thu", "/chung-tu/phieu-chi", "/so-quy", "/mua-hang/quy-trinh", "/mua-hang/huong-dan", "/cong-no/phai-tra", "/ban-hang/quy-trinh", "/ban-hang/huong-dan", "/bao-cao/hop-dong", "/danh-muc/hop-dong", "/trung-tam-du-lieu/hop-dong", "/cong-no/phai-thu", "/trung-tam-du-lieu/thu-tien-hop-dong", "/trung-tam-du-lieu/hd-ban-ra", "/bao-cao/doanh-thu", "/tien-luong/quy-trinh", "/tien-luong/huong-dan", "/kho/quy-trinh", "/kho/huong-dan", "/kho/nhap-kho", "/kho/xuat-kho", "/kho/chuyen-kho", "/tai-san/quy-trinh", "/tai-san/huong-dan", "/trung-tam-du-lieu/tai-san", "/ccdc/quy-trinh", "/ccdc/huong-dan", "/trung-tam-du-lieu/dung-cu", "/thue/quy-trinh", "/thue/huong-dan", "/thue/bao-cao-tndn", "/thue/tong-hop", "/thue/bang-ke-mua-vao", "/thue/bang-ke-ban-ra", "/quy-trinh", "/chinh-sach", "/bieu-mau", "/huong-dan", "/danh-muc/doi-tuong", "/danh-muc/chu-dau-tu", "/danh-muc/nhom-quan-ly", "/danh-muc/bo-phan", "/danh-muc/so-du-dau-ky", "/danh-muc/hang-hoa-vat-tu", "/danh-muc/nhom-vat-tu", "/danh-muc/don-vi-tinh", "/danh-muc/kho", "/danh-muc/san-pham", "/danh-muc/nhom-san-pham", "/danh-muc/du-an", "/danh-muc/nhom-khuyen-mai", "/danh-muc/ngan-hang", "/danh-muc/dong-tien", "/danh-muc/nhom-dong-tien", "/danh-muc/khoan-muc", "/danh-muc/nhom-khoan-muc", "/danh-muc/loai-chung-tu", "/danh-muc/loai-giao-dich", "/danh-muc/ho-so-chung-tu", "/danh-muc/ly-do-khong-hop-le", "/cau-hinh/vai-tro", "/cau-hinh/phan-quyen", "/cau-hinh/thanh-vien"];

  var tong = 0;
  var suaDoc = 0;
  db.phan_quyen.find({}, { tenantId: 1, vaiTro: 1, permissions: 1 }).forEach(function (d) {
    var p = d.permissions || [];
    var co = {};
    p.forEach(function (k) { co[k] = true; });
    var them = [];
    ACTS.forEach(function (a) {
      ['quy-trinh', 'huong-dan'].forEach(function (lib) {
        if (!co['/' + lib + ':' + a]) return;
        PHAN_HE.forEach(function (ph) {
          var k = '/' + ph + '/' + lib + ':' + a;
          if (!co[k]) them.push(k);
        });
      });
      if (co['/phan-tich/bao-cao-tai-chinh:' + a] && !co['/bao-cao/pnl:' + a]) {
        them.push('/bao-cao/pnl:' + a);
      }
    });
    if (/^admin$/i.test(d.vaiTro || '') && p.length >= 300) {
      MODULES.forEach(function (m) {
        ACTS.forEach(function (a) {
          var k = m + ':' + a;
          if (!co[k] && them.indexOf(k) < 0) them.push(k);
        });
      });
    }
    if (them.length === 0) return;
    tong += them.length;
    suaDoc += 1;
    print(d.tenantId + ' | ' + d.vaiTro + ' | +' + them.length);
    if (apply) {
      db.phan_quyen.updateOne({ _id: d._id }, { $addToSet: { permissions: { $each: them } } });
    }
  });
  print((apply ? 'DA CAP' : 'DRY-RUN') + ': ' + suaDoc + ' vai tro, ' + tong + ' quyen');
})();
