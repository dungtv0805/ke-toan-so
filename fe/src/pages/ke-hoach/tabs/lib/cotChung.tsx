import React from "react";
import { InputNumber, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { HangBang, LoaiHang } from "./tongHop";
import { LECH_TOI_THIEU } from "./tongHop";

export const tien = (v?: number) =>
  new Intl.NumberFormat("vi-VN").format(Math.round(v ?? 0));

export const phanTramText = (v: number) => `${(v * 100).toFixed(2)}%`;

/**
 * Bốn cấp thông tin của bảng kế hoạch. Nguyên tắc bắt buộc: CÙNG CẤP = CÙNG MÀU
 * — không nhạt dần theo từng cột riêng lẻ, vì như vậy người đọc không nhận ra
 * đâu là ranh giới giữa hai cấp.
 */
export const CAP_CHINH = "kh-cot-chinh";
export const CAP_NAM = "kh-cot-nam";
export const CAP_QUY = "kh-cot-quy";
export const CAP_THANG = "kh-cot-thang";

/** Gắn cùng một lớp cho ô tiêu đề và ô dữ liệu của một cột. */
export const capCot = (lop: string) => ({
  className: lop,
  onHeaderCell: () => ({ className: lop }),
});

export interface NhanChenhLech {
  text: string;
  tooltip: string;
  lop: string;
}

/**
 * Nhãn của cột CHÊNH LỆCH. Trả `null` khi đã khớp — ô để trống, không tô gì.
 *
 * Dấu trừ dùng ký tự minus thật (−, U+2212) chứ không phải gạch nối: ở cỡ chữ
 * bảng, gạch nối dễ đọc nhầm thành dấu ngăn cách.
 */
export function nhanChenhLech(chenhLech: number): NhanChenhLech | null {
  if (Math.abs(chenhLech) < LECH_TOI_THIEU) return null;
  const vuot = chenhLech > 0;
  const so = tien(Math.abs(chenhLech));
  return {
    text: `${vuot ? "+" : "\u2212"}${so}`,
    tooltip: vuot ? `Phân bổ vượt mục tiêu ${so} \u20ab` : `Còn thiếu ${so} \u20ab`,
    lop: vuot ? "text-green-600 font-semibold" : "text-red-500 font-semibold",
  };
}

/** Hàng tổng và hàng nhóm chỉ hiển thị số cộng dồn, không gõ được. */
export const laHangGop = (loai: LoaiHang) => loai !== "chiTiet";

/** Ô nhập trong bảng — phẳng, không viền, hoà vào lưới như ô Excel. */
export const numberInputProps = {
  size: "small" as const,
  variant: "borderless" as const,
  className: "w-full excel-cell-input text-right",
  min: 0,
  controls: false,
  formatter: (v: string | number | undefined) =>
    v === undefined || v === null || v === "" ? "" : tien(Number(v)),
  parser: (v: string | undefined) => Number((v ?? "").replace(/\D/g, "")),
};

/**
 * Ô nhập cho phép SỐ ÂM — bảng Nguồn vốn nhập biến động, giảm là số âm.
 *
 * `numberInputProps` ở trên đặt `min: 0` và parser `replace(/\D/g, "")` nên nuốt
 * mất dấu trừ; ở đây phải giữ lại đúng một dấu trừ đứng đầu.
 */
export const numberInputPropsCoAm = {
  ...numberInputProps,
  min: undefined,
  parser: (v: string | undefined) => {
    const tho = v ?? "";
    const am = tho.trim().startsWith("-");
    const so = Number(tho.replace(/\D/g, "")) || 0;
    return am ? -so : so;
  },
};

/** Chữ số bên phải, hàng gộp in đậm. */
const soCell = (loai: LoaiHang, noiDung: React.ReactNode) => (
  <span className={laHangGop(loai) ? "font-semibold" : undefined}>
    {noiDung}
  </span>
);

interface CotSoThoiGianOptions<T> {
  /** Dòng này có gõ được không (hàng gộp thì không). */
  suaDuoc: (row: T) => boolean;
  doiThang: (row: T, chiSo: number, giaTri: number) => void;
}

/**
 * Cột CẢ NĂM — cột cuối cùng của vùng GHIM. Tự tính, không nhập được.
 *
 * Tách riêng khỏi CHÊNH LỆCH vì ranh giới ghim nằm đúng giữa hai cột này: khi
 * kéo ngang xem từng tháng, người dùng cần CẢ NĂM luôn đứng yên để đối chiếu,
 * còn CHÊNH LỆCH thì không.
 */
export function cotCaNam<T extends HangBang<unknown>>(): ColumnsType<T> {
  return [
    {
      title: "CẢ NĂM",
      key: "caNam",
      width: 140,
      align: "right",
      ...capCot(CAP_NAM),
      render: (_: unknown, row: T) => soCell(row.loai, tien(row.namTheoThang)),
    },
  ];
}

/** Cột CHÊNH LỆCH — cột đầu tiên của vùng CUỘN. */
export function cotChenhLech<T extends HangBang<unknown>>(): ColumnsType<T> {
  return [
    {
      title: "CHÊNH LỆCH",
      key: "chenhLech",
      width: 140,
      align: "right",
      ...capCot(CAP_NAM),
      render: (_: unknown, row: T) => {
        const nhan = nhanChenhLech(row.chenhLech);
        if (!nhan) return null;
        return (
          <Tooltip title={nhan.tooltip}>
            <span className={nhan.lop}>{nhan.text}</span>
          </Tooltip>
        );
      },
    },
  ];
}

/**
 * Hai cột tổng hợp cấp năm, luôn đứng TRƯỚC nhóm Quý (thứ tự tài liệu:
 * CẢ NĂM → Q1..Q4 → T1..T12). Cả hai đều tự tính, không nhập được.
 */
export function cotCaNamVaChenhLech<
  T extends HangBang<unknown>,
>(): ColumnsType<T> {
  return [...cotCaNam<T>(), ...cotChenhLech<T>()];
}

/**
 * Ghim các cột đầu bảng vào mép trái.
 *
 * Chỉ dùng cho khối cột LIỀN NHAU tính từ cột đầu tiên — antd tính offset của
 * cột sticky bằng cách cộng dồn bề rộng các cột ghim đứng trước, ghim cách
 * quãng là lệch.
 *
 * Bề rộng các cột này do `useCotCoGian` giữ trong state React chứ không sửa
 * thẳng DOM — đó là điều kiện bắt buộc để ghim và co giãn sống chung được.
 */
export function ghimTrai<T>(cols: ColumnsType<T>): ColumnsType<T> {
  return cols.map((c) => ({ ...c, fixed: "left" as const }));
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
    width: 110,
    align: "right" as const,
    ...capCot(CAP_QUY),
    render: (_: unknown, row: T) => soCell(row.loai, tien(row.quy[i])),
  }));

  const cotThang = Array.from({ length: 12 }, (_, i) => ({
    title: `T${i + 1}`,
    key: `t${i + 1}`,
    width: 110,
    align: "right" as const,
    ...capCot(CAP_THANG),
    render: (_: unknown, row: T) =>
      opts.suaDuoc(row) ? (
        <InputNumber
          {...numberInputProps}
          value={row.thang[i] ?? 0}
          onChange={(v) => opts.doiThang(row, i, Number(v) || 0)}
        />
      ) : (
        soCell(row.loai, tien(row.thang[i]))
      ),
  }));

  return [
    { title: "Quý", key: "quy", ...capCot(CAP_QUY), children: cotQuy },
    { title: "Tháng", key: "thang", ...capCot(CAP_THANG), children: cotThang },
  ];
}

/** Gộp cột nhãn cấp 1 + cấp 2 lại ở hàng tổng và hàng nhóm. */
export const onCellNhan = (row: { loai: LoaiHang }) =>
  laHangGop(row.loai) ? { colSpan: 2 } : {};

export const onCellNhanPhu = (row: { loai: LoaiHang }) =>
  laHangGop(row.loai) ? { colSpan: 0 } : {};

/** Nền phân biệt: hàng tổng, hàng nhóm, và hàng đang có sửa đổi chưa lưu. */
export const rowClassName = (row: {
  loai: LoaiHang;
  chuaLuu?: boolean;
}): string => {
  if (row.loai === "tong") return "kh-hang-tong";
  if (row.loai === "nhom") return "kh-hang-nhom";
  return row.chuaLuu ? "kh-hang-nhap" : "";
};
