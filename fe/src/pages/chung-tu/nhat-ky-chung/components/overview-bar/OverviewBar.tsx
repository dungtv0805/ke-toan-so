import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import "../../handler/sub-handler/init/init.state";

const nf = new Intl.NumberFormat("vi-VN");

/**
 * Hàng số liệu tổng quan ngay dưới hàng lọc: số lượng bút toán và tổng giá trị
 * của TOÀN BỘ bút toán khớp bộ lọc (không chỉ trang đang xem).
 */
export function OverviewBar() {
  const [stats] = useNhatKyChungState("stats", {
    tongButToan: 0,
    tongThu: 0,
    tongChi: 0,
    soDu: 0,
    tongGiaTri: 0,
  });

  return (
    <div className="nkc-overview-bar">
      <div className="nkc-overview-bar__item">
        <span className="nkc-overview-bar__label">Số lượng bút toán</span>
        <span className="nkc-overview-bar__value">
          {nf.format(stats?.tongButToan || 0)}
        </span>
      </div>
      <div className="nkc-overview-bar__item">
        <span className="nkc-overview-bar__label">Tổng giá trị</span>
        <span className="nkc-overview-bar__value nkc-overview-bar__value--money">
          {nf.format(stats?.tongGiaTri || 0)}
        </span>
      </div>
    </div>
  );
}
