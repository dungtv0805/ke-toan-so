import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { kqkd3LopService } from "@/services/kqkd3LopService";
import type { Pnl3LopEvents, Pnl3LopStates } from "../../pnl-3-lop.handler";
import type { Ky } from "../../../lib/pnl3LopRows";
import "./init.event";
import "./init.state";

@RegisterHandler("ke-hoach-pnl-3-lop")
export class Pnl3LopInitHandler extends CSubHanlder<
  Pnl3LopEvents,
  Pnl3LopStates
> {
  @HandlerDecorator("init")
  async init(params: { nam: number; phienBan?: string }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState("nam", params.nam);
    this.setState("loading", true);
    try {
      this.setState(
        "baoCao",
        await kqkd3LopService.layBaoCao(params.nam, params.phienBan),
      );
    } catch (error) {
      console.error("Lỗi nạp P&L 3 lớp:", error);
      this.setState("baoCao", null);
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("doiKy")
  doiKy(params: { ky: Ky }): void {
    // Đổi kỳ chỉ đổi cách cắt 12 số đã có — không gọi lại API.
    this.setState("ky", params.ky);
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ["baoCao", null],
      ["loading", false],
      ["ky", "NAM"],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
