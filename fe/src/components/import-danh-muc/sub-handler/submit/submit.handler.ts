import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import "./submit.event";
import { ImportDanhMucEvents } from "../../import.handler";
import { ImportDanhMucStates } from "../../import.state";
import { importDanhMucService } from "@/services/importDanhMucService";
import { mapFailuresToRows } from "../../lib/mapFailures";
import type { ImportDanhMucConfig, RowValidationResult } from "../../types";

@RegisterHandler("import-danh-muc")
export class SubmitImportHandler extends CSubHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  @HandlerDecorator("submitImport")
  async submitImport(params: { onSuccess?: () => void }): Promise<void> {
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

      if (res.failed.length > 0) {
        // Đổ lỗi từ BE vào đúng dòng trong bảng preview, giữ modal để người dùng xem.
        // BE trả index trong mảng items đã gửi, không phải rowNumber — quy đổi trước khi khớp.
        const byRow = mapFailuresToRows(results, res.failed);
        this.setState(
          "results",
          results.map((r) =>
            byRow.has(r.rowNumber)
              ? {
                  ...r,
                  errors: [byRow.get(r.rowNumber) as string],
                  payload: null,
                }
              : r,
          ),
        );
        this.setState("hasErrors", true);
        message.warning(
          `Đã import ${res.created}/${items.length} bản ghi, ${res.failed.length} dòng lỗi`,
        );
        params.onSuccess?.();
        return;
      }

      message.success(`Đã import ${res.created} ${config.title.toLowerCase()}`);
      this.setState("parsed", false);
      this.setState("results", []);
      this.setState("validItems", []);
      this.setState("fileName", "");
      params.onSuccess?.();
    } catch (e) {
      const err = e as { message?: string };
      message.error(err.message || "Import thất bại");
    } finally {
      this.setState("submitting", false);
    }
  }
}
