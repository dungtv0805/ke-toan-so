import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, GetEntriesParams } from "@/services/nhatKyChungService";
import dayjs from "dayjs";
import "./filter-date.event";

const DEFAULT_PAGE_SIZE = 50;

@RegisterHandler("nhat-ky-chung")
export class FilterDateHandler extends CSubHanlder {
  @HandlerDecorator("filterByDate")
  async filterByDate(params: { dates: [dayjs.Dayjs, dayjs.Dayjs] | null }): Promise<void> {
    const { dates } = params;
    this.setState("dateRange", dates);

    const searchText = (this.getState("searchText") as string) || "";
    const currentLimit = (this.getState("pagination") as { limit: number } | undefined)?.limit || DEFAULT_PAGE_SIZE;
    const statsCollapsed = this.getState("statsCollapsed") as boolean;

    const queryParams: GetEntriesParams = {
      page: 1, // Reset to first page when filtering
      limit: currentLimit,
    };

    if (searchText) {
      queryParams.search = searchText;
    }

    if (dates && dates[0] && dates[1]) {
      queryParams.startDate = dates[0].format("YYYY-MM-DD");
      queryParams.endDate = dates[1].format("YYYY-MM-DD");
    }

    this.setState("loading", true);
    try {
      // Only load stats if panel is open
      if (statsCollapsed) {
        const entriesResponse = await nhatKyChungService.getEntries(queryParams);
        this.setState("data", entriesResponse.data);
        this.setState("pagination", entriesResponse.meta);
      } else {
        const [entriesResponse, statsResponse] = await Promise.all([
          nhatKyChungService.getEntries(queryParams),
          nhatKyChungService.getStats(queryParams),
        ]);
        this.setState("data", entriesResponse.data);
        this.setState("pagination", entriesResponse.meta);
        this.setState("stats", {
          tongButToan: statsResponse.tongSo,
          tongThu: statsResponse.tongPhatSinhNo,
          tongChi: statsResponse.tongPhatSinhCo,
          soDu: statsResponse.tongPhatSinhNo - statsResponse.tongPhatSinhCo,
        });
      }
    } catch (error) {
      console.error("Filter by date error:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
