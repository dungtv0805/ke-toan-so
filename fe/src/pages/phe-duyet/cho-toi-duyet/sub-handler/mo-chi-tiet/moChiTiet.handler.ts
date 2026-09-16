import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { pheDuyetService } from "@/services/pheDuyetService";
import "./moChiTiet.event";

/** Màn chi tiết phê duyệt — mục 7. */
@RegisterHandler("cho-toi-duyet-context")
export class MoChiTietHandler extends CSubHanlder {
  @HandlerDecorator("moChiTiet")
  async moChiTiet(params: { id: string }): Promise<void> {
    this.setState("dangMoId", params.id);
    this.setState("dangTaiChiTiet", true);
    this.setState("chiTiet", null);
    this.setState("lichSu", []);

    try {
      const res = await pheDuyetService.chiTiet(params.id);
      this.setState("chiTiet", res?.quyTrinh ?? null);
      this.setState("lichSu", res?.lichSu ?? []);
    } catch (e) {
      console.error("Không tải được chi tiết phê duyệt:", e);
    } finally {
      this.setState("dangTaiChiTiet", false);
    }
  }

  @HandlerDecorator("dongChiTiet")
  async dongChiTiet(): Promise<void> {
    this.setState("dangMoId", null);
    this.setState("chiTiet", null);
    this.setState("lichSu", []);
  }
}
