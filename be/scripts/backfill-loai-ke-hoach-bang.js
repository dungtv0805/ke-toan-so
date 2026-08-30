/**
 * Gắn `loaiKeHoach: "KE_HOACH"` cho các dòng của hai bảng kế hoạch chi tiết đã
 * lập trước khi hai bảng tách số Kế hoạch và số Dự báo.
 *
 * Mọi dòng cũ đều là số KẾ HOẠCH: trang Dự báo trước đây không có hai bảng này.
 *
 * - Idempotent: chỉ đụng dòng CHƯA có trường → chạy lại an toàn.
 * - Không truyền TENANT thì chạy cho mọi tenant.
 * - Service đã dung thứ dòng thiếu trường (xem `dieuKienLoaiKeHoach`), nên
 *   script này là dọn dẹp, không phải điều kiện để deploy.
 *
 * TOÀN BỘ thân script nằm trong một IIFE: khi pipe qua stdin, mongosh chạy ở chế độ
 * REPL và đánh giá TỪNG DÒNG — một biểu thức trải trên nhiều dòng sẽ bị cắt và gán
 * sai giá trị mà không báo lỗi. Bọc hàm thì cả khối vào một lượt.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY (từ máy local, qua SSH tới server prod):
 *
 *   cat be/scripts/backfill-loai-ke-hoach-bang.js | \
 *     ssh kt "DRY=1 docker exec -i -e TENANT -e DRY mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * DRY=1 chỉ in ra dự định, không ghi. Bỏ DRY (hoặc DRY=0) để ghi thật.
 * Thêm TENANT=<tenantId> để giới hạn một công ty.
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  var TENANT = (typeof process !== "undefined" && process.env.TENANT) || "";
  var DRY = (typeof process !== "undefined" && process.env.DRY) === "1";

  var COLLECTIONS = ["ke_hoach_ban_hang", "ke_hoach_nhan_su"];

  var filter = { loaiKeHoach: { $exists: false } };
  if (TENANT) filter.tenantId = TENANT;

  print("Tenant : " + (TENANT || "(tất cả)"));
  print("Chế độ : " + (DRY ? "DRY — chỉ in, không ghi" : "GHI THẬT"));

  var tong = 0;
  for (var i = 0; i < COLLECTIONS.length; i++) {
    var ten = COLLECTIONS[i];
    var can = db.getCollection(ten).countDocuments(filter);
    tong += can;
    print(ten + ": " + can + " dòng thiếu loaiKeHoach");
  }

  if (tong === 0) {
    print("Không có dòng nào cần bổ sung — dừng.");
    return;
  }

  if (DRY) {
    print("DRY=1 — chưa ghi gì. Bỏ DRY để chạy thật.");
    return;
  }

  for (var j = 0; j < COLLECTIONS.length; j++) {
    var col = COLLECTIONS[j];
    var kq = db
      .getCollection(col)
      .updateMany(filter, { $set: { loaiKeHoach: "KE_HOACH" } });
    print(col + ": đã cập nhật " + kq.modifiedCount + " dòng");
  }
})();
