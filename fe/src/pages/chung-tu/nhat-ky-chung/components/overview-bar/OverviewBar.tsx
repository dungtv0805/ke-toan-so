import { FileTextOutlined, DollarOutlined } from "@ant-design/icons";
import { useNhatKyChungState } from "../../NhatKyChungHandlerContext";
import "../../handler/sub-handler/init/init.state";

const nf = new Intl.NumberFormat("vi-VN");

/**
 * Hai khối số liệu của TOÀN BỘ bút toán khớp bộ lọc (không chỉ trang đang xem).
 * Đứng cùng hàng với các nút thao tác của bảng để cả trang chỉ còn 2 hàng phía trên.
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
    <div className="nkc-stats">
      <div className="nkc-stat nkc-stat--count">
        <div className="nkc-stat__label">Số lượng bút toán</div>
        <div className="nkc-stat__value">
          <FileTextOutlined className="nkc-stat__icon" />
          {nf.format(stats?.tongButToan || 0)}
        </div>
      </div>

      <div className="nkc-stat nkc-stat--money">
        <div className="nkc-stat__label">Tổng giá trị</div>
        <div className="nkc-stat__value">
          <DollarOutlined className="nkc-stat__icon" />
          {nf.format(stats?.tongGiaTri || 0)}
          <span className="nkc-stat__unit">đ</span>
        </div>
      </div>
    </div>
  );
}
