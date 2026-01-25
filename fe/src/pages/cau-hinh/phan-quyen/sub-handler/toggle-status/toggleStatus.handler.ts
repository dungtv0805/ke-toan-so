import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nguoiDungService } from "@/services/nguoiDungService";
import { NguoiDung } from "@/types";
import { message } from "antd";
import "./toggleStatus.event";

@RegisterHandler("phan-quyen-context")
export class ToggleStatusHandler extends CSubHanlder {
  @HandlerDecorator("toggleStatus")
  async toggleStatus(params: { id: string }): Promise<NguoiDung> {
    try {
      const result = await nguoiDungService.toggleTrangThai(params.id);
      message.success("Cập nhật trạng thái thành công!");

      // Refresh data
      const pagination = this.getState("pagination") as { page: number; limit: number };
      await this.executeEvent("fetchData", { page: pagination?.page || 1, limit: pagination?.limit || 10 });
      await this.executeEvent("fetchStats", {});

      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi cập nhật trạng thái";
      message.error(errorMessage);
      throw error;
    }
  }
}
