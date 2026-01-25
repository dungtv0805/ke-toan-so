import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, GetEntriesParams } from "@/services/nhatKyChungService";
import "./filter-account.event";

const DEFAULT_PAGE_SIZE = 50;

@RegisterHandler("nhat-ky-chung")
export class FilterAccountHandler extends CSubHanlder {
  @HandlerDecorator("filterByAccount")
  async filterByAccount(params: { account: string | undefined }): Promise<void> {
    const { account } = params;
    this.setState("filterAccount", account);

    if (!account) {
      this.executeEvent("refresh", {});
      return;
    }

    const searchText = this.getState("searchText") || "";
    const dateRange = this.getState("dateRange");
    const pagination = this.getState("pagination") as { limit?: number } | undefined;
    const currentLimit = pagination?.limit || DEFAULT_PAGE_SIZE;

    // Use search with account code to leverage text index
    const queryParams: GetEntriesParams = {
      page: 1,
      limit: currentLimit,
      search: account, // Search by account code
    };

    if (searchText && searchText !== account) {
      // Combine with existing search text
      queryParams.search = `${account} ${searchText}`;
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      queryParams.startDate = dateRange[0].format("YYYY-MM-DD");
      queryParams.endDate = dateRange[1].format("YYYY-MM-DD");
    }

    this.setState("loading", true);
    try {
      const response = await nhatKyChungService.getEntries(queryParams);
      // Filter to ensure exact match on taiKhoanNo or taiKhoanCo
      const filteredData = response.data.filter(
        (item) => item.taiKhoanNo === account || item.taiKhoanCo === account
      );
      this.setState("data", filteredData);
      this.setState("pagination", {
        ...response.meta,
        total: filteredData.length,
        totalPages: Math.ceil(filteredData.length / currentLimit),
      });
    } catch (error) {
      console.error("Filter by account error:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
