import React from "react";
import { InputNumber, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { HangBang, LoaiHang } from "./tongHop";

export const tien = (v?: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(v ?? 0));

export const phanTramText = (v: number) => `${(v * 100).toFixed(2)}%`;

/** Hàng tổng và hàng nhóm không sửa được, chỉ hiển thị số cộng dồn. */
export const laHangGop = (loai: LoaiHang) => loai !== "chiTiet";

export const rowClassName = (row: { loai: LoaiHang }) =>
  row.loai === "tong"
    ? "kh-hang-tong"
    : row.loai === "nhom"
      ? "kh-hang-nhom"
      : "";

/** Chữ số bên phải, hàng gộp in đậm. */
const soCell = (loai: LoaiHang, noiDung: React.ReactNode) => (
  <span className={laHangGop(loai) ? "font-semibold" : undefined}>{noiDung}</span>
);

export const numberInputProps = {
  size: "small" as const,
  variant: "borderless" as const,
  className: "w-full excel-cell-input",
  min: 0,
  formatter: (v: string | number | undefined) => tien(Number(v)),
  parser: (v: string | undefined) => Number((v ?? "").replace(/\D/g, "")),
};

interface CotSoThoiGianOptions<T> {
  /** Dòng này đang được sửa hay không. */
  dangSua: (row: T) => boolean;
  /** Mảng 12 tháng đang gõ trên form. */
  thangDangGo: () => number[];
  doiThang: (chiSo: number, giaTri: number) => void;
}

/**
 * Nhóm cột "Quý" (Q1…Q4, luôn tự tính) và nhóm cột "Tháng" (T1…T12, ô nhập).
 * Dùng chung cho cả bảng Bán hàng lẫn bảng Nhân sự.
 */
export function cotQuyVaThang<T extends HangBang<unknown>>(
  opts: CotSoThoiGianOptions<T>,
): ColumnsType<T> {
  const cotQuy = [0, 1, 2, 3].map((i) => ({
    title: `Q${i + 1}`,
    key: `q${i + 1}`,
    width: 120,
    align: "right" as const,
    render: (_: unknown, row: T) => soCell(row.loai, tien(row.quy[i])),
  }));

  const cotThang = Array.from({ length: 12 }, (_, i) => ({
    title: `T${i + 1}`,
    key: `t${i + 1}`,
    width: 120,
    align: "right" as const,
    render: (_: unknown, row: T) => {
      if (opts.dangSua(row)) {
        return (
          <InputNumber
            {...numberInputProps}
            value={opts.thangDangGo()[i] ?? 0}
            onChange={(v) => opts.doiThang(i, Number(v) || 0)}
          />
        );
      }
      return soCell(row.loai, tien(row.thang[i]));
    },
  }));

  return [
    { title: "Quý", key: "quy", children: cotQuy },
    { title: "Tháng", key: "thang", children: cotThang },
  ];
}

/**
 * Ô số năm (Doanh thu / CỘNG). Tô đỏ kèm chú thích khi tổng 12 tháng lệch —
 * chỉ cảnh báo, không chặn lưu.
 */
export function oSoNam<T extends HangBang<unknown>>(row: T, tenChiTieu: string) {
  const noiDung = soCell(row.loai, tien(row.namKhaiBao));
  if (!row.lech) return noiDung;
  return (
    <Tooltip
      title={`Tổng 12 tháng (${tien(row.namTheoThang)}) khác ${tenChiTieu} (${tien(
        row.namKhaiBao,
      )})`}
    >
      <span className="text-red-500 font-semibold">{tien(row.namKhaiBao)}</span>
    </Tooltip>
  );
}

/** Gộp cột nhãn cấp 1 + cấp 2 lại ở hàng tổng và hàng nhóm. */
export const onCellNhan = (row: { loai: LoaiHang }) =>
  laHangGop(row.loai) ? { colSpan: 2 } : {};

export const onCellNhanPhu = (row: { loai: LoaiHang }) =>
  laHangGop(row.loai) ? { colSpan: 0 } : {};
