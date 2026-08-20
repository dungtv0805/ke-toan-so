import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { keHoachNhanSuService } from "@/services/keHoachNhanSuService";
import { boPhanService } from "@/services/boPhanService";
import type { NhanSuEvents, NhanSuStates } from "../../nhan-su.handler";
import "./init.event";
import "./init.state";

/** getAll() của vài danh mục chỉ trả 100 bản ghi → dùng getPaginated cho chắc. */
const DANH_MUC_LIMIT = 500;

@RegisterHandler("ke-hoach-nhan-su")
export class NhanSuInitHandler extends CSubHanlder<NhanSuEvents, NhanSuStates> {
  @HandlerDecorator("init")
  async init(params: { nam: number }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState("nam", params.nam);
    // Đổi năm là đổi hẳn bản kế hoạch — bỏ dở dòng đang sửa.
    this.setState("editingKey", null);
    this.setState("formValues", null);
    await Promise.all([this.napDong(params.nam), this.napDanhMuc()]);
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    await this.napDong(this.getState("nam") as number);
  }

  private async napDong(nam: number): Promise<void> {
    this.setState("loading", true);
    try {
      this.setState("data", await keHoachNhanSuService.layTheoNam(nam));
    } catch (error) {
      console.error("Lỗi nạp kế hoạch nhân sự:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  private async napDanhMuc(): Promise<void> {
    if (this.getState("masterDataLoaded")) return;
    try {
      const boPhan = await boPhanService.getPaginated({ limit: DANH_MUC_LIMIT });
      this.setState("boPhanList", boPhan.data);
      this.setState("masterDataLoaded", true);
    } catch (error) {
      console.error("Lỗi nạp danh mục bộ phận:", error);
    }
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ["data", []],
      ["loading", false],
      ["boPhanList", []],
      ["masterDataLoaded", false],
      ["editingKey", null],
      ["formValues", null],
      ["saving", false],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
