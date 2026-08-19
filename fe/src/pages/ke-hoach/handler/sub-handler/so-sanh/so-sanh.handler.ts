import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  keHoachService,
  type ChiTieu,
  type KeHoachDimension,
} from "@/services/keHoachService";
import type { KeHoachEvents, KeHoachStates } from "../../ke-hoach.handler";
import { buildFilters } from "../../../lib/keHoachFilters";
import "./so-sanh.event";

@RegisterHandler("ke-hoach")
export class KeHoachSoSanhHandler extends CSubHanlder<KeHoachEvents, KeHoachStates> {
  @HandlerDecorator("doiView")
  async doiView(params: { view: "list" | KeHoachDimension }): Promise<void> {
    this.setState("view", params.view);
    if (params.view !== "list") await this.executeEvent("loadSoSanh", {});
  }

  @HandlerDecorator("doiChiTieu")
  async doiChiTieu(params: { chiTieu: ChiTieu }): Promise<void> {
    this.setState("chiTieu", params.chiTieu);
    if (this.getState("view") !== "list") await this.executeEvent("loadSoSanh", {});
  }

  @HandlerDecorator("loadSoSanh")
  async loadSoSanh(): Promise<void> {
    const view = this.getState("view") as "list" | KeHoachDimension;
    if (view === "list") return;

    this.setState("soSanhLoading", true);
    try {
      const data = await keHoachService.getSoSanh(
        view,
        (this.getState("chiTieu") as ChiTieu) || "tong",
        buildFilters((key) => this.getState(key)),
      );
      this.setState("soSanh", data);
    } catch (error) {
      console.error("Lỗi nạp báo cáo so sánh:", error);
      this.setState("soSanh", null);
    } finally {
      this.setState("soSanhLoading", false);
    }
  }
}
