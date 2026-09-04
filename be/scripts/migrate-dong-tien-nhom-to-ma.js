/**
 * Quy `dong_tien.nhom` về MÃ nhóm dòng tiền.
 *
 * Anh em sinh đôi của `migrate-khoan-muc-nhom-to-ma.js`, cùng một lỗi gốc: cột
 * "Nhóm dòng tiền" trong import Excel trước 04/09/2026 KHÔNG khai `ref`, nên nội
 * dung ô đi thẳng xuống DB. Công ty nào gõ TÊN nhóm ("Chi Marketing & bán hàng")
 * thay vì mã ("NC03") thì mọi chỗ tra theo mã im lặng không khớp.
 *
 * Triệu chứng người dùng báo (04/09/2026, Oneness World): bảng Kế hoạch ▸ Dòng
 * tiền có dòng C11 nằm trong khối THU dù nhóm NC03 đã khai chiều CHI — vì
 * `chieuCuaNhom` tra `n.ma === "Chi Marketing & bán hàng"` không ra nhóm nào nên
 * rơi về mặc định THU, kèm cảnh báo "nhóm chưa khai Thu/Chi" sai địa chỉ. Sửa
 * xong lẻ một dòng thì bảng đẻ ra HAI hàng nhóm cùng tên (một theo key "NC03",
 * một theo key là chuỗi tên) — dấu hiệu rõ nhất của lỗi này.
 *
 * Script chỉ đổi giá trị `nhom`, không đụng trường nào khác.
 *
 * - Idempotent: bản ghi đã lưu đúng mã thì bỏ qua → chạy lại an toàn.
 * - Dò theo TÊN, chỉ đổi khi tên đó khớp ĐÚNG MỘT nhóm trong cùng tenant. Trùng
 *   tên thì báo ra và không đụng, vì đoán bừa là gán sai nhóm âm thầm.
 * - Nhóm khớp tên nhưng ĐÃ XOÁ MỀM (`isActive: false`) vẫn được quy về mã, nhưng
 *   liệt kê riêng: mã đúng vẫn hơn tên trần, song danh mục không đổ nhóm đó vào ô
 *   chọn nên nghiệp vụ phải quyết định khôi phục nhóm hay gán lại nhóm khác.
 * - Bản ghi có `nhom` không khớp mã lẫn tên nào được liệt kê riêng và KHÔNG đụng.
 *
 * TOÀN BỘ thân script nằm trong một IIFE: khi pipe qua stdin, mongosh chạy chế độ
 * REPL và đánh giá TỪNG DÒNG — biểu thức trải nhiều dòng sẽ bị cắt và gán sai giá
 * trị mà không báo lỗi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY (từ máy local, qua SSH tới server prod):
 *
 *   cat be/scripts/migrate-dong-tien-nhom-to-ma.js | \
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

  var loc = TENANT === "ALL" ? {} : { tenantId: TENANT };

  // Chỉ mục theo tenant: mã nhóm là duy nhất trong tenant, tên thì không chắc.
  var maCuaTenant = {};
  var theoTen = {};
  db.nhom_dong_tien.find(loc).forEach(function (n) {
    maCuaTenant[n.tenantId + "|" + n.ma] = true;
    var khoaTen = n.tenantId + "|" + String(n.ten || "").trim();
    if (!theoTen[khoaTen]) theoTen[khoaTen] = [];
    theoTen[khoaTen].push({ ma: n.ma, isActive: n.isActive });
  });

  var daDung = 0;
  var trong = 0;
  var doiDuoc = [];
  var nhomDaXoa = [];
  var trungTen = [];
  var khongKhop = [];

  db.dong_tien.find(loc).forEach(function (d) {
    if (!d.nhom) {
      trong++;
      return;
    }
    if (maCuaTenant[d.tenantId + "|" + d.nhom]) {
      daDung++;
      return;
    }
    var ungVien = theoTen[d.tenantId + "|" + String(d.nhom).trim()];
    if (!ungVien) {
      khongKhop.push(d.tenantId + " / " + d.ma + " / nhom=" + d.nhom);
      return;
    }
    if (ungVien.length > 1) {
      var maUV = ungVien.map(function (u) { return u.ma; });
      trungTen.push(d.tenantId + " / " + d.ma + " / nhom=" + d.nhom + " → " + maUV.join("|"));
      return;
    }
    doiDuoc.push({ _id: d._id, tu: d.nhom, sang: ungVien[0].ma, ma: d.ma, tenantId: d.tenantId });
    if (!ungVien[0].isActive) {
      nhomDaXoa.push(d.tenantId + " / " + d.ma + " → " + ungVien[0].ma + " (\"" + d.nhom + "\")");
    }
  });

  print("Đã đúng mã: " + daDung + "   |   Bỏ trống nhóm: " + trong);
  print("Sẽ đổi tên → mã: " + doiDuoc.length);
  doiDuoc.slice(0, 20).forEach(function (d) {
    print("   " + d.tenantId + " / " + d.ma + ": \"" + d.tu + "\" → \"" + d.sang + "\"");
  });
  if (doiDuoc.length > 20) print("   … và " + (doiDuoc.length - 20) + " bản ghi nữa");

  if (nhomDaXoa.length) {
    print("ĐỔI NHƯNG nhóm đích ĐÃ XOÁ MỀM (nghiệp vụ cần xử lý tiếp): " + nhomDaXoa.length);
    nhomDaXoa.forEach(function (t) { print("   " + t); });
  }
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
    var r = db.dong_tien.updateOne({ _id: d._id }, { $set: { nhom: d.sang } });
    daGhi += r.modifiedCount;
  });
  print("ĐÃ GHI: " + daGhi + " bản ghi.");
})();
