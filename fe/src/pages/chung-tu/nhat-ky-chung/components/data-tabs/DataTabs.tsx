import { useEffect } from "react";
import {
  useNhatKyChungState,
  useNhatKyChungHandler,
} from "../../NhatKyChungHandlerContext";
import { findNkcView } from "./nkcViews";
import "./DataTabs.state";

/**
 * Nội dung của "Dữ liệu tổng hợp" theo view đang chọn. Việc chọn view nằm ở
 * dropdown trên hàng lọc (`FilterBar`) — trước đây là thanh tab ngang.
 */
export function DataTabs() {
  const [activeTab] = useNhatKyChungState("activeTab", "list");
  const handler = useNhatKyChungHandler();

  const view = findNkcView(activeTab);

  // Load summary data when switching to a summary view
  useEffect(() => {
    if (view.summaryType) {
      handler.executeEvent("loadSummary", { type: view.summaryType });
    }
  }, [view.summaryType, handler]);

  return <div className="excel-container">{view.render()}</div>;
}
