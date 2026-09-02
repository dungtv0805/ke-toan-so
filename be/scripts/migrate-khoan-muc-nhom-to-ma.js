/**
 * Quy `khoan_muc.nhom` về MÃ nhóm khoản mục.
 *
 * Danh mục Khoản mục lưu `nhom` bằng MÃ (form Khoản mục gán `o.ma`), nhưng đường
 * import Excel trước 02/09/2026 ghi thẳng nội dung ô "Nhóm" xuống DB không tra mã.
 * Công ty nào nhập bằng TÊN nhóm thì `nhom` thành tên, và mọi chỗ lọc theo mã im
 * lặng không khớp gì — rõ nhất là ô "Khoản mục" trong Quy chuẩn hạch toán: chọn
 * nhóm xong danh sách khoản mục trống trơn, người dùng tưởng chức năng hỏng.
 *
 * Script chỉ đổi giá trị `nhom`, không đụng trường nào khác.
 *
 * - Idempotent: bản ghi đã lưu đúng mã thì bỏ qua → chạy lại an toàn.
 * - Dò theo TÊN, chỉ đổi khi tên đó khớp ĐÚNG MỘT nhóm trong cùng tenant. Trùng
 *   tên thì báo ra và không đụng, vì đoán bừa là gán sai nhóm âm thầm.
 * - Bản ghi có `nhom` không khớp mã lẫn tên nào (dữ liệu seed demo, vd
 *   "CHI_PHI_NGUYEN_VAT_LIEU") được liệt kê riêng và KHÔNG đụng tới — sửa chúng
 *   là quyết định nghiệp vụ, không phải việc của script này.
 *
 * TOÀN BỘ thân script nằm trong một IIFE: khi pipe qua stdin, mongosh chạy chế độ
 * REPL và đánh giá TỪNG DÒNG — biểu thức trải nhiều dòng sẽ bị cắt và gán sai giá
 * trị mà không báo lỗi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY (từ máy local, qua SSH tới server prod):
 *
 *   cat be/scripts/migrate-khoan-muc-nhom-to-ma.js | \
 *     ssh kt "TENANT=<tenantId hoặc ALL> DRY=1 \
 *       docker exec -i -e TENANT -e DRY mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * DRY=1 chỉ in ra dự định, không ghi. Bỏ DRY (hoặc DRY=0) để ghi thật.
 * TENANT=ALL chạy cho mọi tenant.
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  var TENANT = (typeof process !== "undefined" && process.env.TENANT) || "";
  var DRY = (typeof process !== "undefined" && process.env.DRY) === "1";

  if (!TENANT) {
    print("LỖI: cần TENANT=<tenantId> hoặc TENANT=ALL.");
    return;
  }

  var locKhoanMuc = TENANT === "ALL" ? {} : { tenantId: TENANT };
  var locNhom = TENANT === "ALL" ? {} : { tenantId: TENANT };

  // Chỉ mục theo tenant: mã nhóm là duy nhất trong tenant, tên thì không chắc.
  var maCuaTenant = {};
  var theoTen = {};
  db.nhom_khoan_muc.find(locNhom).forEach(function (n) {
    maCuaTenant[n.tenantId + "|" + n.ma] = true;
    var khoaTen = n.tenantId + "|" + n.ten;
    if (!theoTen[khoaTen]) theoTen[khoaTen] = [];
    theoTen[khoaTen].push(n.ma);
  });

  var daDung = 0;
  var trong = 0;
  var doiDuoc = [];
  var trungTen = [];
  var khongKhop = [];

  db.khoan_muc.find(locKhoanMuc).forEach(function (k) {
    if (!k.nhom) {
      trong++;
      return;
    }
    if (maCuaTenant[k.tenantId + "|" + k.nhom]) {
      daDung++;
      return;
    }
    var ungVien = theoTen[k.tenantId + "|" + k.nhom];
    if (!ungVien) {
      khongKhop.push(k.tenantId + " / " + k.ma + " / nhom=" + k.nhom);
      return;
    }
    if (ungVien.length > 1) {
      trungTen.push(k.tenantId + " / " + k.ma + " / nhom=" + k.nhom + " → " + ungVien.join("|"));
      return;
    }
    doiDuoc.push({ _id: k._id, tu: k.nhom, sang: ungVien[0], ma: k.ma, tenantId: k.tenantId });
  });

  print("Đã đúng mã: " + daDung + "   |   Bỏ trống nhóm: " + trong);
  print("Sẽ đổi tên → mã: " + doiDuoc.length);
  doiDuoc.slice(0, 20).forEach(function (d) {
    print("   " + d.tenantId + " / " + d.ma + ": \"" + d.tu + "\" → \"" + d.sang + "\"");
  });
  if (doiDuoc.length > 20) print("   … và " + (doiDuoc.length - 20) + " bản ghi nữa");

  if (trungTen.length) {
    print("BỎ QUA (trùng tên, phải sửa tay): " + trungTen.length);
    trungTen.forEach(function (t) { print("   " + t); });
  }
  if (khongKhop.length) {
    print("BỎ QUA (không khớp mã lẫn tên nào): " + khongKhop.length);
    khongKhop.slice(0, 10).forEach(function (t) { print("   " + t); });
    if (khongKhop.length > 10) print("   … và " + (khongKhop.length - 10) + " bản ghi nữa");
  }

  if (DRY) {
    print("DRY=1 — không ghi gì.");
    return;
  }

  var daGhi = 0;
  doiDuoc.forEach(function (d) {
    var r = db.khoan_muc.updateOne({ _id: d._id }, { $set: { nhom: d.sang } });
    daGhi += r.modifiedCount;
  });
  print("ĐÃ GHI: " + daGhi + " bản ghi.");
})();
