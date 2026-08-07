import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { buildFilterParams, fetchAllEntries } from "../../lib/filteredEntries";
import { printNkcList } from "../../../print/nkcListPrint";
import "./print-list.event";
import "./print-list.state";
import { PrintListEvent } from "./print-list.event";
import { NhatKyChungStates } from "../../nhat-ky-chung.handler";

@RegisterHandler("nhat-ky-chung")
export class PrintListHandler extends CSubHanlder<
  PrintListEvent,
  NhatKyChungStates
> {
  /** In danh sách bút toán ĐANG LỌC (mọi trang), không chỉ trang hiện tại. */
  @HandlerDecorator("printList")
  async printList(params: { tenCongTy?: string }): Promise<void> {
    this.setState("printingList", true);
    try {
      const filter = buildFilterParams((k) => this.getState(k));
      const entries = await fetchAllEntries(filter);

      if (entries.length === 0) {
        message.warning("Không có dữ liệu để in");
        return;
      }

      printNkcList(entries, {
        tenCongTy: params?.tenCongTy,
        tuNgay: filter.startDate,
        denNgay: filter.endDate,
      });
    } catch (error) {
      console.error("Error printing entry list:", error);
      message.error("Không thể in danh sách. Vui lòng thử lại.");
    } finally {
      this.setState("printingList", false);
    }
  }
}
