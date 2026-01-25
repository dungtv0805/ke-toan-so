import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, GetEntriesParams } from "@/services/nhatKyChungService";
import "./search.event";

const DEFAULT_PAGE_SIZE = 50;

@RegisterHandler("nhat-ky-chung")
export class SearchHandler extends CSubHanlder {
  @HandlerDecorator("search")
  async search(params: { text: string }): Promise<void> {
    const { text } = params;
    this.setState("searchText", text);

    const dateRange = this.getState("dateRange");
    const currentLimit = (this.getState("pagination") as { limit: number } | undefined)?.limit || DEFAULT_PAGE_SIZE;
    const statsCollapsed = this.getState("statsCollapsed") as boolean;

    const queryParams: GetEntriesParams = {
      page: 1, // Reset to first page when searching
      limit: currentLimit,
    };

    if (text.trim()) {
      queryParams.search = text;
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      queryParams.startDate = dateRange[0].format("YYYY-MM-DD");
      queryParams.endDate = dateRange[1].format("YYYY-MM-DD");
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
      console.error("Search error:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
