/**
 * Gán chiều Thu/Chi cho các Nhóm dòng tiền đã có.
 *
 * Từ 02/09/2026 bảng Kế hoạch dòng tiền bỏ cột "Thu/Chi" và suy chiều từ nhóm
 * (`NhomDongTien.chieu`). Nhóm nào chưa khai chiều thì dòng của nó rơi về chiều
 * cũ lưu trên từng dòng kế hoạch — chạy được, nhưng dòng MỚI sẽ mặc định THU.
 * Script này khai sẵn chiều cho các nhóm đang có.
 *
 * ĐOÁN THEO TỪ ĐẦU TIÊN của tên, không phải theo tiền tố mã: 76 nhóm hiện có
 * tiền tố lẫn lộn C/N/NC/NT/T và có nhóm `N01 "Chi cho nhà cung cấp"` (tiền tố
 * N nhưng là Chi). So khớp theo TỪ trọn vẹn chứ không phải prefix chuỗi —
 * "Thuế" bắt đầu bằng "Thu" nhưng không phải chiều thu.
 *
 * - Idempotent: nhóm đã có `chieu` thì bỏ qua → chạy lại an toàn.
 * - Đoán không ra thì để trống và liệt kê riêng, KHÔNG đoán bừa: gán sai chiều
 *   làm TỒN CUỐI KỲ sai mà không có dấu hiệu gì trên màn hình.
 *
 * TOÀN BỘ thân script nằm trong một IIFE — mongosh đọc stdin theo chế độ REPL,
 * biểu thức nhiều dòng bị cắt và gán sai giá trị mà không báo lỗi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 *   cat be/scripts/backfill-chieu-nhom-dong-tien.js | \
 *     ssh kt "DRY=1 docker exec -i -e DRY mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * DRY=1 chỉ in dự định. Bỏ DRY (hoặc DRY=0) để ghi thật.
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  var DRY = (typeof process !== "undefined" && process.env.DRY) === "1";

  /** Từ đầu tiên của một chuỗi, đã bỏ dấu câu và hạ chữ thường. */
  function tuDau(chuoi) {
    var s = String(chuoi || "").trim().toLowerCase();
    var m = s.match(/^[^\s.,:;/()-]+/);
    return m ? m[0] : "";
  }

  /**
   * Đoán chiều: ưu tiên tên nhóm, không ra thì thử mô tả ("Tiền thu từ…").
   * Trả null khi không chắc.
   */
  function doanChieu(n) {
    var t = tuDau(n.ten);
    if (t === "thu") return "THU";
    if (t === "chi") return "CHI";

    var mo = String(n.moTa || "").toLowerCase();
    var coThu = /(^|\s)ti[eề]n thu(\s|$)/.test(mo) || /(^|\s)thu t[uừ](\s|$)/.test(mo);
    var coChi = /(^|\s)ti[eề]n chi(\s|$)/.test(mo) || /(^|\s)chi tr[aả](\s|$)/.test(mo);
    if (coThu && !coChi) return "THU";
    if (coChi && !coThu) return "CHI";
    return null;
  }

  var daCo = 0;
  var seGan = [];
  var khongDoanDuoc = [];

  db.nhom_dong_tien.find({}).forEach(function (n) {
    if (n.chieu === "THU" || n.chieu === "CHI") {
      daCo++;
      return;
    }
    var chieu = doanChieu(n);
    if (!chieu) {
      khongDoanDuoc.push(n.tenantId + " / " + n.ma + " - " + n.ten);
      return;
    }
    seGan.push({ _id: n._id, ma: n.ma, ten: n.ten, chieu: chieu, tenantId: n.tenantId });
  });

  print("Đã khai chiều sẵn: " + daCo);
  print("Sẽ gán: " + seGan.length);
  seGan.forEach(function (g) {
    print("   [" + g.chieu + "]  " + g.ma + " - " + g.ten);
  });
  if (khongDoanDuoc.length) {
    print("KHÔNG ĐOÁN ĐƯỢC (để trống, khai tay ở Danh mục): " + khongDoanDuoc.length);
    khongDoanDuoc.forEach(function (t) { print("   " + t); });
  }

  if (DRY) {
    print("DRY=1 — không ghi gì.");
    return;
  }

  var daGhi = 0;
  seGan.forEach(function (g) {
    daGhi += db.nhom_dong_tien.updateOne({ _id: g._id }, { $set: { chieu: g.chieu } }).modifiedCount;
  });
  print("ĐÃ GHI: " + daGhi + " nhóm.");
})();
