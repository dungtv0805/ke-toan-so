import React, { useMemo } from "react";
import { Empty, Select, Space, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTableBodyHeight } from "@/hooks/useTableBodyHeight";
import { useManHinh } from "@/hooks/useManHinh";
import { RONG_COT_GHIM_DIEN_THOAI } from "@/components/table/ghimTheoManHinh";
import { capCot, CAP_CHINH, CAP_NAM, CAP_QUY, CAP_THANG, tien } from "../lib/cotChung";
import {
  COT_KY,
  ghep3Lop,
  giaTriO,
  laLopTien,
  LOP_OPTIONS,
  phanTramDS,
  tyTrong,
  type CotKy,
  type Hang3Lop,
  type Lop,
} from "./lib/pnl3LopRows";
import { usePnl3LopHandler, usePnl3LopState } from "./Pnl3LopHandlerContext";

const { Text } = Typography;

const GACH = <span className="text-gray-400">-</span>;

/** Ba lớp số tiền: hiện y như bảng P&L — 0 thành gạch ngang, âm đỏ trong ngoặc. */
const oTien = (v: number, cap: Hang3Lop["cap"]) => {
  if (v === 0) return GACH;
  const chu = v < 0 ? `(${tien(Math.abs(v))})` : tien(v);
  return (
    <span
      className={[cap === 0 ? "font-semibold" : "", v < 0 ? "text-red-500" : ""]
        .filter(Boolean)
        .join(" ")}
    >
      {chu}
    </span>
  );
};

/**
 * Lớp CHÊNH LỆCH (Thực hiện − Kế hoạch). Xanh là làm hơn kế hoạch, đỏ là hụt —
 * giữ đúng quy ước màu và dấu minus thật (−) của bảng cũ.
 *
 * Không gắn tooltip từng ô: bảng có tới 19 cột kỳ, 19 tooltip mỗi dòng chỉ làm
 * vướng chuột. Câu giải thích đặt một lần ở thanh công cụ.
 */
const oChenhLech = (v: number) => {
  if (v === 0) return GACH;
  const duong = v > 0;
  return (
    <span
      className={
        duong ? "text-green-600 font-semibold" : "text-red-500 font-semibold"
      }
    >
      {duong ? "+" : "−"}
      {tien(Math.abs(v))}
    </span>
  );
};

/** Lớp % ĐẠT. `null` = kỳ đó chưa lập kế hoạch nên không có gì để đạt. */
const oPhanTramDat = (v: number | null) => {
  if (v === null) return <span className="text-gray-400">—</span>;
  return (
    <span className={v < 0 ? "text-red-500" : undefined}>
      {`${(v * 100).toFixed(1)}%`}
    </span>
  );
};

/** Ô tỷ lệ (%DS, Tỷ trọng): 0 và "không chia được" đều hiện gạch ngang. */
const oTyLe = (v: number | null) => {
  if (v === null || v === 0) return GACH;
  const chu = `${(Math.abs(v) * 100).toFixed(1)}%`;
  return (
    <span className={v < 0 ? "text-red-500" : undefined}>
      {v < 0 ? `(${chu})` : chu}
    </span>
  );
};

export const Pnl3LopTable: React.FC = () => {
  const handler = usePnl3LopHandler();
  const [baoCao] = usePnl3LopState("baoCao", null);
  const [loading] = usePnl3LopState("loading", false);
  // Mặc định Thực hiện: mở trang là thấy ngay bảng số tiền đầy đủ
  // (Số tiền · %DS · Tỷ trọng), đổi sang Chênh lệch khi cần soi kế hoạch.
  const [lop] = usePnl3LopState("lop", "thucHien");
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();
  // Điện thoại: cột "Chỉ tiêu" 380px là cả màn chỉ thấy tên, vuốt sang thì mất
  // tên → ghim trái và hẹp lại (tên dài xuống dòng, không cắt "…").
  const dienThoai = useManHinh() === "mobile";

  const rows = useMemo<Hang3Lop[]>(
    () => (baoCao ? ghep3Lop(baoCao) : []),
    [baoCao],
  );

  const columns = useMemo<ColumnsType<Hang3Lop>>(() => {
    const lopXem = lop as Lop;
    const laTien = laLopTien(lopXem);

    /** Ô SỐ TIỀN (hoặc chênh lệch / % đạt) của một kỳ. */
    const oGiaTri = (row: Hang3Lop, ky: CotKy) => {
      const v = giaTriO(row, lopXem, ky.tu, ky.den);
      if (lopXem === "phanTramDat") return oPhanTramDat(v);
      if (lopXem === "chenhLech") return oChenhLech(v ?? 0);
      return oTien(v ?? 0, row.cap);
    };

    /**
     * Mỗi kỳ là một cụm cột. Ba lớp số tiền có đủ Số tiền · %DS · Tỷ trọng;
     * Chênh lệch và % đạt thì hai cột tỷ lệ kia vô nghĩa (chênh lệch không phải
     * số tiền của lớp nào, % đạt đã là tỷ lệ rồi) nên cụm rút còn một cột.
     */
    const cumKy = (ky: CotKy, cap: string) => {
      const cot = {
        width: 130,
        align: "right" as const,
        ...capCot(cap),
      };
      if (!laTien) {
        return {
          ...cot,
          title: ky.title,
          key: ky.key,
          render: (_: unknown, row: Hang3Lop) => oGiaTri(row, ky),
        };
      }
      return {
        title: ky.title,
        key: ky.key,
        ...capCot(cap),
        children: [
          {
            ...cot,
            title: "Số tiền",
            key: `${ky.key}-tien`,
            render: (_: unknown, row: Hang3Lop) => oGiaTri(row, ky),
          },
          {
            ...cot,
            width: 80,
            title: "%DS",
            key: `${ky.key}-ds`,
            render: (_: unknown, row: Hang3Lop) =>
              oTyLe(baoCao ? phanTramDS(baoCao, row, lopXem, ky.tu, ky.den) : null),
          },
          {
            ...cot,
            width: 80,
            title: "Tỷ trọng",
            key: `${ky.key}-tt`,
            render: (_: unknown, row: Hang3Lop) =>
              oTyLe(tyTrong(row, lopXem, ky.tu, ky.den)),
          },
        ],
      };
    };

    // Tô nền theo cấp kỳ: tháng nhạt nhất, quý đậm hơn, 6 tháng và cả năm đậm
    // nhất — mắt bám được ranh giới giữa các cụm trong 19 cụm cột.
    const capCuaKy = (ky: CotKy) => {
      if (ky.den - ky.tu === 1) return CAP_THANG;
      if (ky.den - ky.tu === 3) return CAP_QUY;
      return CAP_NAM;
    };

    return [
      {
        title: "Chỉ tiêu",
        dataIndex: "nhan",
        key: "nhan",
        width: dienThoai ? RONG_COT_GHIM_DIEN_THOAI : 380,
        fixed: dienThoai ? ("left" as const) : undefined,
        ...capCot(CAP_CHINH),
        render: (v: string, row: Hang3Lop) => (
          <span className={row.cap === 0 ? "font-semibold" : undefined}>{v}</span>
        ),
      },
      ...COT_KY.map((ky) => cumKy(ky, capCuaKy(ky))),
    ];
  }, [baoCao, dienThoai, lop]);

  return (
    <div className="excel-container">
      <div className="excel-toolbar dt:flex-wrap">
        <Space size={8}>
          <Text type="secondary" className="text-xs">
            Xem
          </Text>
          <Select
            size="small"
            style={{ width: 140 }}
            value={lop}
            options={LOP_OPTIONS}
            onChange={(v) => handler.executeEvent("doiLop", { lop: v as Lop })}
          />
        </Space>
        <span className="text-xs text-gray-500">
          Chênh lệch và % đạt so Thực hiện với Kế hoạch, tính riêng trong từng kỳ
        </span>
      </div>

      <div ref={tableWrapRef} className="flex flex-col flex-1 min-h-0">
        <Table<Hang3Lop>
          rowKey="key"
          size="small"
          bordered
          loading={loading}
          columns={columns}
          dataSource={rows}
          pagination={false}
          className="excel-table kh-bang"
          // Mặc định đóng hết: mở trang chỉ thấy các dòng mục, như bảng P&L.
          expandable={{ defaultExpandedRowKeys: [] }}
          scroll={{ x: "max-content", y: tableBodyHeight }}
          rowClassName={(row) =>
            row.key === "HOA_VON"
              ? "kh-hang-hoa-von"
              : row.cap === 0
                ? "kh-hang-tong"
                : ""
          }
          locale={{ emptyText: <Empty description="Chưa có số liệu" /> }}
        />
      </div>
    </div>
  );
};
