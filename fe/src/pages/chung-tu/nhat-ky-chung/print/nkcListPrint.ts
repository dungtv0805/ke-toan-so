import dayjs from 'dayjs';
import type { NhatKyChung } from '@/types';
import { nhomKhoanMucTen, type NhomKhoanMucItem } from '@/utils/nhomKhoanMuc';

export interface NkcPrintOptions {
  tenCongTy?: string;
  /** Khoảng ngày đang lọc — in ở dòng phụ đề. */
  tuNgay?: string;
  denNgay?: string;
  /**
   * Key cột theo ĐÚNG thứ tự đang hiện trên bảng (lấy từ bộ chọn cột). Bỏ
   * trống thì in bộ mặc định.
   */
  cot?: string[];
  /** Danh mục Nhóm khoản mục — cần để tra tên, nhóm không nằm sẵn trên bút toán. */
  nhomKhoanMucList?: NhomKhoanMucItem[];
}

/** Canh chữ trong ô: mặc định trái, `c` giữa (mã/ngày), `r` phải (số tiền). */
type Canh = '' | 'c' | 'r';

interface DinhNghiaCotIn {
  key: string;
  nhan: string;
  canh: Canh;
  lay: (e: NhatKyChung, opts: NkcPrintOptions) => string;
}

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const fmtNum = (v?: number) =>
  v ? new Intl.NumberFormat('vi-VN').format(Math.round(v)) : '-';

const fmtDate = (v?: string) => (v ? dayjs(v).format('DD/MM/YYYY') : '');

/** Cột chữ thường: đọc thẳng một trường của bút toán. */
const coTruong = (
  key: string,
  nhan: string,
  lay: (e: NhatKyChung) => unknown,
  canh: Canh = '',
): DinhNghiaCotIn => ({ key, nhan, canh, lay: (e) => String(lay(e) ?? '') });

/** Cột lấy mã hoặc tên của một chiều phân tích trong `danhMuc`. */
const coDanhMuc = (
  key: string,
  nhan: string,
  chieu: string,
  truong: 'ma' | 'ten',
): DinhNghiaCotIn =>
  coTruong(key, nhan, (e) => {
    const dm = e.danhMuc as Record<string, { ma?: string; ten?: string }> | undefined;
    return dm?.[chieu]?.[truong] ?? '';
  });

/**
 * Mọi cột IN ĐƯỢC, khoá theo ĐÚNG `key` của cột trên bảng — nhờ vậy danh sách
 * cột đang hiện lấy từ bộ chọn cột dùng thẳng được, không cần bảng quy đổi.
 *
 * Cột chỉ có nghĩa trên màn hình (tick chọn dòng, nút thao tác, ô kiểm soát,
 * biên tập hồ sơ) cố tình KHÔNG có mặt ở đây: `chonCotIn` sẽ lọc chúng ra.
 */
const COT_IN: DinhNghiaCotIn[] = [
  coTruong('ngay', 'Ngày CT', (e) => fmtDate(e.ngay), 'c'),
  coTruong('ngayGhiSo', 'Ngày ghi sổ', (e) => fmtDate(e.ngayGhiSo || e.ngay), 'c'),
  coTruong('soPhieu', 'Số CT', (e) => e.soPhieu, 'c'),
  coDanhMuc('loaiGiaoDich', 'Loại GD', 'loaiGiaoDich', 'ten'),
  coDanhMuc('nghiepVu', 'Nghiệp vụ', 'nghiepVu', 'ten'),
  coTruong('dienGiai', 'Diễn giải', (e) => e.dienGiai),
  coTruong('taiKhoanNo', 'TK Nợ', (e) => e.taiKhoanNo, 'c'),
  coTruong('taiKhoanCo', 'TK Có', (e) => e.taiKhoanCo, 'c'),
  coTruong('soTien', 'Số tiền', (e) => fmtNum(e.soTien), 'r'),
  coDanhMuc('doiTuongMa', 'Mã ĐT nợ', 'doiTuong', 'ma'),
  coDanhMuc('doiTuong', 'Đối tượng nợ', 'doiTuong', 'ten'),
  coDanhMuc('doiTuong2Ma', 'Mã ĐT có', 'doiTuong2', 'ma'),
  coDanhMuc('doiTuong2', 'Đối tượng có', 'doiTuong2', 'ten'),
  coTruong('chuDauTuMa', 'Mã CĐT', (e) => e.danhMuc?.duAn?.chuDauTuMa ?? ''),
  coTruong('chuDauTu', 'Chủ đầu tư', (e) => e.danhMuc?.duAn?.chuDauTuTen ?? ''),
  coDanhMuc('duAnMa', 'Mã dự án', 'duAn', 'ma'),
  coDanhMuc('duAn', 'Dự án', 'duAn', 'ten'),
  coDanhMuc('sanPhamMa', 'Mã SP', 'sanPham', 'ma'),
  coDanhMuc('sanPham', 'Sản phẩm', 'sanPham', 'ten'),
  coDanhMuc('boPhanMa', 'Mã BP', 'boPhan', 'ma'),
  coDanhMuc('boPhan', 'Bộ phận', 'boPhan', 'ten'),
  coDanhMuc('doiMa', 'Mã đội', 'doi', 'ma'),
  coDanhMuc('doi', 'Đội', 'doi', 'ten'),
  coDanhMuc('nhanVienMa', 'Mã NV', 'nhanVien', 'ma'),
  coDanhMuc('nhanVien', 'Nhân viên', 'nhanVien', 'ten'),
  coDanhMuc('dongTienMa', 'Mã dòng tiền', 'dongTien', 'ma'),
  coDanhMuc('dongTien', 'Dòng tiền', 'dongTien', 'ten'),
  coDanhMuc('khoanMucMa', 'Mã khoản mục', 'khoanMuc', 'ma'),
  coDanhMuc('khoanMuc', 'Khoản mục', 'khoanMuc', 'ten'),
  coTruong('nhomKhoanMucMa', 'Mã nhóm KM', (e) => e.danhMuc?.khoanMuc?.nhom ?? ''),
  {
    key: 'nhomKhoanMuc',
    nhan: 'Nhóm khoản mục',
    canh: '',
    // Nhóm đi theo khoản mục, tên phải tra qua danh mục đã nạp ở state.
    lay: (e, opts) =>
      nhomKhoanMucTen(e.danhMuc?.khoanMuc?.nhom, opts.nhomKhoanMucList ?? []),
  },
  coDanhMuc('nhomKhuyenMaiMa', 'Mã nhóm KM(bán)', 'nhomKhuyenMai', 'ma'),
  coDanhMuc('nhomKhuyenMai', 'Nhóm khuyến mãi', 'nhomKhuyenMai', 'ten'),
  coDanhMuc('nhomQuanLyMa', 'Mã nhóm QL', 'nhomQuanLy', 'ma'),
  coDanhMuc('nhomQuanLy', 'Nhóm quản lý', 'nhomQuanLy', 'ten'),
  coDanhMuc('hopDongSo', 'Số hợp đồng', 'hopDong', 'ma'),
  coDanhMuc('hopDong', 'Hợp đồng', 'hopDong', 'ten'),
  // `soTaiKhoan` chưa có trong kiểu NhatKyChung nhưng dữ liệu thật vẫn mang.
  coTruong('soTaiKhoan', 'Số TK', (e) => (e as unknown as Record<string, unknown>).soTaiKhoan),
  coTruong('nguoiGiaoDich', 'Người GD', (e) => e.nguoiGiaoDich),
  coTruong('diaChi', 'Địa chỉ', (e) => e.diaChi),
  coTruong('ghiChu', 'Ghi chú', (e) => e.ghiChu),
];

const THEO_KEY = new Map(COT_IN.map((c) => [c.key, c]));

/** Bộ cột của bản in sổ giấy truyền thống — dùng khi chưa chọn cột nào. */
export const COT_IN_MAC_DINH = [
  'ngayGhiSo',
  'soPhieu',
  'ngay',
  'dienGiai',
  'taiKhoanNo',
  'taiKhoanCo',
  'soTien',
  'doiTuong',
  'doiTuong2',
];

/**
 * Đổi danh sách key cột đang hiện trên bảng thành các cột in được, GIỮ NGUYÊN
 * thứ tự người dùng đang thấy.
 *
 * Lọc sạch (chỉ toàn cột thao tác) thì quay về bộ mặc định — in ra một bảng
 * không còn cột nào thì tệ hơn hẳn in thừa.
 */
export function chonCotIn(keys?: string[]): DinhNghiaCotIn[] {
  const chon = (keys ?? [])
    .map((k) => THEO_KEY.get(k))
    .filter((c): c is DinhNghiaCotIn => Boolean(c));
  if (chon.length > 0) return chon;
  return COT_IN_MAC_DINH.map((k) => THEO_KEY.get(k)!).filter(Boolean);
}

/**
 * Cỡ chữ theo số cột: in đủ 40 cột ở 11px thì tràn khổ A4 ngang và chữ bị cắt.
 * Thu dần thay vì cắt bớt cột — người dùng đã chủ động chọn in các cột đó.
 */
const coChu = (soCot: number): number => {
  if (soCot <= 10) return 11;
  if (soCot <= 16) return 9;
  if (soCot <= 24) return 8;
  return 7;
};

/** Dựng HTML sổ nhật ký chung để in, theo đúng các cột được chọn. */
export function buildNkcListHtml(
  entries: NhatKyChung[],
  opts: NkcPrintOptions = {},
): string {
  const cot = chonCotIn(opts.cot);
  const tongTien = entries.reduce((s, e) => s + (e.soTien || 0), 0);

  const phuDe =
    opts.tuNgay && opts.denNgay
      ? `Từ ngày ${esc(fmtDate(opts.tuNgay))} đến ngày ${esc(fmtDate(opts.denNgay))}`
      : 'Toàn bộ kỳ';

  const theadHtml = cot
    .map((c) => `<th${c.canh === 'r' ? ' class="r"' : ''}>${esc(c.nhan)}</th>`)
    .join('');

  const rows = entries
    .map((e, i) => {
      const o = cot
        .map((c) => {
          const lop = c.canh ? ` class="${c.canh}"` : '';
          return `<td${lop}>${esc(c.lay(e, opts))}</td>`;
        })
        .join('');
      return `<tr><td class="c">${i + 1}</td>${o}</tr>`;
    })
    .join('');

  // Dòng cộng đặt số tiền đúng dưới cột Số tiền; không in cột đó thì chỉ đếm dòng.
  const viTriTien = cot.findIndex((c) => c.key === 'soTien');
  const tfootHtml =
    viTriTien < 0
      ? `<tr><td colspan="${cot.length + 1}">Cộng ${entries.length} bút toán</td></tr>`
      : `<tr>
      <td colspan="${viTriTien + 1}">Cộng ${entries.length} bút toán</td>
      <td class="r">${esc(fmtNum(tongTien))}</td>
      ${cot.length - viTriTien - 1 > 0 ? `<td colspan="${cot.length - viTriTien - 1}"></td>` : ''}
    </tr>`;

  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"><title>Sổ nhật ký chung</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", serif; font-size: ${coChu(cot.length)}px; color: #000; margin: 0; }
  .cty { font-weight: bold; text-transform: uppercase; }
  h1 { text-align: center; font-size: 16px; margin: 10px 0 2px; text-transform: uppercase; }
  .sub { text-align: center; font-size: 11px; margin-bottom: 8px; font-style: italic; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th, td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; word-wrap: break-word; overflow-wrap: anywhere; }
  thead th { background: #eee; text-align: center; font-weight: bold; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  td.c { text-align: center; white-space: nowrap; }
  td.r, th.r { text-align: right; white-space: nowrap; }
  tfoot td { font-weight: bold; background: #f5f5f5; }
  .ky { display: flex; justify-content: space-around; margin-top: 24px; text-align: center; font-size: 11px; }
  .ky div { width: 30%; }
  .ky .name { font-weight: bold; }
  .ky .note { font-style: italic; font-size: 10px; }
</style></head>
<body>
  <div class="cty">${esc(opts.tenCongTy ?? '')}</div>
  <h1>Sổ nhật ký chung</h1>
  <div class="sub">${phuDe}</div>
  <table>
    <thead><tr><th>STT</th>${theadHtml}</tr></thead>
    <tbody>${rows}</tbody>
    <tfoot>${tfootHtml}</tfoot>
  </table>
  <div class="ky">
    <div><div class="name">Người lập biểu</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="name">Kế toán trưởng</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="name">Giám đốc</div><div class="note">(Ký, đóng dấu)</div></div>
  </div>
</body></html>`;
}

/** In qua iframe ẩn — cùng cơ chế với printPhieu/printKhoPhieu. */
export function printNkcList(
  entries: NhatKyChung[],
  opts: NkcPrintOptions = {},
): void {
  const html = buildNkcListHtml(entries, opts);

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  let done = false;
  const trigger = () => {
    if (done) return;
    done = true;
    win.focus();
    win.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  win.onload = trigger;
  setTimeout(trigger, 400);
}
