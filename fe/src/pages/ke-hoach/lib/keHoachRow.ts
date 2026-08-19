import type { DanhMuc } from "@/types";
import type {
  KeHoachDong,
  KeHoachPayload,
  LoaiKeHoach,
} from "@/services/keHoachService";

/**
 * Giá trị phẳng của một dòng khi sửa trên lưới. Mọi chiều danh mục lưu theo MÃ
 * (không theo tên — hai mã khác nhau có thể trùng tên).
 */
export interface RowValues {
  ngay?: string;
  noiDung?: string;
  soTien?: number;
  nghiepVu?: string;
  taiKhoanNo?: string;
  taiKhoanCo?: string;
  doiTuong?: string;
  doiTuong2?: string;
  chuDauTu?: string;
  duAn?: string;
  sanPham?: string;
  boPhan?: string;
  doi?: string;
  nhanVien?: string;
  dongTien?: string;
  khoanMuc?: string;
  nhomQuanLy?: string;
}

/**
 * Phần tử danh mục — chỉ cần mã/tên. Các trường phụ để `unknown` để nhận được mọi
 * kiểu danh mục (TaiKhoan, DoiTuong, DuAn…) mà không cần ép kiểu ở nơi gọi.
 */
export interface MucDanhMuc {
  id?: string;
  ma: string;
  ten: string;
  loai?: unknown;
  nhom?: unknown;
  trangThai?: unknown;
  /** Danh mục Dự án đặt tên trường chủ đầu tư là chuDuAnMa / chuDuAn. */
  chuDuAnMa?: unknown;
  chuDuAn?: unknown;
  chuDauTuMa?: unknown;
  chuDauTuTen?: unknown;
}

export interface DanhMucLists {
  taiKhoanList: MucDanhMuc[];
  doiTuongList: MucDanhMuc[];
  duAnList: MucDanhMuc[];
  boPhanList: MucDanhMuc[];
  sanPhamList: MucDanhMuc[];
  dongTienList: MucDanhMuc[];
  khoanMucList: MucDanhMuc[];
  nhomQuanLyList: MucDanhMuc[];
  chuDauTuList: MucDanhMuc[];
  nhomKhoanMucList: MucDanhMuc[];
}

/**
 * Ngày phát sinh là dữ liệu NGÀY, không phải mốc thời gian: luôn lưu 00:00 UTC của
 * đúng ngày đó. Nếu lưu nửa đêm giờ VN (UTC+7) thì ngày 01/03 thành 28/02 UTC và
 * BE gom series sẽ nhét dòng đó sang tháng trước.
 */
export function ngayLuu(d: { format: (f: string) => string }): string {
  return `${d.format("YYYY-MM-DD")}T00:00:00.000Z`;
}

const tim = (list: MucDanhMuc[] | undefined, ma?: string) =>
  ma ? list?.find((m) => m.ma === ma) : undefined;

const chuoi = (v: unknown): string => (typeof v === "string" ? v : "");

/** Dựng `danhMuc` để lưu xuống BE từ các mã đang chọn trên lưới. */
export function buildDanhMuc(
  values: RowValues,
  lists: DanhMucLists,
): DanhMuc {
  const danhMuc: DanhMuc = {};

  const tkNo = tim(lists.taiKhoanList, values.taiKhoanNo);
  if (tkNo)
    danhMuc.taiKhoanNo = {
      ma: tkNo.ma,
      ten: tkNo.ten,
      loai: chuoi(tkNo.loai),
      nhom: chuoi(tkNo.nhom),
    };

  const tkCo = tim(lists.taiKhoanList, values.taiKhoanCo);
  if (tkCo)
    danhMuc.taiKhoanCo = {
      ma: tkCo.ma,
      ten: tkCo.ten,
      loai: chuoi(tkCo.loai),
      nhom: chuoi(tkCo.nhom),
    };

  const dtNo = tim(lists.doiTuongList, values.doiTuong);
  if (dtNo)
    danhMuc.doiTuong = {
      ma: dtNo.ma,
      ten: dtNo.ten,
      loai: Array.isArray(dtNo.loai) ? chuoi(dtNo.loai[0]) : chuoi(dtNo.loai),
    };

  const dtCo = tim(lists.doiTuongList, values.doiTuong2);
  if (dtCo)
    danhMuc.doiTuong2 = {
      ma: dtCo.ma,
      ten: dtCo.ten,
      loai: Array.isArray(dtCo.loai) ? chuoi(dtCo.loai[0]) : chuoi(dtCo.loai),
    };

  const duAn = tim(lists.duAnList, values.duAn);
  if (duAn)
    danhMuc.duAn = {
      ma: duAn.ma,
      ten: duAn.ten,
      trangThai: chuoi(duAn.trangThai),
      // Danh mục dự án đặt tên trường chủ đầu tư là chuDuAnMa / chuDuAn.
      chuDauTuMa: chuoi(duAn.chuDuAnMa ?? duAn.chuDauTuMa),
      chuDauTuTen: chuoi(duAn.chuDuAn ?? duAn.chuDauTuTen),
    };

  const chuDauTu = tim(lists.chuDauTuList, values.chuDauTu);
  if (chuDauTu) danhMuc.chuDauTu = { ma: chuDauTu.ma, ten: chuDauTu.ten };

  const sanPham = tim(lists.sanPhamList, values.sanPham);
  if (sanPham) danhMuc.sanPham = { ma: sanPham.ma, ten: sanPham.ten };

  const boPhan = tim(lists.boPhanList, values.boPhan);
  if (boPhan) danhMuc.boPhan = { ma: boPhan.ma, ten: boPhan.ten };

  // Đội là một bộ phận (danh mục Bộ phận), nhân viên là một đối tượng.
  const doi = tim(lists.boPhanList, values.doi);
  if (doi) danhMuc.doi = { ma: doi.ma, ten: doi.ten };

  const nhanVien = tim(lists.doiTuongList, values.nhanVien);
  if (nhanVien) danhMuc.nhanVien = { ma: nhanVien.ma, ten: nhanVien.ten };

  const dongTien = tim(lists.dongTienList, values.dongTien);
  if (dongTien)
    danhMuc.dongTien = {
      ma: dongTien.ma,
      ten: dongTien.ten,
      loai: chuoi(dongTien.loai),
    };

  const khoanMuc = tim(lists.khoanMucList, values.khoanMuc);
  if (khoanMuc)
    danhMuc.khoanMuc = {
      ma: khoanMuc.ma,
      ten: khoanMuc.ten,
      loai: chuoi(khoanMuc.loai),
      // Nhóm khoản mục KHÔNG nhập tay — đi kèm khoản mục.
      nhom: chuoi(khoanMuc.nhom),
    };

  const nhomQuanLy = tim(lists.nhomQuanLyList, values.nhomQuanLy);
  if (nhomQuanLy) danhMuc.nhomQuanLy = { ma: nhomQuanLy.ma, ten: nhomQuanLy.ten };

  if (values.nghiepVu)
    danhMuc.nghiepVu = { ma: values.nghiepVu, ten: values.nghiepVu };

  return danhMuc;
}

/** Đọc ngược một dòng đã lưu về giá trị phẳng để sửa trên lưới. */
export function toRowValues(dong: Partial<KeHoachDong>): RowValues {
  const dm = dong.danhMuc ?? {};
  return {
    ngay: dong.ngay,
    noiDung: dong.noiDung,
    soTien: dong.soTien,
    nghiepVu: dm.nghiepVu?.ma,
    taiKhoanNo: dm.taiKhoanNo?.ma,
    taiKhoanCo: dm.taiKhoanCo?.ma,
    doiTuong: dm.doiTuong?.ma,
    doiTuong2: dm.doiTuong2?.ma,
    chuDauTu: dm.chuDauTu?.ma,
    duAn: dm.duAn?.ma,
    sanPham: dm.sanPham?.ma,
    boPhan: dm.boPhan?.ma,
    doi: dm.doi?.ma,
    nhanVien: dm.nhanVien?.ma,
    dongTien: dm.dongTien?.ma,
    khoanMuc: dm.khoanMuc?.ma,
    nhomQuanLy: dm.nhomQuanLy?.ma,
  };
}

/**
 * Cột "Nhóm khoản mục" — suy từ khoản mục đã chọn (`khoanMuc.nhom` giữ mã/id của
 * nhóm), không phải trường nhập tay.
 */
export function nhomKhoanMucCua(
  danhMuc: DanhMuc | undefined,
  nhomKhoanMucList: MucDanhMuc[] = [],
): string {
  const nhom = danhMuc?.khoanMuc?.nhom;
  if (!nhom) return "";
  const muc = nhomKhoanMucList.find((n) => n.ma === nhom || n.id === nhom);
  return muc?.ten ?? nhom;
}

/** Kiểm tra tối thiểu trước khi lưu; trả câu lỗi tiếng Việt hoặc null. */
export function loiCuaDong(values: RowValues): string | null {
  if (!values.ngay) return "Chưa chọn ngày phát sinh";
  if (!values.soTien || values.soTien <= 0) return "Số tiền phải lớn hơn 0";
  if (!values.taiKhoanNo && !values.taiKhoanCo)
    return "Phải chọn ít nhất một tài khoản (Nợ hoặc Có)";
  return null;
}

export function toPayload(
  values: RowValues,
  lists: DanhMucLists,
  loaiKeHoach: LoaiKeHoach,
  phienBan?: string,
): KeHoachPayload {
  return {
    loaiKeHoach,
    ...(phienBan ? { phienBan } : {}),
    ngay: values.ngay ?? "",
    soTien: values.soTien ?? 0,
    noiDung: values.noiDung ?? "",
    danhMuc: buildDanhMuc(values, lists),
  };
}
