/**
 * Vá lịch sử + thông báo phê duyệt bị ghi quyTrinhId=null / duongDan "?id=undefined".
 *
 * Nguyên nhân (đã sửa ở config-service 18/09/2026): proxy tenant trải entity thành
 * object thường khi save, getter `id` mất → engine ghi `qt.id` = undefined.
 *
 * Ghép lại:
 *  - lich_su_phe_duyet: theo (tenantId, loaiDoiTuong, doiTuongId) → quy_trinh_phe_duyet.
 *  - thong_bao: theo (tenantId, soPhieu nằm cuối tieuDe) → quy_trinh_phe_duyet.
 *
 * Bọc IIFE vì mongosh đọc stdin kiểu REPL, biểu thức nhiều dòng bị cắt.
 *
 *   cat be/scripts/backfill-quy-trinh-id-phe-duyet.js | \
 *     ssh kt "docker exec -i -e DRY=1 mongo mongosh \
 *       'mongodb://dbadmin:abcde12345-@localhost:27017/digital_book?authSource=admin' --quiet"
 */
(function () {
  var DRY = (typeof process !== "undefined" && process.env.DRY) === "1";
  print(DRY ? "== DRY RUN ==" : "== GHI THẬT ==");

  db.lich_su_phe_duyet.find({ quyTrinhId: null }).forEach(function (l) {
    var qt = db.quy_trinh_phe_duyet.findOne({ tenantId: l.tenantId, loaiDoiTuong: l.loaiDoiTuong, doiTuongId: l.doiTuongId });
    if (!qt) { print("lich_su " + l._id + ": KHÔNG tìm thấy quy trình, bỏ qua"); return; }
    var id = String(qt._id);
    print("lich_su " + l._id + " (" + l.ketQua + ") → quyTrinhId " + id + " [" + qt.soPhieu + "]");
    if (!DRY) db.lich_su_phe_duyet.updateOne({ _id: l._id }, { $set: { quyTrinhId: id } });
  });

  db.thong_bao.find({ duongDan: /id=undefined/ }).forEach(function (t) {
    var ds = db.quy_trinh_phe_duyet.find({ tenantId: t.tenantId }).toArray().filter(function (q) { return q.soPhieu && t.tieuDe && t.tieuDe.slice(-q.soPhieu.length) === q.soPhieu; });
    if (ds.length !== 1) { print("thong_bao " + t._id + ": khớp " + ds.length + " quy trình, bỏ qua (" + t.tieuDe + ")"); return; }
    var id = String(ds[0]._id);
    print("thong_bao " + t._id + " (" + t.tieuDe + ") → " + id);
    if (!DRY) db.thong_bao.updateOne({ _id: t._id }, { $set: { quyTrinhId: id, duongDan: "/phe-duyet/cho-toi-duyet?id=" + id } });
  });
})();
