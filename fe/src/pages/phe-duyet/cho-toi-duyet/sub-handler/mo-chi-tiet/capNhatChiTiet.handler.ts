import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import type { QuyTrinhPheDuyet } from "@/services/pheDuyetService";
import "./capNhatChiTiet.event";

/**
 * Cập nhật quy trình đang mở sau khi hồ sơ đính kèm thay đổi (mục 8).
 *
 * Nhận thẳng bản BE vừa trả về thay vì gọi lại `moChiTiet`: đỡ một vòng mạng,
 * và không làm ngăn kéo nhấp nháy về trạng thái đang tải.
 */
@RegisterHandler("cho-toi-duyet-context")
export class CapNhatChiTietHandler extends CSubHanlder {
  @HandlerDecorator("capNhatChiTiet")
  async capNhatChiTiet(params: { quyTrinh: QuyTrinhPheDuyet }): Promise<void> {
    this.setState("chiTiet", params.quyTrinh);
  }
}
