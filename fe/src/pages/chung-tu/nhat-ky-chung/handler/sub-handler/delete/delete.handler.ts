import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { bangKeMuaVaoService, bangKeBanRaService } from "@/services/taxService";
import { message } from "antd";
import "./delete.event";
import type { DeleteEntryParams } from "./delete.event";
import { NhatKyChungStates, NhatKyChungEvents } from "../../../handler/nhat-ky-chung.handler";

@RegisterHandler("nhat-ky-chung")
export class DeleteHandler extends CSubHanlder<NhatKyChungEvents, NhatKyChungStates> {
  @HandlerDecorator("deleteEntry")
  async deleteEntry(params: DeleteEntryParams): Promise<void> {
    try {
      await nhatKyChungService.remove(params.id);
      message.success("Xóa bút toán thành công");

      // Hóa đơn đã kê khai KHÔNG được biến mất theo chứng từ — chỉ gỡ liên kết,
      // và chỉ khi bút toán cuối cùng của số phiếu này đã bị xóa.
      if (params.soPhieu) {
        try {
          const conLai = await nhatKyChungService.getBySoPhieu(params.soPhieu);
          if (conLai.length === 0) {
            const [mua, ban] = await Promise.all([
              bangKeMuaVaoService.layTheoSoChungTu([params.soPhieu]),
              bangKeBanRaService.layTheoSoChungTu([params.soPhieu]),
            ]);
            await Promise.all([
              ...(mua[params.soPhieu] || []).map((i) => bangKeMuaVaoService.goLienKet(i.id)),
              ...(ban[params.soPhieu] || []).map((i) => bangKeBanRaService.goLienKet(i.id)),
            ]);
          }
        } catch (e) {
          console.error("go lien ket hoa don that bai", e);
          message.warning(
            `Đã xóa bút toán nhưng chưa gỡ được liên kết hóa đơn của chứng từ ${params.soPhieu}. Vào Bảng kê gỡ tay.`,
          );
        }
      }

      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra khi xóa bút toán");
    }
  }
}
