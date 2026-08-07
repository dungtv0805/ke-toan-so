import dayjs from 'dayjs';
import type { NhatKyChung } from '@/types';

export interface NkcPrintOptions {
  tenCongTy?: string;
  /** Khoảng ngày đang lọc — in ở dòng phụ đề. */
  tuNgay?: string;
  denNgay?: string;
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

/** Dựng HTML sổ nhật ký chung để in. Chỉ lấy các cột cần cho bản in giấy. */
export function buildNkcListHtml(
  entries: NhatKyChung[],
  opts: NkcPrintOptions = {},
): string {
  const tongTien = entries.reduce((s, e) => s + (e.soTien || 0), 0);

  const phuDe =
    opts.tuNgay && opts.denNgay
      ? `Từ ngày ${esc(fmtDate(opts.tuNgay))} đến ngày ${esc(fmtDate(opts.denNgay))}`
      : 'Toàn bộ kỳ';

  const rows = entries
    .map(
      (e, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td class="c">${esc(fmtDate(e.ngayGhiSo || e.ngay))}</td>
      <td class="c">${esc(e.soPhieu)}</td>
      <td class="c">${esc(fmtDate(e.ngay))}</td>
      <td>${esc(e.dienGiai)}</td>
      <td class="c">${esc(e.taiKhoanNo)}</td>
      <td class="c">${esc(e.taiKhoanCo)}</td>
      <td class="r">${esc(fmtNum(e.soTien))}</td>
      <td>${esc(e.danhMuc?.doiTuong?.ten ?? '')}</td>
      <td>${esc(e.danhMuc?.doiTuong2?.ten ?? '')}</td>
    </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"><title>Sổ nhật ký chung</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: "Times New Roman", serif; font-size: 11px; color: #000; margin: 0; }
  .cty { font-weight: bold; text-transform: uppercase; }
  h1 { text-align: center; font-size: 16px; margin: 10px 0 2px; text-transform: uppercase; }
  .sub { text-align: center; font-size: 11px; margin-bottom: 8px; font-style: italic; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #000; padding: 3px 4px; vertical-align: top; }
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
    <thead><tr>
      <th>STT</th><th>Ngày ghi sổ</th><th>Số CT</th><th>Ngày CT</th>
      <th>Diễn giải</th><th>TK Nợ</th><th>TK Có</th><th class="r">Số tiền</th>
      <th>Đối tượng nợ</th><th>Đối tượng có</th>
    </tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr>
      <td colspan="7">Cộng ${entries.length} bút toán</td>
      <td class="r">${esc(fmtNum(tongTien))}</td>
      <td colspan="2"></td>
    </tr></tfoot>
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
