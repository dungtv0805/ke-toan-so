import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { taiKhoanService } from "@/services/taiKhoanService";
import { PhieuQueryParams } from "@/services/phieuService";
import { PhieuConfig } from "../../../phieuConfig";
import { PhieuStates } from "../../../phieu.handler";
import { InitEvent } from "./init.event";
import "./init.event";
import "./init.state";

const DEFAULT_PAGE_SIZE = 50;

@RegisterHandler("phieu")
export class InitHandler extends CSubHanlder<InitEvent, PhieuStates> {
  @HandlerDecorator("init")
  async init(params: { config: PhieuConfig }): Promise<void> {
    this.setState("config", params.config);
    this.initializeDefaultStates();
    await Promise.all([
      this.loadEntries({ page: 1, limit: DEFAULT_PAGE_SIZE }),
      this.loadTaiKhoanList(),
      this.executeEvent("loadMasterData", {}),
    ]);
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    const pagination = this.getState("pagination") as
      | { page: number; limit: number }
      | undefined;
    await Promise.all([
      this.loadEntries({
        ...this.buildQueryParams(),
        page: pagination?.page || 1,
        limit: pagination?.limit || DEFAULT_PAGE_SIZE,
      }),
      this.executeEvent("loadStats", {}),
    ]);
  }

  @HandlerDecorator("loadPage")
  async loadPage(params: { page: number; limit?: number }): Promise<void> {
    await this.loadEntries({
      ...this.buildQueryParams(),
      page: params.page,
      limit: params.limit ?? DEFAULT_PAGE_SIZE,
    });
  }

  @HandlerDecorator("loadStats")
  async loadStats(): Promise<void> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return;
    try {
      const stats = await config.service.getStats(this.buildQueryParams());
      this.setState("stats", stats);
    } catch (e) {
      console.error("Error loading stats:", e);
    }
  }

  buildQueryParams(): PhieuQueryParams {
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

  async loadEntries(params: PhieuQueryParams): Promise<void> {
    const config = this.getState("config") as PhieuConfig | undefined;
    if (!config) return;
    this.setState("loading", true);
    try {
      const response = await config.service.getAll(params);
      this.setState("data", response.data);
      this.setState("pagination", response.meta);
    } catch (e) {
      console.error("Error loading entries:", e);
    } finally {
      this.setState("loading", false);
    }
  }

  private async loadTaiKhoanList(): Promise<void> {
    try {
      const leaf = await taiKhoanService.getLeafAccounts();
      this.setState(
        "taiKhoanList",
        leaf.map((tk) => ({
          ma: tk.ma,
          ten: tk.ten,
          loai: tk.loai,
          nhom: tk.nhom,
          chiTietTheo: tk.chiTietTheo,
        }))
      );
    } catch (e) {
      console.error("Error loading tai khoan list:", e);
    }
  }

  private initializeDefaultStates(): void {
    const defaults: Array<[string, unknown]> = [
      ["data", []],
      ["loading", false],
      ["taiKhoanList", []],
      ["stats", { tongSo: 0, tongTien: 0 }],
      ["pagination", { total: 0, page: 1, limit: DEFAULT_PAGE_SIZE, totalPages: 0 }],
      ["searchText", ""],
      ["dateRange", null],
      ["filterDoiTuong", undefined],
      ["filterDuAn", undefined],
      ["filterBoPhan", undefined],
      ["filterTaiKhoanNo", undefined],
      ["filterTaiKhoanCo", undefined],
      ["activeTab", "list"],
      ["statsCollapsed", false],
    ];
    for (const [k, v] of defaults) {
      if (!this.hasState(k)) this.setState(k, v);
    }
  }
}
