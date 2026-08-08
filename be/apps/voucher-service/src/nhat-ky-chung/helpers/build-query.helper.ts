import { NhatKyChungQueryDto } from '../dto';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Giá trị hợp lệ của `kiemSoat.trangThai` (khớp KiemSoatTrangThai bên FE). */
const KIEM_SOAT_TRANG_THAI = ['HOP_LE', 'CHUA_HOP_LE', 'KHONG_DUOC_TRU'];
/** Giá trị lọc ảo: chứng từ chưa được kiểm soát. */
const CHUA_KIEM_SOAT = 'CHUA_KIEM_SOAT';

export function buildMongoQuery(
  query: NhatKyChungQueryDto,
): Record<string, unknown> {
  const {
    search,
    startDate,
    endDate,
    loai,
    doiTuong,
    duAn,
    boPhan,
    taiKhoanNo,
    taiKhoanCo,
    hopDong,
    taiKhoan,
    nghiepVu,
    khoanMuc,
    nhanVien,
    sanPham,
    doi,
    nhomKhuyenMai,
    nguoiGiaoDich,
    kiemSoat,
  } = query;
  const mongoQuery: Record<string, unknown> = {};

  // Filter by loai (loại giao dịch - stored in danhMuc.loaiGiaoDich.ma)
  if (loai) {
    mongoQuery['danhMuc.loaiGiaoDich.ma'] = loai;
  }

  // Filter by date range
  if (startDate || endDate) {
    mongoQuery.ngay = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      (mongoQuery.ngay as Record<string, Date>).$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      (mongoQuery.ngay as Record<string, Date>).$lte = end;
    }
  }

  // search và doiTuong đều là điều kiện $or, nên gom qua $and để không ghi đè nhau
  const orConditions: Record<string, unknown>[][] = [];

  // Search by regex on nghiepVu, nội dung, số phiếu và đối tượng
  // doiTuong2 giữ "đối tượng có"; dữ liệu cũ chỉ có doiTuong
  if (search) {
    const escaped = escapeRegex(search);
    orConditions.push([
      { 'danhMuc.nghiepVu.ten': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.nghiepVu.ma': { $regex: escaped, $options: 'i' } },
      { noiDung: { $regex: escaped, $options: 'i' } },
      { soPhieu: { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong.ma': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong.ten': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong2.ma': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong2.ten': { $regex: escaped, $options: 'i' } },
    ]);
  }

  // Filter by đối tượng — khớp đối tượng bên Nợ hoặc bên Có
  if (doiTuong) {
    orConditions.push([
      { 'danhMuc.doiTuong.ma': doiTuong },
      { 'danhMuc.doiTuong2.ma': doiTuong },
    ]);
  }

  // Filter by tài khoản (gộp) — khớp bên Nợ hoặc bên Có
  if (taiKhoan) {
    orConditions.push([
      { 'danhMuc.taiKhoanNo.ma': taiKhoan },
      { 'danhMuc.taiKhoanCo.ma': taiKhoan },
    ]);
  }

  if (orConditions.length === 1) {
    mongoQuery.$or = orConditions[0];
  } else if (orConditions.length > 1) {
    mongoQuery.$and = orConditions.map((conditions) => ({ $or: conditions }));
  }

  // Filter by dự án
  if (duAn) {
    mongoQuery['danhMuc.duAn.ma'] = duAn;
  }

  // Filter by bộ phận
  if (boPhan) {
    mongoQuery['danhMuc.boPhan.ma'] = boPhan;
  }

  // Filter by tài khoản nợ
  if (taiKhoanNo) {
    mongoQuery['danhMuc.taiKhoanNo.ma'] = taiKhoanNo;
  }

  // Filter by tài khoản có
  if (taiKhoanCo) {
    mongoQuery['danhMuc.taiKhoanCo.ma'] = taiKhoanCo;
  }

  // Filter by hợp đồng — snapshot hợp đồng không có `ma`, định danh là soHopDong
  if (hopDong) {
    mongoQuery['danhMuc.hopDong.soHopDong'] = hopDong;
  }

  // Các tiêu chí lọc còn lại của màn hình "Dữ liệu tổng hợp" — đều khớp theo `ma`
  // của snapshot danh mục lưu trên chứng từ.
  if (nghiepVu) mongoQuery['danhMuc.nghiepVu.ma'] = nghiepVu;
  if (khoanMuc) mongoQuery['danhMuc.khoanMuc.ma'] = khoanMuc;
  if (nhanVien) mongoQuery['danhMuc.nhanVien.ma'] = nhanVien;
  if (sanPham) mongoQuery['danhMuc.sanPham.ma'] = sanPham;
  if (doi) mongoQuery['danhMuc.doi.ma'] = doi;
  if (nhomKhuyenMai) mongoQuery['danhMuc.nhomKhuyenMai.ma'] = nhomKhuyenMai;
  if (nguoiGiaoDich) mongoQuery['nguoiGiaoDich'] = nguoiGiaoDich;

  // Trạng thái kiểm soát. "CHUA_KIEM_SOAT" = chứng từ chưa có kiemSoat.trangThai —
  // $nin cũng khớp document thiếu hẳn field nên không cần thêm $exists.
  if (kiemSoat) {
    mongoQuery['kiemSoat.trangThai'] =
      kiemSoat === CHUA_KIEM_SOAT
        ? { $nin: KIEM_SOAT_TRANG_THAI }
        : kiemSoat;
  }

  return mongoQuery;
}
