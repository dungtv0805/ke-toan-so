/**
 * Gắn Loại giao dịch + Loại chứng từ vào các chứng từ kết chuyển đã lập trước khi
 * trang Kết chuyển lãi lỗ có ô chọn Loại giao dịch (danhMuc của chúng đang rỗng).
 *
 * KHÔNG đổi số phiếu: lô cũ đã vào sổ với tiền tố NVK, đổi số sẽ lệch với mọi bản in
 * và đối chiếu đã gửi đi. Script chỉ bổ sung snapshot danh mục.
 *
 * - Idempotent: bỏ qua dòng đã có `danhMuc.loaiGiaoDich` → chạy lại an toàn.
 * - Chỉ đụng `nguon: "KET_CHUYEN"` của đúng tenant truyền vào.
 * - Cũng ghi luôn `cau_hinh_ket_chuyen` để lần kết chuyển sau form chọn sẵn mã này.
 *
 * TOÀN BỘ thân script nằm trong một IIFE: khi pipe qua stdin, mongosh chạy ở chế độ
 * REPL và đánh giá TỪNG DÒNG — một biểu thức trải trên nhiều dòng (ternary, chuỗi nối)
 * sẽ bị cắt và gán sai giá trị mà không báo lỗi. Bọc hàm thì cả khối vào một lượt.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY (từ máy local, qua SSH tới server prod):
 *
 *   cat be/scripts/backfill-loai-gd-ket-chuyen.js | \
 *     ssh kt "TENANT=<tenantId> MA_LGD=<mã loại giao dịch> DRY=1 \
 *       docker exec -i -e TENANT -e MA_LGD -e DRY mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * DRY=1 chỉ in ra dự định, không ghi. Bỏ DRY (hoặc DRY=0) để ghi thật.
 * Tìm tenantId: db.tenants.find({}, {name:1})
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  var TENANT = (typeof process !== "undefined" && process.env.TENANT) || "";
  var MA_LGD = (typeof process !== "undefined" && process.env.MA_LGD) || "";
  var DRY = (typeof process !== "undefined" && process.env.DRY) === "1";

  if (!TENANT || !MA_LGD) {
    print("LỖI: cần TENANT=<tenantId> và MA_LGD=<mã loại giao dịch>.");
    return;
  }

  var lgd = db.loai_giao_dich.findOne({ tenantId: TENANT, ma: MA_LGD });
  if (!lgd) {
    print("LỖI: tenant " + TENANT + " không có loại giao dịch mã " + MA_LGD);
    return;
  }

  // Loại chứng từ liên kết là tuỳ chọn: loại giao dịch chưa khai `loaiChungTuMa` thì
  // chứng từ chỉ có snapshot loaiGiaoDich — đúng như BE làm khi ghi sổ.
  var lct = null;
  if (lgd.loaiChungTuMa) {
    lct = db.loai_chung_tu.findOne({ tenantId: TENANT, ma: lgd.loaiChungTuMa });
    if (!lct) {
      print("CẢNH BÁO: loại giao dịch " + MA_LGD + " trỏ tới loại chứng từ " + lgd.loaiChungTuMa + " nhưng mã này không có trong danh mục — chỉ gắn loại giao dịch.");
    }
  }

  var setDoc = { "danhMuc.loaiGiaoDich": { ma: lgd.ma, ten: lgd.ten || "" } };
  if (lct) {
    setDoc["danhMuc.loaiChungTu"] = { ma: lct.ma, ten: lct.ten || "" };
  }

  var filter = { tenantId: TENANT, nguon: "KET_CHUYEN", "danhMuc.loaiGiaoDich": { $exists: false } };

  var canSua = db.chung_tu.countDocuments(filter);
  var soPhieu = db.chung_tu.distinct("soPhieu", filter);

  print("Tenant     : " + TENANT);
  print("Loại GD    : " + lgd.ma + " — " + (lgd.ten || ""));
  print("Loại CT    : " + (lct ? lct.ma + " — " + (lct.ten || "") : "(không có)"));
  print("Số dòng    : " + canSua + " (thuộc " + soPhieu.length + " chứng từ: " + soPhieu.join(", ") + ")");

  if (canSua === 0) {
    print("Không có dòng nào cần bổ sung — dừng.");
    return;
  }

  if (DRY) {
    print("DRY=1 — chưa ghi gì. Bỏ DRY để chạy thật.");
    return;
  }

  var kq = db.chung_tu.updateMany(filter, { $set: setDoc });
  print("Đã cập nhật: " + kq.modifiedCount + " dòng");

  // Mặc định cho lần kết chuyển sau. Ghi cùng script để công ty không phải chọn lại tay.
  var cauHinh = db.cau_hinh_ket_chuyen.findOne({ tenantId: TENANT });
  if (cauHinh) {
    db.cau_hinh_ket_chuyen.updateOne({ _id: cauHinh._id }, { $set: { loaiGiaoDichMa: lgd.ma, updatedAt: new Date() } });
    print("cau_hinh_ket_chuyen: đã cập nhật loaiGiaoDichMa=" + lgd.ma);
  } else {
    db.cau_hinh_ket_chuyen.insertOne({ tenantId: TENANT, loaiGiaoDichMa: lgd.ma, createdAt: new Date(), updatedAt: new Date() });
    print("cau_hinh_ket_chuyen: đã tạo mới với loaiGiaoDichMa=" + lgd.ma);
  }
})();
