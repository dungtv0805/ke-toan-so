import type { KeHoachQueryDto } from '../dto/ke-hoach-query.dto';

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Các chiều lọc khớp thẳng theo `ma` của snapshot danh mục trên dòng kế hoạch. */
const LOC_THEO_MA: [keyof KeHoachQueryDto, string][] = [
  ['nghiepVu', 'danhMuc.nghiepVu.ma'],
  ['taiKhoanNo', 'danhMuc.taiKhoanNo.ma'],
  ['taiKhoanCo', 'danhMuc.taiKhoanCo.ma'],
  ['chuDauTu', 'danhMuc.chuDauTu.ma'],
  ['duAn', 'danhMuc.duAn.ma'],
  ['sanPham', 'danhMuc.sanPham.ma'],
  ['boPhan', 'danhMuc.boPhan.ma'],
  ['doi', 'danhMuc.doi.ma'],
  ['nhanVien', 'danhMuc.nhanVien.ma'],
  ['dongTien', 'danhMuc.dongTien.ma'],
  ['khoanMuc', 'danhMuc.khoanMuc.ma'],
  ['nhomQuanLy', 'danhMuc.nhomQuanLy.ma'],
  ['nhomKhuyenMai', 'danhMuc.nhomKhuyenMai.ma'],
];

export function buildKeHoachQuery(
  query: KeHoachQueryDto,
): Record<string, unknown> {
  const mongoQuery: Record<string, unknown> = {};

  if (query.loaiKeHoach) mongoQuery.loaiKeHoach = query.loaiKeHoach;
  if (query.phienBan) mongoQuery.phienBan = query.phienBan;

  if (query.startDate || query.endDate) {
    const ngay: Record<string, Date> = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      start.setHours(0, 0, 0, 0);
      ngay.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      ngay.$lte = end;
    }
    mongoQuery.ngay = ngay;
  }

  // search / doiTuong / taiKhoan đều là điều kiện $or → gom qua $and để không ghi đè nhau
  const orConditions: Record<string, unknown>[][] = [];

  if (query.search) {
    const escaped = escapeRegex(query.search);
    orConditions.push([
      { noiDung: { $regex: escaped, $options: 'i' } },
      { 'danhMuc.nghiepVu.ten': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.nghiepVu.ma': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong.ma': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong.ten': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong2.ma': { $regex: escaped, $options: 'i' } },
      { 'danhMuc.doiTuong2.ten': { $regex: escaped, $options: 'i' } },
    ]);
  }

  if (query.doiTuong) {
    orConditions.push([
      { 'danhMuc.doiTuong.ma': query.doiTuong },
      { 'danhMuc.doiTuong2.ma': query.doiTuong },
    ]);
  }

  if (query.taiKhoan) {
    orConditions.push([
      { 'danhMuc.taiKhoanNo.ma': query.taiKhoan },
      { 'danhMuc.taiKhoanCo.ma': query.taiKhoan },
    ]);
  }

  if (orConditions.length === 1) {
    mongoQuery.$or = orConditions[0];
  } else if (orConditions.length > 1) {
    mongoQuery.$and = orConditions.map((conditions) => ({ $or: conditions }));
  }

  for (const [field, path] of LOC_THEO_MA) {
    const value = query[field];
    if (value) mongoQuery[path] = value;
  }

  return mongoQuery;
}
