import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import "./submit.event";
import { ImportDanhMucEvents } from "../../import.handler";
import { ImportDanhMucStates } from "../../import.state";
import { importDanhMucService } from "@/services/importDanhMucService";
import { resolveImportOutcome } from "../../lib/importOutcome";
import type { ImportDanhMucConfig, RowValidationResult } from "../../types";
import type { SubmitImportEvent } from "./submit.event";

@RegisterHandler("import-danh-muc")
export class SubmitImportHandler extends CSubHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  @HandlerDecorator("submitImport")
  async submitImport(
    params: SubmitImportEvent["submitImport"]["params"],
  ): Promise<void> {
    const config = this.getState("config") as ImportDanhMucConfig | null;
    const hasErrors = this.getState("hasErrors") as boolean;
    const items =
      (this.getState("validItems") as Record<string, unknown>[]) || [];
    const results =
      (this.getState("results") as RowValidationResult[]) || [];

    if (!config) return;
    if (hasErrors) {
      message.error("Còn dòng lỗi, vui lòng sửa file trước khi import");
      return;
    }
    if (items.length === 0) {
      message.warning("Không có dòng hợp lệ để import");
      return;
    }

    this.setState("submitting", true);
    try {
      const res = await importDanhMucService.importItems(config, items);

      // Đã tạo được bản ghi mới trong lần import này — `existing`/`refData` mà loadRefs
      // nạp lúc mở modal giờ đã cũ. Nạp lại để nếu người dùng sửa các dòng lỗi rồi
      // upload lại file trong cùng phiên modal, việc dò trùng thấy đúng dữ liệu mới nhất
      // (không tạo trùng các dòng vừa import thành công).
      if (res.created > 0) {
        await this.executeEvent("loadRefs", { config });
      }

      // Tách quyết định kết quả ra hàm thuần (dễ test) — handler chỉ lo cập nhật state
      // và gọi đúng callback theo từng nhánh.
      const outcome = resolveImportOutcome(results, res);

      if (outcome.kind === "partial") {
        // Đổ lỗi từ BE vào đúng dòng trong bảng preview, giữ modal để người dùng xem.
        this.setState("results", outcome.results);
        this.setState("hasErrors", true);
        message.warning(
          `Đã import ${outcome.created}/${items.length} bản ghi, ${outcome.failedCount} dòng lỗi`,
        );
        // Đã có bản ghi được tạo (nếu outcome.created > 0) — trang cha vẫn phải nạp lại,
        // nhưng KHÔNG gọi onSuccess vì modal phải ở lại cho người dùng sửa các dòng lỗi.
        params.onImported?.();
        return;
      }

      message.success(
        `Đã import ${outcome.created} ${config.title.toLowerCase()}`,
      );
      this.setState("parsed", false);
      this.setState("results", []);
      this.setState("validItems", []);
      this.setState("fileName", "");
      // Thành công toàn phần: trang cha nạp lại VÀ modal phải đóng.
      params.onImported?.();
      params.onSuccess?.();
    } catch (e) {
      const err = e as { message?: string };
      message.error(err.message || "Import thất bại");
    } finally {
      this.setState("submitting", false);
    }
  }
}
