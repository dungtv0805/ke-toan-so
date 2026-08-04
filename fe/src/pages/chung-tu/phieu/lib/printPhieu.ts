import dayjs from "dayjs";
import { ChungTu } from "@/types";
import { formatCurrency } from "./format";
import { docTienBangChu } from "./docTienBangChu";
import { toPhieuLines, type PhieuLine } from "./phieuLines";

export interface CongTyInfo {
  tenCongTy?: string;
  diaChiCongTy?: string;
}

const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"]/g, (c) => ESCAPE_MAP[c]);

/** Các mã khác rỗng, bỏ trùng, giữ thứ tự xuất hiện. */
const gopMa = (ma: string[]): string =>
  Array.from(new Set(ma.filter(Boolean))).join(", ");

/** Bảng liệt kê từng dòng hạch toán + dòng cộng. */
function buildBangChiTiet(dong: PhieuLine[]): string {
  const rows = dong
    .map(
      (d) =>
        `<tr><td>${escapeHtml(d.dienGiai)}</td>` +
        `<td class="tk">${escapeHtml(d.taiKhoanNo)}</td>` +
        `<td class="tk">${escapeHtml(d.taiKhoanCo)}</td>` +
        `<td class="tien">${formatCurrency(d.soTien)}</td></tr>`
    )
    .join("");
  const tong = dong.reduce((s, d) => s + (d.soTien || 0), 0);

  return (
    `<table class="ct-chi-tiet">` +
    `<thead><tr><th>Diễn giải</th><th>TK Nợ</th><th>TK Có</th><th>Số tiền</th></tr></thead>` +
    `<tbody>${rows}</tbody>` +
    `<tfoot><tr><td colspan="3">Cộng</td><td class="tien">${formatCurrency(tong)}</td></tr></tfoot>` +
    `</table>`
  );
}

const TOKEN_BANG_CHI_TIET = /\{\{\s*bangChiTiet\s*\}\}/;
const TOKEN_BANG_CHU = /\{\{\s*soTienBangChu\s*\}\}/;
const TOKEN_SO_TIEN = /\{\{\s*soTien\s*\}\}/;

/**
 * Mẫu in tenant đã lưu từ trước không có {{bangChiTiet}} nên chứng từ nhiều
 * dòng sẽ in thiếu. Chèn token vào ngay trước dòng "viết bằng chữ" (hoặc
 * "số tiền", hoặc cuối mẫu) để phiếu vẫn đủ chi tiết mà khách không phải sửa mẫu.
 * Chứng từ 1 dòng thì để nguyên — mẫu tuỳ biến giữ đúng hình dạng cũ.
 */
function chenBangChiTietNeuThieu(template: string, nhieuDong: boolean): string {
  if (!nhieuDong || TOKEN_BANG_CHI_TIET.test(template)) return template;

  const neo = TOKEN_BANG_CHU.exec(template) ?? TOKEN_SO_TIEN.exec(template);
  if (!neo) return `${template}\n{{bangChiTiet}}`;

  const dauDong = template.lastIndexOf("\n", neo.index) + 1;
  return `${template.slice(0, dauDong)}{{bangChiTiet}}\n${template.slice(dauDong)}`;
}

/**
 * Thay các token {{...}} trong template HTML bằng dữ liệu của phiếu.
 *
 * `dong` là các dòng hạch toán cùng số phiếu. Bỏ trống thì suy ra một dòng từ
 * chính `phieu`. Số tiền và số tiền bằng chữ luôn là TỔNG các dòng.
 */
export function buildPhieuHtml(
  phieu: ChungTu,
  template: string,
  congTy?: CongTyInfo,
  dong?: PhieuLine[]
): string {
  const lines = dong?.length ? dong : toPhieuLines([phieu]);
  const tongTien = lines.reduce((s, d) => s + (d.soTien || 0), 0);
  const ngay = phieu.ngay ? dayjs(phieu.ngay) : null;

  const values: Record<string, string> = {
    soPhieu: phieu.soPhieu ?? "",
    ngay: ngay ? ngay.format("DD") : "",
    thang: ngay ? ngay.format("MM") : "",
    nam: ngay ? ngay.format("YYYY") : "",
    nguoiGiaoDich: phieu.nguoiGiaoDich ?? "",
    diaChi: phieu.diaChi ?? "",
    noiDung: lines
      .map((d) => d.dienGiai)
      .filter(Boolean)
      .join("; "),
    soTien: formatCurrency(tongTien),
    soTienBangChu: docTienBangChu(tongTien),
    taiKhoanNo: gopMa(lines.map((d) => d.taiKhoanNo)),
    taiKhoanCo: gopMa(lines.map((d) => d.taiKhoanCo)),
    bangChiTiet: buildBangChiTiet(lines),
    ghiChu: phieu.ghiChu ?? "",
    tenCongTy: congTy?.tenCongTy ?? "",
    diaChiCongTy: congTy?.diaChiCongTy ?? "",
  };

  return chenBangChiTietNeuThieu(template, lines.length > 1).replace(
    /\{\{\s*(\w+)\s*\}\}/g,
    (_, key: string) => (key in values ? values[key] : "")
  );
}

/** Mở iframe ẩn, nạp HTML phiếu rồi gọi in (trình duyệt cho In hoặc Lưu PDF). */
export function printPhieu(
  phieu: ChungTu,
  template: string,
  congTy?: CongTyInfo,
  dong?: PhieuLine[]
): void {
  const html = buildPhieuHtml(phieu, template, congTy, dong);

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  // Ép khổ A5 ngang cho phiếu thu/chi — đặt SAU nội dung để @page này thắng cascade,
  // áp dụng cả mẫu mặc định lẫn mẫu tuỳ chỉnh tenant đã lưu (vốn để A5 portrait).
  const forcePageStyle = `<style>@page { size: A5 landscape; margin: 12mm; }</style>`;
  doc.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${phieu.soPhieu ?? "Phiếu"}</title></head><body>${html}${forcePageStyle}</body></html>`
  );
  doc.close();

  const win = iframe.contentWindow;
  if (!win) {
    document.body.removeChild(iframe);
    return;
  }

  let done = false;
  const trigger = () => {
    if (done) return;
    done = true;
    win.focus();
    win.print();
    // Để trình duyệt vẽ xong hộp thoại in trước khi gỡ iframe.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  // Chờ tài nguyên (font) tải xong; fallback nếu onload không bắn.
  win.onload = trigger;
  setTimeout(trigger, 400);
}
