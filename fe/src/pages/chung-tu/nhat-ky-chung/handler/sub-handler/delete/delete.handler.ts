import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { message } from "antd";
import "./delete.event";
import type { DeleteEntryParams } from "./delete.event";
import { NhatKyChungStates, NhatKyChungEvents } from "../../../handler/nhat-ky-chung.handler";
import { goLienKetChoCacSoPhieu, loiGoLienKetMessage } from "../../goLienKetHoaDon";

@RegisterHandler("nhat-ky-chung")
export class DeleteHandler extends CSubHanlder<NhatKyChungEvents, NhatKyChungStates> {
  @HandlerDecorator("deleteEntry")
  async deleteEntry(params: DeleteEntryParams): Promise<void> {
    try {
      await nhatKyChungService.remove(params.id);
      message.success("Xóa bút toán thành công");

      // Hóa đơn đã kê khai KHÔNG được biến mất theo chứng từ — chỉ gỡ liên kết,
      // và chỉ khi bút toán cuối cùng của số phiếu này đã bị xóa.
      const hong = await goLienKetChoCacSoPhieu([params.soPhieu]);
      const canhBao = loiGoLienKetMessage(hong);
      if (canhBao) message.warning(canhBao);

      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra khi xóa bút toán");
    }
  }
}
