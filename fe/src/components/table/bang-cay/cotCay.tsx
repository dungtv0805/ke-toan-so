import React from "react";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { laDongNhom, type HangCay } from "./gomNhom";

/** Chỗ cho icon thu gọn + thụt lề một cấp, đo trên bảng antd size="middle". */
const RONG_THEM_COT_DAU = 48;

interface TuyChonCot {
  /** Nhãn đơn vị đếm trên dòng nhóm, vd "sản phẩm" → "12 sản phẩm". */
  donVi: string;
  /**
   * Key các cột được xuống dòng thay vì cắt đuôi — thường là cột tên/diễn giải,
   * thứ người dùng đọc để nhận ra dòng. Cắt mất đuôi thì hai dòng khác nhau
   * trông y hệt nhau.
   */
  cotChoXuongDong?: readonly string[];
}

/**
 * Biến bộ cột phẳng thành bộ cột của bảng cây.
 *
 * Dòng nhóm chiếm TRỌN chiều ngang (colSpan hết bảng) — nhét nó vào ô đầu tiên
 * rộng vài trăm px thì icon thu gọn, thẻ tên và số lượng rơi xuống ba dòng
 * chồng nhau. Các cột còn lại cắt gọn để mỗi bản ghi đọc trên một hàng.
 */
export function dungCotCay<T>(
  cot: ColumnsType<T>,
  { donVi, cotChoXuongDong = [] }: TuyChonCot
): ColumnsType<HangCay<T>> {
  const choXuongDong = new Set(cotChoXuongDong);
  return cot.map((col, i) => ({
    ...col,
    // Cột ĐẦU còn phải chứa icon thu gọn + phần thụt lề của cấp con. Cắt gọn nó
    // thì mã "CP001" hiện thành "C…" — bảng không đọc được thì tra vào đâu.
    ellipsis: i === 0 ? false : !choXuongDong.has(String(col.key ?? "")),
    width:
      i === 0 && typeof col.width === "number"
        ? col.width + RONG_THEM_COT_DAU
        : col.width,
    onCell: (record: HangCay<T>) =>
      laDongNhom(record) ? { colSpan: i === 0 ? cot.length : 0 } : {},
    render: (value: unknown, record: HangCay<T>, index: number) => {
      if (laDongNhom(record)) {
        if (i > 0) return null;
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium">
            <Tag color={record.color} className="!mr-0">
              {record.ten}
            </Tag>
            <span className="text-xs font-normal text-muted-foreground">
              {record.soLuong} {donVi}
            </span>
          </span>
        );
      }
      const goc = col.render as
        | ((v: unknown, r: T, i: number) => React.ReactNode)
        | undefined;
      return goc ? goc(value, record as T, index) : (value as React.ReactNode);
    },
  })) as ColumnsType<HangCay<T>>;
}
