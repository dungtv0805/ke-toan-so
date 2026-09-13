import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  kqkdKeHoachService,
  type NguonKqkd,
} from "@/services/kqkdKeHoachService";
import { dungBangKqkd } from "../../../lib/kqkdKeHoachRows";
import type { KqkdEvents, KqkdStates } from "../../kqkd.handler";
import "./init.event";
import "./init.state";

@RegisterHandler("ke-hoach-kqkd")
export class KqkdInitHandler extends CSubHanlder<KqkdEvents, KqkdStates> {
  @HandlerDecorator("init")
  async init(params: {
    nam: number;
    loaiKeHoach: NguonKqkd;
    phienBan?: string;
  }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState("nam", params.nam);
    this.setState("loaiKeHoach", params.loaiKeHoach);
    this.setState("loading", true);
    try {
      const baoCao = await kqkdKeHoachService.layBaoCao(
        params.nam,
        params.loaiKeHoach,
        params.phienBan,
      );
      this.setState("hang", dungBangKqkd(baoCao));
      // Bảng cần cả báo cáo gốc: cột "%DS" chia cho doanh thu thuần của CHÍNH
      // KỲ đang xem, mà dãy đó nằm ở báo cáo chứ không ở từng dòng.
      this.setState("baoCao", baoCao);
    } catch (error) {
      console.error("Lỗi nạp KQKD kế hoạch:", error);
      this.setState("hang", []);
      this.setState("baoCao", null);
    } finally {
      this.setState("loading", false);
    }
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ["loaiKeHoach", "KE_HOACH"],
      ["hang", []],
      ["baoCao", null],
      ["loading", false],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
