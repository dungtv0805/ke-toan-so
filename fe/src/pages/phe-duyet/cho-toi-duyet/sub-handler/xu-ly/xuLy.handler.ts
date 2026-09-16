import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { pheDuyetService } from "@/services/pheDuyetService";
import "./xuLy.event";

const NHAN: Record<string, string> = {
  DUYET: "Đã duyệt",
  TRA_LAI: "Đã trả lại cho người lập",
  TU_CHOI: "Đã từ chối",
};

/** Ba nút của mục 7: DUYỆT — YÊU CẦU BỔ SUNG/TRẢ LẠI — TỪ CHỐI. */
@RegisterHandler("cho-toi-duyet-context")
export class XuLyHandler extends CSubHanlder {
  @HandlerDecorator("xuLyPheDuyet")
  async xuLyPheDuyet(params: {
    id: string;
    hanhDong: "DUYET" | "TRA_LAI" | "TU_CHOI";
    yKien?: string;
  }): Promise<boolean> {
    this.setState("dangXuLy", true);
    try {
      if (params.hanhDong === "DUYET") {
        await pheDuyetService.duyet(params.id, params.yKien);
      } else if (params.hanhDong === "TRA_LAI") {
        await pheDuyetService.traLai(params.id, params.yKien ?? "");
      } else {
        await pheDuyetService.tuChoi(params.id, params.yKien ?? "");
      }

      message.success(NHAN[params.hanhDong]);

      // Nghiệp vụ vừa xử lý không còn đến lượt mình nữa — phải tải lại danh
      // sách, nếu không nó vẫn nằm đó và bấm lần hai sẽ báo "chưa đến lượt".
      await this.executeEvent("dongChiTiet", {});
      await this.executeEvent("taiLaiDanhSach", {});
      return true;
    } catch (e) {
      // Lỗi nghiệp vụ từ BE (chưa đến lượt, thiếu lý do...) phải hiện nguyên
      // văn cho người dùng, đừng nuốt thành "có lỗi xảy ra".
      message.error(
        e instanceof Error ? e.message : "Không thực hiện được thao tác",
      );
      return false;
    } finally {
      this.setState("dangXuLy", false);
    }
  }
}
