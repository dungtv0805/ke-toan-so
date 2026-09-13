import React, { useMemo } from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTableBodyHeight } from "@/hooks/useTableBodyHeight";
import { useManHinh } from "@/hooks/useManHinh";
import { RONG_COT_GHIM_DIEN_THOAI } from "@/components/table/ghimTheoManHinh";
import { useKqkdState } from "./KqkdHandlerContext";
// Hai thư mục `lib` khác nhau: `./lib` là của riêng tab KQKD, `../lib` dùng chung
// cho cả ba tab bảng.
import type { HangKqkd } from "./lib/kqkdKeHoachRows";
import { tien } from "../lib/cotChung";

/** Số 0 hiện gạch ngang, số âm trong ngoặc màu đỏ — y như trang Báo cáo KQKD. */
const oSo = (v: number, cap: HangKqkd["cap"]) => {
  if (v === 0) return <span className="text-gray-400">-</span>;
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

const oPhanTram = (v: number | null) => {
  if (v === null || v === 0) return <span className="text-gray-400">-</span>;
  const chu = `${(Math.abs(v) * 100).toFixed(1)}%`;
  return (
    <span className={v < 0 ? "text-red-500" : undefined}>
      {v < 0 ? `(${chu})` : chu}
    </span>
  );
};

/**
 * Bảng có 19 cột kỳ nên phải dựng cột theo cỡ màn: cột "Chỉ tiêu" GHIM TRÁI ở
 * mọi cỡ màn — vuốt sang cột tháng mà mất tên dòng thì bảng vô dụng, đúng như
 * file Excel đóng băng cột tên chỉ tiêu.
 *
 * Điện thoại còn hẹp cột lại cho vừa màn (tên dài xuống dòng, không cắt "…").
 */
export const cotKqkd = (dienThoai: boolean): ColumnsType<HangKqkd> => [
  {
    title: "Chỉ tiêu",
    dataIndex: "nhan",
    key: "nhan",
    width: dienThoai ? RONG_COT_GHIM_DIEN_THOAI : 320,
    fixed: "left",
    render: (nhan: string, row) => (
      <span className={row.cap === 0 ? "font-semibold" : undefined}>
        {nhan}
      </span>
    ),
  },
  {
    title: "Năm",
    key: "nam",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.nam, row.cap),
  },
  {
    title: "%",
    key: "phanTram",
    width: 80,
    align: "right",
    render: (_, row) => oPhanTram(row.phanTram),
  },
  {
    title: "6 tháng đầu",
    key: "sauThangDau",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.sauThangDau, row.cap),
  },
  {
    title: "6 tháng cuối",
    key: "sauThangCuoi",
    width: 140,
    align: "right",
    render: (_, row) => oSo(row.sauThangCuoi, row.cap),
  },
  {
    title: "Quý",
    key: "quy",
    children: [0, 1, 2, 3].map((i) => ({
      title: `Q${i + 1}`,
      key: `q${i + 1}`,
      width: 130,
      align: "right" as const,
      render: (_: unknown, row: HangKqkd) => oSo(row.quy[i], row.cap),
    })),
  },
  {
    title: "Tháng",
    key: "thang",
    children: Array.from({ length: 12 }, (_, i) => ({
      title: `T${i + 1}`,
      key: `t${i + 1}`,
      width: 130,
      align: "right" as const,
      render: (_: unknown, row: HangKqkd) => oSo(row.thang[i], row.cap),
    })),
  },
];

export const KqkdTable: React.FC = () => {
  const [hang] = useKqkdState("hang", []);
  const [loading] = useKqkdState("loading", false);
  const [nguon] = useKqkdState("loaiKeHoach", "KE_HOACH");
  // Đo theo viewport thật ở MỌI cỡ màn, không còn nhánh `100vh - 260px` cho máy
  // tính: con số đó đoán theo chiều cao thanh công cụ + thanh tab của riêng
  // trang Kế hoạch, nên bảng đứng trong trang P&L Thực hiện (đầu trang mỏng hơn
  // nhiều) sẽ hụt cả trăm pixel. Bảng anh em Pnl3LopTable đã đo như vậy sẵn.
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();
  const dienThoai = useManHinh() === "mobile";
  const columns = useMemo(() => cotKqkd(dienThoai), [dienThoai]);

  return (
    // Khung flex-1 thế chỗ `.excel-table` (vốn là flex-1) — máy tính vẫn thấy
    // bảng chiếm đúng vùng cũ, không lệch pixel nào.
    <div ref={tableWrapRef} className="flex flex-col flex-1 min-h-0">
      <Table<HangKqkd>
        // `kh-bang` KHÔNG chỉ là màu bảng kế hoạch: mọi quy tắc "ô ghim phải
        // đục nền" trong index.css đều khai dưới lớp này. Bảng có cột ghim
        // mà thiếu nó thì phần bảng đang cuộn hiện xuyên qua ô ghim, chữ
        // chồng lên nhau.
        className="excel-table kh-bang"
        columns={columns}
        dataSource={hang}
        rowKey="key"
        loading={loading}
        size="small"
        bordered
        pagination={false}
        // Mặc định đóng hết: mở trang chỉ thấy các dòng mục.
        expandable={{ defaultExpandedRowKeys: [] }}
        scroll={{ x: "max-content", y: tableBodyHeight }}
        rowClassName={(row) =>
          row.key === "HOA_VON"
            ? "kh-hang-hoa-von"
            : row.cap === 0
              ? "kh-hang-tong"
              : ""
        }
        locale={{
          emptyText:
            nguon === "THUC_HIEN"
              ? "Chưa có chứng từ nào trong năm"
              : "Chưa có dòng kế hoạch nào trong năm",
        }}
      />
    </div>
  );
};
