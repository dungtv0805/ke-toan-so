import React from "react";
import { Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { QuyChuan } from "@/types";
import { laDongNhom, type QuyChuanRow } from "./gomNhom";

/**
 * Biến bộ cột phẳng thành bộ cột của bảng cây.
 *
 * Hai việc, cả hai đều là chuyện "mỗi hàng đọc trên MỘT dòng":
 *  - Dòng nhóm chiếm trọn chiều ngang (colSpan hết bảng). Nhét dòng nhóm vào ô
 *    "Nghiệp vụ" rộng 220px thì icon thu gọn, thẻ tên và số lượng rơi xuống ba
 *    dòng chồng nhau.
 *  - Các ô cắt gọn (`ellipsis`) nên nội dung dài không đẩy hàng cao gấp đôi hàng
 *    bên cạnh — TRỪ cột Nghiệp vụ: đó là thứ người dùng đọc để nhận ra dòng,
 *    cắt mất đuôi thì "Thu hoàn ứng của nhân…" với "Thu hoàn ứng của nhà…" nhìn
 *    y hệt nhau. Cột này cho xuống dòng, hiện đủ chữ.
 */
const COT_CHO_XUONG_DONG = new Set(['nghiepVu']);

export function dungCotCay(cot: ColumnsType<QuyChuan>): ColumnsType<QuyChuanRow> {
  return cot.map((col, i) => ({
    ...col,
    ellipsis: !COT_CHO_XUONG_DONG.has(String(col.key ?? '')),
    onCell: (record: QuyChuanRow) =>
      laDongNhom(record) ? { colSpan: i === 0 ? cot.length : 0 } : {},
    render: (value: unknown, record: QuyChuanRow, index: number) => {
      if (laDongNhom(record)) {
        if (i > 0) return null;
        return (
          <span className="inline-flex items-center gap-2 whitespace-nowrap font-medium">
            <Tag color={record.color} className="!mr-0">
              {record.ten}
            </Tag>
            <span className="text-xs font-normal text-muted-foreground">
              {record.soLuong} quy chuẩn
            </span>
          </span>
        );
      }
      const goc = col.render as
        | ((v: unknown, r: QuyChuan, i: number) => React.ReactNode)
        | undefined;
      return goc ? goc(value, record as QuyChuan, index) : (value as React.ReactNode);
    },
  })) as ColumnsType<QuyChuanRow>;
}
