import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { message } from "antd";
import "./delete-batch.event";
import "./delete-batch.state";
import type { DeleteBatchParams } from "./delete-batch.event";
import {
  NhatKyChungStates,
  NhatKyChungEvents,
} from "../../nhat-ky-chung.handler";
import { goLienKetChoCacSoPhieu, loiGoLienKetMessage } from "../../goLienKetHoaDon";

@RegisterHandler("nhat-ky-chung")
export class DeleteBatchHandler extends CSubHanlder<
  NhatKyChungEvents,
  NhatKyChungStates
> {
  @HandlerDecorator("deleteBatch")
  async deleteBatch(params: DeleteBatchParams): Promise<void> {
    if (!params.ids || params.ids.length === 0) return;

    this.setState("deletingBatch", true);
    try {
      const res = await nhatKyChungService.removeBatch(params.ids);
      const skippedMsg =
        res.skipped > 0 ? `, bỏ qua ${res.skipped} bút toán đã duyệt` : "";
      message.success(`Đã xóa ${res.deleted} bút toán${skippedMsg}`);
      this.setState("selectedEntryIds", []);

      // Xóa nhóm là thao tác thường hơn xóa từng dòng: bỏ bước gỡ ở đây thì phần
      // lớn chứng từ bị xóa để lại liên kết treo. Hóa đơn KHÔNG bị xóa theo chứng
      // từ — chỉ gỡ, và chỉ với số phiếu đã hết sạch bút toán (bút toán đã duyệt
      // bị bỏ qua nên số phiếu đó vẫn còn dòng, hàm dùng chung tự kiểm).
      const hong = await goLienKetChoCacSoPhieu(params.soPhieuList || []);
      const canhBao = loiGoLienKetMessage(hong);
      if (canhBao) message.warning(canhBao);

      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra khi xóa hàng loạt");
    } finally {
      this.setState("deletingBatch", false);
    }
  }
}
