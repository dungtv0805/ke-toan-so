import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nguoiDungService, NguoiDungStats } from "@/services/nguoiDungService";
import { message } from "antd";
import { PaginationParams } from "./fetchData.event";
import "./fetchData.event";

@RegisterHandler("phan-quyen-context")
export class FetchDataHandler extends CSubHanlder {
  @HandlerDecorator("fetchData")
  async fetchData(params: PaginationParams): Promise<void> {
    this.setState("loading", true);

    try {
      const result = await nguoiDungService.getAll(params);

      this.setState("nguoiDungList", result.data);
      this.setState("pagination", {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (error) {
      message.error("Lỗi khi tải dữ liệu người dùng");
      console.error(error);
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("fetchStats")
  async fetchStats(): Promise<NguoiDungStats> {
    try {
      const stats = await nguoiDungService.getStats();
      this.setState("stats", stats);
      return stats;
    } catch (error) {
      message.error("Lỗi khi tải thống kê");
      console.error(error);
      throw error;
    }
  }
}
