/**
 * Gắn `danhMuc.nghiepVu` cho các dòng kết chuyển đã lập, theo đúng thứ tự ưu tiên mà
 * BE dùng khi ghi sổ: Quy chuẩn (loại giao dịch + cặp TK Nợ/Có) trước, thiếu thì lấy
 * diễn giải của dòng danh mục Tài khoản kết chuyển.
 *
 * - Idempotent: bỏ qua dòng đã có `danhMuc.nghiepVu` → chạy lại an toàn.
 * - Chỉ đụng `nguon: "KET_CHUYEN"` của đúng tenant truyền vào.
 * - Lấy MA_LGD từ cau_hinh_ket_chuyen nếu không truyền vào.
 *
 * Bọc IIFE vì mongosh đọc stdin theo kiểu REPL, đánh giá từng dòng — biểu thức nhiều
 * dòng bị cắt và gán sai mà không báo lỗi.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY:
 *   cat be/scripts/backfill-nghiep-vu-ket-chuyen.js | \
 *     ssh kt "TENANT=<tenantId> DRY=1 \
 *       docker exec -i -e TENANT -e MA_LGD -e DRY mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  var TENANT = (typeof process !== "undefined" && process.env.TENANT) || "";
  var MA_LGD = (typeof process !== "undefined" && process.env.MA_LGD) || "";
  var DRY = (typeof process !== "undefined" && process.env.DRY) === "1";

  if (!TENANT) {
    print("LỖI: cần TENANT=<tenantId>.");
    return;
  }

  if (!MA_LGD) {
    var ch = db.cau_hinh_ket_chuyen.findOne({ tenantId: TENANT });
    MA_LGD = ch && ch.loaiGiaoDichMa ? ch.loaiGiaoDichMa : "";
  }
  print("Tenant  : " + TENANT);
  print("Loại GD : " + (MA_LGD || "(không có — chỉ dùng diễn giải danh mục)"));

  // Quy chuẩn: cặp TK Nợ|Có -> nghiệp vụ. Dòng đầu khớp thắng, bỏ dòng đã tắt.
  var quyChuan = {};
  if (MA_LGD) {
    db.quy_chuan.find({ tenantId: TENANT, loaiGiaoDich: MA_LGD }).forEach(function (r) {
      if (r.isActive === false || !r.taiKhoanNo || !r.taiKhoanCo || !r.nghiepVu) return;
      var k = r.taiKhoanNo + "|" + r.taiKhoanCo;
      if (!quyChuan[k]) quyChuan[k] = r.nghiepVu;
    });
  }
  print("Quy chuẩn khớp được: " + Object.keys(quyChuan).length + " cặp TK");

  // Diễn giải danh mục theo mã kết chuyển (nguồn dự phòng).
  var dienGiai = {};
  db.tai_khoan_ket_chuyen.find({ tenantId: TENANT }).forEach(function (r) {
    if (r.ma && r.dienGiai) dienGiai[r.ma] = r.dienGiai;
  });

  var filter = { tenantId: TENANT, nguon: "KET_CHUYEN", "danhMuc.nghiepVu": { $exists: false } };
  var canSua = db.chung_tu.countDocuments(filter);
  print("Dòng cần gắn nghiệp vụ: " + canSua);
  if (canSua === 0) {
    print("Không có dòng nào — dừng.");
    return;
  }

  var thongKe = {};
  var khongRa = 0;
  var doiSua = [];
  db.chung_tu.find(filter).forEach(function (ct) {
    var no = ct.danhMuc && ct.danhMuc.taiKhoanNo ? ct.danhMuc.taiKhoanNo.ma : null;
    var co = ct.danhMuc && ct.danhMuc.taiKhoanCo ? ct.danhMuc.taiKhoanCo.ma : null;
    var nv = null;
    if (no && co && quyChuan[no + "|" + co]) nv = quyChuan[no + "|" + co];
    if (!nv && ct.maKetChuyen && dienGiai[ct.maKetChuyen]) nv = dienGiai[ct.maKetChuyen];
    if (!nv) {
      khongRa++;
      return;
    }
    nv = nv.trim();
    thongKe[nv] = (thongKe[nv] || 0) + 1;
    doiSua.push({ _id: ct._id, nghiepVu: nv });
  });

  Object.keys(thongKe).forEach(function (k) {
    print("  " + thongKe[k] + " dòng → " + k);
  });
  if (khongRa > 0) print("  " + khongRa + " dòng KHÔNG tra được nghiệp vụ — để trống.");

  if (DRY) {
    print("DRY=1 — chưa ghi gì. Bỏ DRY để chạy thật.");
    return;
  }

  var daSua = 0;
  doiSua.forEach(function (d) {
    var r = db.chung_tu.updateOne(
      { _id: d._id },
      { $set: { "danhMuc.nghiepVu": { ma: d.nghiepVu, ten: d.nghiepVu } } },
    );
    daSua += r.modifiedCount;
  });
  print("Đã cập nhật: " + daSua + " dòng");
})();
