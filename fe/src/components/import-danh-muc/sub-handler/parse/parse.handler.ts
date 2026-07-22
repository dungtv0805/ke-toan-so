import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import * as XLSX from "xlsx";
import { message } from "antd";
import "./parse.event";
import { ImportDanhMucEvents } from "../../import.handler";
import { ImportDanhMucStates } from "../../import.state";
import { aoaToRawRows, findMissingHeaders } from "../../lib/parseRows";
import { validateAndBuild, RefData } from "../../lib/validate";
import type { ImportDanhMucConfig, RefItem } from "../../types";

@RegisterHandler("import-danh-muc")
export class ParseHandler extends CSubHanlder<
  ImportDanhMucEvents,
  ImportDanhMucStates
> {
  @HandlerDecorator("parseFile")
  async parseFile(params: { file: File }): Promise<void> {
    const config = this.getState("config") as ImportDanhMucConfig | null;
    if (!config) {
      message.error("Chưa sẵn sàng, vui lòng đóng và mở lại cửa sổ import");
      return;
    }

    this.setState("parsing", true);
    try {
      const buffer = await params.file.arrayBuffer();
      // Không dùng cellDates: ô ngày về dạng serial để validate tự quy đổi.
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: true,
        defval: "",
      }) as unknown[][];

      const missing = findMissingHeaders(aoa, config.columns);
      if (missing.length > 0) {
        message.error(`File thiếu cột: ${missing.join(", ")}`);
        return;
      }

      const rows = aoaToRawRows(aoa, config.columns);
      if (rows.length === 0) {
        message.warning("File không có dòng dữ liệu");
      }

      const existing = (this.getState("existing") as RefItem[]) ?? [];
      const refData = (this.getState("refData") as RefData) ?? {};
      const { results, validItems, hasErrors } = validateAndBuild(
        rows,
        config,
        existing,
        refData,
      );

      this.setState("fileName", params.file.name);
      this.setState("results", results);
      this.setState("validItems", validItems);
      this.setState("hasErrors", hasErrors);
      this.setState("parsed", true);
    } catch (e) {
      console.error("Lỗi đọc file Excel:", e);
      message.error("Không đọc được file Excel. Kiểm tra lại định dạng.");
    } finally {
      this.setState("parsing", false);
    }
  }

  @HandlerDecorator("resetImport")
  async resetImport(): Promise<void> {
    this.setState("fileName", "");
    this.setState("results", []);
    this.setState("validItems", []);
    this.setState("hasErrors", false);
    this.setState("parsed", false);
  }
}
