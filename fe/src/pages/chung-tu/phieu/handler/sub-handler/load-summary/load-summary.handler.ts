import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { PhieuSummaryType, PhieuQueryParams } from "@/services/phieuService";
import { LoadSummaryEvent } from "./load-summary.event";
import "./load-summary.event";

@RegisterHandler("phieu")
export class LoadSummaryHandler extends CSubHanlder<LoadSummaryEvent, PhieuStates> {
  private buildQueryParams(): PhieuQueryParams {
    const searchText = (this.getState("searchText") as string) || "";
    const dateRange = this.getState("dateRange") as
      | [{ format: (f: string) => string }, { format: (f: string) => string }]
      | null;
    const filterDoiTuong = this.getState("filterDoiTuong") as string | undefined;
    const filterDuAn = this.getState("filterDuAn") as string | undefined;
    const filterBoPhan = this.getState("filterBoPhan") as string | undefined;
    const filterTaiKhoanNo = this.getState("filterTaiKhoanNo") as string | undefined;
    const filterTaiKhoanCo = this.getState("filterTaiKhoanCo") as string | undefined;
    const params: PhieuQueryParams = {};
    if (searchText) params.search = searchText;
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.startDate = dateRange[0].format("YYYY-MM-DD");
      params.endDate = dateRange[1].format("YYYY-MM-DD");
    }
    if (filterDoiTuong) params.doiTuong = filterDoiTuong;
    if (filterDuAn) params.duAn = filterDuAn;
    if (filterBoPhan) params.boPhan = filterBoPhan;
    if (filterTaiKhoanNo) params.taiKhoanNo = filterTaiKhoanNo;
    if (filterTaiKhoanCo) params.taiKhoanCo = filterTaiKhoanCo;
    return params;
  }

  @HandlerDecorator("loadSummary")
  async loadSummary(params: { type: PhieuSummaryType }): Promise<void> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return;
    const loadingMap = (this.getState("summaryLoading") as Record<string, boolean>) || {};
    this.setState("summaryLoading", { ...loadingMap, [params.type]: true });
    try {
      const rows = await config.service.getSummary(params.type, this.buildQueryParams());
      const map = (this.getState("summaryData") as Record<string, unknown>) || {};
      this.setState("summaryData", { ...map, [params.type]: rows });
    } catch (e) {
      console.error("Error loading summary:", e);
    } finally {
      const m = (this.getState("summaryLoading") as Record<string, boolean>) || {};
      this.setState("summaryLoading", { ...m, [params.type]: false });
    }
  }
}
