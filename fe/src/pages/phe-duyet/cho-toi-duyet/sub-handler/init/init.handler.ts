import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { pheDuyetService } from "@/services/pheDuyetService";
import "./init.event";

@RegisterHandler("cho-toi-duyet-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    // Đặt mọi state về mặc định TRƯỚC khi gọi mạng: useChandlerState chỉ nghe
    // từ lúc component đăng ký, nên state chưa bao giờ được set sẽ ra undefined
    // và bảng đọc `.length` của undefined.
    this.setState("danhSach", []);
    this.setState("dangMoId", null);
    this.setState("chiTiet", null);
    this.setState("lichSu", []);
    this.setState("dangTaiChiTiet", false);
    this.setState("dangXuLy", false);

    // Phải qua executeEvent: @HandlerDecorator bọc method lại và bỏ qua lời gọi
    // không kèm uniqId, nên gọi thẳng `this.taiLaiDanhSach()` sẽ im lặng không
    // chạy gì cả — bảng hiện rỗng mà không có lỗi nào.
    await this.executeEvent("taiLaiDanhSach", {});
  }

  @HandlerDecorator("taiLaiDanhSach")
  async taiLaiDanhSach(): Promise<void> {
    this.setState("dangTai", true);
    try {
      const ds = await pheDuyetService.choToiDuyet();
      this.setState("danhSach", ds ?? []);
    } catch (e) {
      console.error("Không tải được danh sách chờ duyệt:", e);
      this.setState("danhSach", []);
    } finally {
      this.setState("dangTai", false);
    }
  }
}
