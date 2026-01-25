import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nguoiDungService } from "@/services/nguoiDungService";
import { NguoiDung } from "@/types";
import { message } from "antd";
import "./crud.event";

@RegisterHandler("phan-quyen-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("createNguoiDung")
  async createNguoiDung(data: Omit<NguoiDung, "id">): Promise<NguoiDung> {
    try {
      const result = await nguoiDungService.create(data);
      message.success("Thêm người dùng thành công!");

      // Refresh data
      const pagination = this.getState("pagination") as { page: number; limit: number };
      await this.executeEvent("fetchData", { page: pagination?.page || 1, limit: pagination?.limit || 10 });
      await this.executeEvent("fetchStats", {});

      this.setState("modalVisible", false);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi thêm người dùng";
      message.error(errorMessage);
      throw error;
    }
  }

  @HandlerDecorator("updateNguoiDung")
  async updateNguoiDung(params: { id: string; data: Partial<NguoiDung> }): Promise<NguoiDung> {
    try {
      const result = await nguoiDungService.update(params.id, params.data);
      message.success("Cập nhật người dùng thành công!");

      // Refresh data
      const pagination = this.getState("pagination") as { page: number; limit: number };
      await this.executeEvent("fetchData", { page: pagination?.page || 1, limit: pagination?.limit || 10 });
      await this.executeEvent("fetchStats", {});

      this.setState("modalVisible", false);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi cập nhật người dùng";
      message.error(errorMessage);
      throw error;
    }
  }

  @HandlerDecorator("deleteNguoiDung")
  async deleteNguoiDung(params: { id: string }): Promise<void> {
    try {
      await nguoiDungService.deleteUser(params.id);
      message.success("Xóa người dùng thành công!");

      // Refresh data
      const pagination = this.getState("pagination") as { page: number; limit: number };
      await this.executeEvent("fetchData", { page: pagination?.page || 1, limit: pagination?.limit || 10 });
      await this.executeEvent("fetchStats", {});
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Lỗi khi xóa người dùng";
      message.error(errorMessage);
      throw error;
    }
  }

  @HandlerDecorator("openModal")
  async openModal(params: { record?: NguoiDung }): Promise<void> {
    this.setState("editingRecord", params.record || null);
    this.setState("modalVisible", true);
  }

  @HandlerDecorator("closeModal")
  async closeModal(): Promise<void> {
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);
  }
}
