/**
 * Gắn trangThaiPheDuyet = "CHINH_THUC" cho toàn bộ chứng từ có TRƯỚC khi bật
 * tính năng Phê duyệt nghiệp vụ.
 *
 * VÌ SAO BẮT BUỘC CHẠY: mục 12 của tài liệu yêu cầu chỉ chứng từ đã kiểm soát
 * đủ mới chạy vào báo cáo. Bộ lọc ở `nhat-ky-chung.service.ts` chấp nhận cả
 * bản ghi KHÔNG có trường này (coi là dữ liệu cũ) nên báo cáo vẫn đúng ngay cả
 * khi chưa chạy script — nhưng chạy rồi thì dữ liệu tường minh, và về sau siết
 * bộ lọc lại không sợ mất số.
 *
 * AN TOÀN:
 * - Idempotent: chỉ đụng bản ghi CHƯA có trường → chạy lại bao nhiêu lần cũng được.
 * - KHÔNG đụng bản ghi đã có trạng thái (đang chờ duyệt, bị trả lại...).
 * - Có chế độ thử: DRY=1 chỉ đếm, không ghi.
 * - Lọc theo tenant nếu truyền TENANT; không truyền thì chạy toàn bộ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CÁCH CHẠY (từ máy local, qua SSH tới server prod):
 *
 *   # Bước 1 — đếm thử, không ghi gì:
 *   cat be/scripts/backfill-trang-thai-phe-duyet.js | \
 *     ssh kt "DRY=1 docker exec -i -e DRY mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 *   # Bước 2 — ghi thật:
 *   cat be/scripts/backfill-trang-thai-phe-duyet.js | \
 *     ssh kt "docker exec -i mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 *
 * Toàn bộ thân script bọc trong IIFE: mongosh đọc stdin theo kiểu REPL, biểu
 * thức nhiều dòng không bọc sẽ bị cắt giữa chừng và chạy sai mà không báo lỗi.
 * ─────────────────────────────────────────────────────────────────────────
 */

(function () {
  var DRY = typeof process !== "undefined" && process.env.DRY === "1";
  var TENANT =
    (typeof process !== "undefined" && process.env.TENANT) || null;

  var loc = { trangThaiPheDuyet: { $exists: false } };
  if (TENANT) loc.tenantId = TENANT;

  var tong = db.chung_tu.countDocuments({});
  var canGan = db.chung_tu.countDocuments(loc);
  var daCo = tong - canGan;

  print("───────────────────────────────────────────────");
  print("Backfill trạng thái phê duyệt cho chứng từ cũ");
  print("───────────────────────────────────────────────");
  print("Phạm vi tenant : " + (TENANT || "TẤT CẢ"));
  print("Tổng chứng từ  : " + tong);
  print("Đã có trạng thái: " + daCo + "  (giữ nguyên, không đụng)");
  print("Sẽ gắn CHINH_THUC: " + canGan);

  if (DRY) {
    print("");
    print("DRY=1 — chỉ đếm, KHÔNG ghi. Bỏ DRY=1 để chạy thật.");
    return;
  }

  if (canGan === 0) {
    print("");
    print("Không có gì để làm. Xong.");
    return;
  }

  var kq = db.chung_tu.updateMany(loc, {
    $set: { trangThaiPheDuyet: "CHINH_THUC", phienBanPheDuyet: 1 },
  });

  print("");
  print("Đã cập nhật: " + kq.modifiedCount + " chứng từ.");

  var conSot = db.chung_tu.countDocuments(loc);
  print("Còn sót    : " + conSot + (conSot === 0 ? "  ✓" : "  ← KIỂM TRA LẠI"));
})();
