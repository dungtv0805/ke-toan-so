import React, { useMemo } from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTableBodyHeight } from "@/hooks/useTableBodyHeight";
import { useManHinh } from "@/hooks/useManHinh";
import { RONG_COT_GHIM_DIEN_THOAI } from "@/components/table/ghimTheoManHinh";
import type { KqkdKeHoachReport } from "@/services/kqkdKeHoachService";
import { useKqkdState } from "./KqkdHandlerContext";
// Hai thư mục `lib` khác nhau: `./lib` là của riêng tab KQKD, `../lib` dùng chung
// cho cả ba tab bảng.
import {
  giaTri,
  phanTramDS,
  tyTrong,
  type HangKqkd,
} from "./lib/kqkdKeHoachRows";
import {
  capCot,
  CAP_CHINH,
  CAP_NAM,
  CAP_QUY,
  CAP_THANG,
  tien,
} from "../lib/cotChung";
import { COT_KY, type CotKy } from "../lib/kyCot";

const GACH = <span className="text-gray-400">-</span>;

/** Số 0 hiện gạch ngang, số âm trong ngoặc màu đỏ — y như trang Báo cáo KQKD. */
const oSo = (v: number, cap: HangKqkd["cap"]) => {
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

/** Ô tỷ lệ (%DS, Tỷ trọng): chưa tính được hoặc bằng 0 đều hiện gạch ngang. */
const oTyLe = (v: number | null) => {
  if (v === null || v === 0) return GACH;
  const chu = `${(Math.abs(v) * 100).toFixed(1)}%`;
  return (
    <span className={v < 0 ? "text-red-500" : undefined}>
      {v < 0 ? `(${chu})` : chu}
    </span>
  );
};

// Tô nền theo cấp kỳ: tháng nhạt nhất, quý đậm hơn, 6 tháng và cả năm đậm nhất
// — mắt bám được ranh giới giữa các cụm trong mười chín cụm cột.
const capCuaKy = (ky: CotKy) => {
  const soThang = ky.den - ky.tu;
  if (soThang === 1) return CAP_THANG;
  if (soThang === 3) return CAP_QUY;
  return CAP_NAM;
};

/**
 * Bộ cột của bảng P&L: cột Chỉ tiêu rồi mười chín cụm kỳ, mỗi cụm ba cột
 * Số tiền · %DS · Tỷ trọng — đúng dạng bảng nghiệp vụ và khớp bảng So sánh.
 *
 * Cột "Chỉ tiêu" GHIM TRÁI ở mọi cỡ màn: vuốt sang cột tháng mà mất tên dòng
 * thì bảng vô dụng, đúng như file Excel đóng băng cột tên chỉ tiêu. Điện thoại
 * còn hẹp cột lại cho vừa màn (tên dài xuống dòng, không cắt "…").
 */
export const cotKqkd = (
  dienThoai: boolean,
  baoCao: KqkdKeHoachReport | null,
): ColumnsType<HangKqkd> => [
  {
    title: "Chỉ tiêu",
    dataIndex: "nhan",
    key: "nhan",
    width: dienThoai ? RONG_COT_GHIM_DIEN_THOAI : 320,
    fixed: "left",
    ...capCot(CAP_CHINH),
    render: (nhan: string, row) => (
      <span className={row.cap === 0 ? "font-semibold" : undefined}>
        {nhan}
      </span>
    ),
  },
  ...COT_KY.map((ky) => {
    const nen = capCot(capCuaKy(ky));
    const oChung = { align: "right" as const, ...nen };
    return {
      title: ky.title,
      key: ky.key,
      ...nen,
      children: [
        {
          ...oChung,
          title: "Số tiền",
          key: `${ky.key}-tien`,
          width: 140,
          render: (_: unknown, row: HangKqkd) =>
            oSo(giaTri(row, ky.tu, ky.den), row.cap),
        },
        {
          ...oChung,
          title: "%DS",
          key: `${ky.key}-ds`,
          width: 80,
          render: (_: unknown, row: HangKqkd) =>
            oTyLe(baoCao ? phanTramDS(baoCao, row, ky.tu, ky.den) : null),
        },
        {
          ...oChung,
          title: "Tỷ trọng",
          key: `${ky.key}-tt`,
          width: 80,
          render: (_: unknown, row: HangKqkd) =>
            oTyLe(tyTrong(row, ky.tu, ky.den)),
        },
      ],
    };
  }),
];

export const KqkdTable: React.FC = () => {
  const [hang] = useKqkdState("hang", []);
  const [baoCao] = useKqkdState("baoCao", null);
  const [loading] = useKqkdState("loading", false);
  const [nguon] = useKqkdState("loaiKeHoach", "KE_HOACH");
  // Đo theo viewport thật ở MỌI cỡ màn, không còn nhánh `100vh - 260px` cho máy
  // tính: con số đó đoán theo chiều cao thanh công cụ + thanh tab của riêng
  // trang Kế hoạch, nên bảng đứng trong trang P&L Thực hiện (đầu trang mỏng hơn
  // nhiều) sẽ hụt cả trăm pixel. Bảng anh em Pnl3LopTable đã đo như vậy sẵn.
  const { ref: tableWrapRef, height: tableBodyHeight } = useTableBodyHeight();
  const dienThoai = useManHinh() === "mobile";
  const columns = useMemo(
    () => cotKqkd(dienThoai, baoCao),
    [dienThoai, baoCao],
  );

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
