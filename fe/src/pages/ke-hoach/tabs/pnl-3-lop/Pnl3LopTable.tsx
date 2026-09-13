import React, { useMemo } from "react";
import { Empty, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTableBodyHeight } from "@/hooks/useTableBodyHeight";
import { useManHinh } from "@/hooks/useManHinh";
import { RONG_COT_GHIM_DIEN_THOAI } from "@/components/table/ghimTheoManHinh";
import { capCot, CAP_CHINH, CAP_NAM, CAP_QUY, CAP_THANG, tien } from "../lib/cotChung";
import {
  chenhLech,
  COT_KY,
  ghep3Lop,
  giaTri,
  phanTramDS,
  tyLeChenhLech,
  tyTrong,
  type CotKy,
  type Hang3Lop,
  type LopTien,
  type Moc,
} from "./lib/pnl3LopRows";
import { usePnl3LopState } from "./Pnl3LopHandlerContext";

const { Text } = Typography;

const GACH = <span className="text-gray-400">-</span>;

/** Ô GIÁ TRỊ: 0 thành gạch ngang, âm đỏ trong ngoặc — đúng quy ước bảng P&L. */
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

/** Ô Tỷ lệ của hai khối so sánh: hụt thì đỏ và mang dấu trừ thật (−). */
const oTyLeSoSanh = (v: number | null) => {
  if (v === null) return <span className="text-gray-400">—</span>;
  if (v === 0) return GACH;
  const chu = `${(Math.abs(v) * 100).toFixed(1)}%`;
  return (
    <span className={v < 0 ? "text-red-500 font-semibold" : "text-green-600"}>
      {v < 0 ? `−${chu}` : chu}
    </span>
  );
};

const LOP_TIEN: { lop: LopTien; nhan: string }[] = [
  { lop: "keHoach", nhan: "KẾ HOẠCH" },
  { lop: "duBao", nhan: "DỰ BÁO" },
  { lop: "thucHien", nhan: "THỰC HIỆN" },
];

const KHOI_SO_SANH: { moc: Moc; nhan: string }[] = [
  { moc: "keHoach", nhan: "THỰC HIỆN vs KẾ HOẠCH" },
  { moc: "duBao", nhan: "THỰC HIỆN vs DỰ BÁO" },
];

// Tô nền theo cấp kỳ: tháng nhạt nhất, quý đậm hơn, 6 tháng và cả năm đậm nhất
// — mắt bám được ranh giới giữa các cụm trong 19 cụm cột.
const capCuaKy = (ky: CotKy) => {
  const soThang = ky.den - ky.tu;
  if (soThang === 1) return CAP_THANG;
  if (soThang === 3) return CAP_QUY;
  return CAP_NAM;
};

export const Pnl3LopTable: React.FC = () => {
  const [baoCao] = usePnl3LopState("baoCao", null);
  const [loading] = usePnl3LopState("loading", false);
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();
  // Điện thoại: cột "Chỉ tiêu" 380px là cả màn chỉ thấy tên, vuốt sang thì mất
  // tên → hẹp lại (tên dài xuống dòng, không cắt "…").
  const dienThoai = useManHinh() === "mobile";

  const rows = useMemo<Hang3Lop[]>(
    () => (baoCao ? ghep3Lop(baoCao) : []),
    [baoCao],
  );

  const columns = useMemo<ColumnsType<Hang3Lop>>(() => {
    /**
     * Một kỳ = một cụm ba tầng tiêu đề, đúng như bảng Excel nghiệp vụ:
     *   kỳ → khối (KẾ HOẠCH / DỰ BÁO / THỰC HIỆN / hai khối so sánh) → cột.
     */
    const cumKy = (ky: CotKy) => {
      const cap = capCuaKy(ky);
      const nen = capCot(cap);
      const oSo = { width: 130, align: "right" as const, ...nen };
      const oTyLeCot = { width: 80, align: "right" as const, ...nen };

      return {
        title: ky.title,
        key: ky.key,
        ...nen,
        children: [
          ...LOP_TIEN.map(({ lop, nhan }) => ({
            title: nhan,
            key: `${ky.key}-${lop}`,
            ...nen,
            children: [
              {
                ...oSo,
                title: "GIÁ TRỊ",
                key: `${ky.key}-${lop}-gt`,
                render: (_: unknown, row: Hang3Lop) =>
                  oTien(giaTri(row, lop, ky.tu, ky.den), row.cap),
              },
              {
                ...oTyLeCot,
                title: "%DS",
                key: `${ky.key}-${lop}-ds`,
                render: (_: unknown, row: Hang3Lop) =>
                  oTyLe(
                    baoCao ? phanTramDS(baoCao, row, lop, ky.tu, ky.den) : null,
                  ),
              },
              {
                ...oTyLeCot,
                title: "Tỷ trọng",
                key: `${ky.key}-${lop}-tt`,
                render: (_: unknown, row: Hang3Lop) =>
                  oTyLe(tyTrong(row, lop, ky.tu, ky.den)),
              },
            ],
          })),
          ...KHOI_SO_SANH.map(({ moc, nhan }) => ({
            title: nhan,
            key: `${ky.key}-vs-${moc}`,
            ...nen,
            children: [
              {
                ...oSo,
                title: "GIÁ TRỊ",
                key: `${ky.key}-vs-${moc}-gt`,
                render: (_: unknown, row: Hang3Lop) =>
                  oTien(chenhLech(row, moc, ky.tu, ky.den), row.cap),
              },
              {
                ...oTyLeCot,
                title: "Tỷ lệ",
                key: `${ky.key}-vs-${moc}-tl`,
                render: (_: unknown, row: Hang3Lop) =>
                  oTyLeSoSanh(tyLeChenhLech(row, moc, ky.tu, ky.den)),
              },
            ],
          })),
        ],
      };
    };

    return [
      {
        title: "Chỉ tiêu",
        dataIndex: "nhan",
        key: "nhan",
        width: dienThoai ? RONG_COT_GHIM_DIEN_THOAI : 380,
        // Ghim ở MỌI cỡ màn, không riêng điện thoại: bảng rộng hơn hai chục
        // nghìn pixel, vuốt sang kỳ sau mà mất tên chỉ tiêu thì vô dụng —
        // đúng như file Excel đóng băng cột "Tên chỉ tiêu".
        fixed: "left" as const,
        ...capCot(CAP_CHINH),
        render: (v: string, row: Hang3Lop) => (
          <span className={row.cap === 0 ? "font-semibold" : undefined}>{v}</span>
        ),
      },
      ...COT_KY.map(cumKy),
    ];
  }, [baoCao, dienThoai]);

  return (
    <div className="excel-container">
      <div className="excel-toolbar dt:flex-wrap">
        <Text type="secondary" className="text-xs">
          Mỗi kỳ bày đủ Kế hoạch · Dự báo · Thực hiện và hai khối so sánh. Tỷ lệ
          là chênh lệch chia cho mốc — vượt hay hụt bao nhiêu phần trăm.
        </Text>
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
