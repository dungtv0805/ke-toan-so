import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import type { KeHoachPayload, LoaiKeHoach } from "@/services/keHoachService";
import {
  buildDanhMuc,
  loiCuaDong,
  ngayLuu,
  toPayload,
  type DanhMucLists,
  type RowValues,
} from "../lib/keHoachRow";

dayjs.extend(customParseFormat);

/** Cột của file Excel mẫu — ĐÚNG thứ tự 17 cột trên lưới (đọc theo vị trí). */
export const IMPORT_COLUMNS: { key: keyof RowValues; header: string }[] = [
  { key: "ngay", header: "Ngày phát sinh" },
  { key: "nghiepVu", header: "Nghiệp vụ" },
  { key: "noiDung", header: "Diễn giải" },
  { key: "taiKhoanNo", header: "TK Nợ" },
  { key: "taiKhoanCo", header: "TK Có" },
  { key: "soTien", header: "Số tiền" },
  { key: "doiTuong", header: "ĐT Nợ (mã)" },
  { key: "doiTuong2", header: "ĐT Có (mã)" },
  { key: "chuDauTu", header: "Chủ đầu tư (mã)" },
  { key: "duAn", header: "Dự án (mã)" },
  { key: "sanPham", header: "Sản phẩm (mã)" },
  { key: "boPhan", header: "Bộ phận (mã)" },
  { key: "doi", header: "Đội (mã)" },
  { key: "nhanVien", header: "Nhân viên (mã)" },
  { key: "dongTien", header: "Dòng tiền (mã)" },
  { key: "khoanMuc", header: "Khoản mục (mã)" },
  { key: "nhomQuanLy", header: "Nhóm quản lý (mã)" },
];

export interface DongImport {
  /** Số dòng trong file Excel (1-based, tính cả header) để người dùng dò lại. */
  rowNumber: number;
  payload: KeHoachPayload;
  loi: string | null;
}

export interface KetQuaImport {
  rows: DongImport[];
  soDongHopLe: number;
  soDongLoi: number;
}

/** Excel lưu ngày dưới dạng số ngày kể từ 30/12/1899. */
const MOC_EXCEL = new Date(Date.UTC(1899, 11, 30)).getTime();

export function normalizeNgay(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") {
    return new Date(MOC_EXCEL + value * 86400000).toISOString();
  }

  const text = String(value).trim();
  for (const dinhDang of ["DD/MM/YYYY", "D/M/YYYY", "YYYY-MM-DD", "DD-MM-YYYY"]) {
    const d = dayjs(text, dinhDang, true);
    if (d.isValid()) return ngayLuu(d);
  }
  const iso = dayjs(text);
  return iso.isValid() ? ngayLuu(iso) : null;
}

/** Ô do dropdown của file mẫu sinh ra có dạng "MÃ - Tên" → chỉ lấy phần mã. */
const layMa = (value: unknown): string | undefined => {
  const text = String(value ?? "").trim();
  if (!text) return undefined;
  return text.split(" - ")[0].trim();
};

const laySoTien = (value: unknown): number => {
  if (typeof value === "number") return value;
  const text = String(value ?? "").replace(/[^\d-]/g, "");
  return text ? Number(text) : 0;
};

/** Mã có nhập nhưng không khớp danh mục nào → nêu đích danh để người dùng sửa. */
function loiMaKhongCo(values: RowValues, lists: DanhMucLists): string | null {
  const danhMuc = buildDanhMuc(values, lists);
  const kiemTra: [keyof RowValues, string, boolean][] = [
    ["taiKhoanNo", "TK Nợ", !!danhMuc.taiKhoanNo],
    ["taiKhoanCo", "TK Có", !!danhMuc.taiKhoanCo],
    ["doiTuong", "ĐT Nợ", !!danhMuc.doiTuong],
    ["doiTuong2", "ĐT Có", !!danhMuc.doiTuong2],
    ["chuDauTu", "Chủ đầu tư", !!danhMuc.chuDauTu],
    ["duAn", "Dự án", !!danhMuc.duAn],
    ["sanPham", "Sản phẩm", !!danhMuc.sanPham],
    ["boPhan", "Bộ phận", !!danhMuc.boPhan],
    ["doi", "Đội", !!danhMuc.doi],
    ["nhanVien", "Nhân viên", !!danhMuc.nhanVien],
    ["dongTien", "Dòng tiền", !!danhMuc.dongTien],
    ["khoanMuc", "Khoản mục", !!danhMuc.khoanMuc],
    ["nhomQuanLy", "Nhóm quản lý", !!danhMuc.nhomQuanLy],
  ];
  for (const [field, nhan, timThay] of kiemTra) {
    const ma = values[field];
    if (ma && !timThay) return `${nhan} "${ma}" không có trong danh mục`;
  }
  return null;
}

/**
 * Đọc sheet (array-of-arrays, dòng 0 là header) thành danh sách dòng kế hoạch
 * kèm lỗi từng dòng. Map cột theo VỊ TRÍ, không theo tên header.
 */
export function parseKeHoachSheet(
  aoa: unknown[][],
  lists: DanhMucLists,
  loaiKeHoach: LoaiKeHoach,
  phienBan?: string,
): KetQuaImport {
  const rows: DongImport[] = [];

  for (let r = 1; r < (aoa?.length ?? 0); r++) {
    const cells = aoa[r] ?? [];
    const rong = cells.every(
      (c) => c === undefined || c === null || String(c).trim() === "",
    );
    if (rong) continue;

    const values: RowValues = {};
    IMPORT_COLUMNS.forEach((col, i) => {
      const cell = cells[i];
      if (col.key === "ngay") values.ngay = normalizeNgay(cell) ?? undefined;
      else if (col.key === "soTien") values.soTien = laySoTien(cell);
      else if (col.key === "noiDung") values.noiDung = String(cell ?? "").trim();
      else (values[col.key] as string | undefined) = layMa(cell);
    });

    const loi = loiCuaDong(values) ?? loiMaKhongCo(values, lists);
    rows.push({
      rowNumber: r + 1,
      payload: toPayload(values, lists, loaiKeHoach, phienBan),
      loi,
    });
  }

  return {
    rows,
    soDongHopLe: rows.filter((r) => !r.loi).length,
    soDongLoi: rows.filter((r) => r.loi).length,
  };
}
