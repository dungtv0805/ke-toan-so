import { Tooltip } from "antd";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import { EMPTY_STATS } from "../../handler/sub-handler/init/init.state";
import {
  buildNkcSummaryRows,
  type NkcSummaryRow,
} from "../../handler/lib/nkcSummaryRows";

const nf = new Intl.NumberFormat("vi-VN");
/** Thẻ đứng 8 cái một dòng nên số phải ngắn — tiền quy về triệu đồng. */
const nfTrieu = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const nfPhanTram = new Intl.NumberFormat("vi-VN", {
  style: "percent",
  maximumFractionDigits: 1,
});

/** Dòng 1 của thẻ: số bút toán, hoặc tỷ lệ tính theo số bút toán. */
const dongSoLuong = (row: NkcSummaryRow) =>
  row.kind === "ratio"
    ? nfPhanTram.format(row.theoSoLuong)
    : nf.format(row.theoSoLuong);

/** Dòng 2 của thẻ: tiền (triệu), hoặc tỷ lệ tính theo giá trị. */
const dongGiaTri = (row: NkcSummaryRow) =>
  row.kind === "ratio"
    ? `${nfPhanTram.format(row.theoGiaTri)} GT`
    : `${nfTrieu.format(row.theoGiaTri / 1_000_000)} tr`;

/** Chú thích khi rê chuột — số làm tròn trên thẻ luôn xem được số đầy đủ. */
const chuThich = (row: NkcSummaryRow) =>
  row.kind === "ratio"
    ? `${row.label}/Tổng: ${nfPhanTram.format(row.theoSoLuong)} theo số lượng · ${nfPhanTram.format(row.theoGiaTri)} theo giá trị`
    : `${row.label}: ${nf.format(row.theoSoLuong)} bút toán · ${nf.format(row.theoGiaTri)} đ`;

/**
 * Hàng số liệu của TOÀN BỘ bút toán khớp bộ lọc (không chỉ trang đang xem):
 * 5 thẻ đếm theo trạng thái kiểm soát + 3 thẻ tỷ lệ. Mỗi thẻ 2 dòng — dòng trên
 * theo số lượng, dòng dưới theo giá trị.
 */
export function OverviewBar() {
  const [stats] = useNhatKyChungState("stats", EMPTY_STATS);
  const rows = buildNkcSummaryRows(stats);

  return (
    <div className="nkc-stats">
      {rows.map((row) => (
        <Tooltip key={row.key} title={chuThich(row)}>
          <div className={`nkc-stat nkc-stat--${row.tone}`}>
            <div className="nkc-stat__label">{row.label}</div>
            <div className="nkc-stat__value">{dongSoLuong(row)}</div>
            <div className="nkc-stat__sub">{dongGiaTri(row)}</div>
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
