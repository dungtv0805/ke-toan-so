import type {
  BangTongHopCongNo,
  CongNoRowVal,
} from "@/services/congNoTongHopService";

export interface CongNoPrintOptions {
  tenCongTy?: string;
  /** Khoảng ngày đang lọc — in ở dòng phụ đề (đã định dạng DD/MM/YYYY). */
  tuNgay?: string;
  denNgay?: string;
}

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const fmtNum = (v?: number) =>
  v ? new Intl.NumberFormat("vi-VN").format(Math.round(v)) : "-";

const valCells = (v: CongNoRowVal) =>
  [
    v.dauKy.phaiThu,
    v.dauKy.phaiTra,
    v.phatSinh.phaiThu,
    v.phatSinh.phaiTra,
    v.cuoiKy.phaiThu,
    v.cuoiKy.phaiTra,
  ]
    .map((n) => `<td class="r">${esc(fmtNum(n))}</td>`)
    .join("");

/** Dựng HTML bảng tổng hợp công nợ để in — cùng bố cục với bản trên màn hình. */
export function buildCongNoHtml(
  data: BangTongHopCongNo | null,
  opts: CongNoPrintOptions = {},
): string {
  const phuDe =
    opts.tuNgay && opts.denNgay
      ? `Từ ngày ${esc(opts.tuNgay)} đến ngày ${esc(opts.denNgay)}`
      : "Toàn bộ kỳ";

  const rows: string[] = [];
  if (data) {
    rows.push(
      `<tr class="total"><td colspan="2">TỔNG CỘNG</td>${valCells(data.totals)}</tr>`,
    );
    for (const acc of data.accounts) {
      rows.push(
        `<tr class="acc"><td class="c">${esc(acc.ma)}</td><td>${esc(acc.ten)}</td>${valCells(
          { dauKy: acc.dauKy, phatSinh: acc.phatSinh, cuoiKy: acc.cuoiKy },
        )}</tr>`,
      );
      for (const dt of acc.doiTuongs) {
        rows.push(
          `<tr><td class="c">${esc(dt.ma)}</td><td class="ind">${esc(dt.ten)}</td>${valCells(
            { dauKy: dt.dauKy, phatSinh: dt.phatSinh, cuoiKy: dt.cuoiKy },
          )}</tr>`,
        );
      }
    }
  }

  return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"><title>Tổng hợp công nợ</title>
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
  td.r { text-align: right; white-space: nowrap; }
  td.ind { padding-left: 14px; }
  tr.total td { font-weight: bold; background: #e6f7ff; }
  tr.acc td { font-weight: bold; background: #fff7e6; }
  .ky { display: flex; justify-content: space-around; margin-top: 24px; text-align: center; font-size: 11px; }
  .ky div { width: 30%; }
  .ky .name { font-weight: bold; }
  .ky .note { font-style: italic; font-size: 10px; }
</style></head>
<body>
  <div class="cty">${esc(opts.tenCongTy ?? "")}</div>
  <h1>Tổng hợp công nợ</h1>
  <div class="sub">${phuDe}</div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">Mã ĐT</th><th rowspan="2">Tên đối tượng</th>
        <th colspan="2">Số dư đầu kỳ</th>
        <th colspan="2">Số phát sinh</th>
        <th colspan="2">Số dư cuối kỳ</th>
      </tr>
      <tr>
        <th>Phải thu</th><th>Phải trả</th>
        <th>Phải thu</th><th>Phải trả</th>
        <th>Phải thu</th><th>Phải trả</th>
      </tr>
    </thead>
    <tbody>${rows.join("")}</tbody>
  </table>
  <div class="ky">
    <div><div class="name">Người lập biểu</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="name">Kế toán trưởng</div><div class="note">(Ký, họ tên)</div></div>
    <div><div class="name">Giám đốc</div><div class="note">(Ký, đóng dấu)</div></div>
  </div>
</body></html>`;
}

/** In qua iframe ẩn — cùng cơ chế với printNkcList/printPhieu. */
export function printCongNo(
  data: BangTongHopCongNo | null,
  opts: CongNoPrintOptions = {},
): void {
  const html = buildCongNoHtml(data, opts);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
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
