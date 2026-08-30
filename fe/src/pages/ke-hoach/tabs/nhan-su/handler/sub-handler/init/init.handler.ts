import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { keHoachNhanSuService } from "@/services/keHoachNhanSuService";
import { boPhanService } from "@/services/boPhanService";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { NhanSuEvents, NhanSuStates } from "../../nhan-su.handler";
import "./init.event";
import "./init.state";

/** getAll() của vài danh mục chỉ trả 100 bản ghi → dùng getPaginated cho chắc. */
const DANH_MUC_LIMIT = 500;

@RegisterHandler("ke-hoach-nhan-su")
export class NhanSuInitHandler extends CSubHanlder<NhanSuEvents, NhanSuStates> {
  @HandlerDecorator("init")
  async init(params: {
    nam: number;
    loaiKeHoach: LoaiKeHoach;
  }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState("nam", params.nam);
    this.setState("loaiKeHoach", params.loaiKeHoach);
    // Đổi năm hoặc đổi loại là đổi hẳn bản kế hoạch — bỏ mọi thứ đang gõ dở.
    this.setState("nhap", {});
    this.setState("dongMoi", []);
    await Promise.all([
      this.napDong(params.nam, params.loaiKeHoach),
      this.napDanhMuc(),
    ]);
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    await this.napDong(
      this.getState("nam") as number,
      this.getState("loaiKeHoach") as LoaiKeHoach,
    );
  }

  private async napDong(
    nam: number,
    loaiKeHoach: LoaiKeHoach,
  ): Promise<void> {
    this.setState("loading", true);
    try {
      this.setState("data", await keHoachNhanSuService.layTheoNam(nam, loaiKeHoach));
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
      ["loaiKeHoach", "KE_HOACH"],
      ["data", []],
      ["loading", false],
      ["boPhanList", []],
      ["masterDataLoaded", false],
      ["nhap", {}],
      ["dongMoi", []],
      ["saving", false],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
