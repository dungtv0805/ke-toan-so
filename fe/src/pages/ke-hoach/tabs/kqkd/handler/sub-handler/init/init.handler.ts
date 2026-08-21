import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { kqkdKeHoachService } from "@/services/kqkdKeHoachService";
import { dungBangKqkd } from "../../../lib/kqkdKeHoachRows";
import type { KqkdEvents, KqkdStates } from "../../kqkd.handler";
import "./init.event";
import "./init.state";

@RegisterHandler("ke-hoach-kqkd")
export class KqkdInitHandler extends CSubHanlder<KqkdEvents, KqkdStates> {
  @HandlerDecorator("init")
  async init(params: { nam: number; phienBan?: string }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState("nam", params.nam);
    this.setState("loading", true);
    try {
      const baoCao = await kqkdKeHoachService.layBaoCao(
        params.nam,
        params.phienBan,
      );
      this.setState("hang", dungBangKqkd(baoCao));
    } catch (error) {
      console.error("Lỗi nạp KQKD kế hoạch:", error);
      this.setState("hang", []);
    } finally {
      this.setState("loading", false);
    }
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ["hang", []],
      ["loading", false],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
