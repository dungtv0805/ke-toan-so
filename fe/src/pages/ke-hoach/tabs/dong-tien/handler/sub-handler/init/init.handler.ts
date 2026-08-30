import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { keHoachDongTienService } from "@/services/keHoachDongTienService";
import { nhomDongTienService } from "@/services/nhomDongTienService";
import { dongTienService } from "@/services/dongTienService";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { DongTienEvents, DongTienStates } from "../../dong-tien.handler";
import "./init.event";
import "./init.state";

/** getAll() của vài danh mục chỉ trả 100 bản ghi → dùng getPaginated cho chắc. */
const DANH_MUC_LIMIT = 500;

@RegisterHandler("ke-hoach-dong-tien")
export class DongTienInitHandler extends CSubHanlder<
  DongTienEvents,
  DongTienStates
> {
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
    this.setState("tonDauNhap", null);
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
      const [dong, tonDau] = await Promise.all([
        keHoachDongTienService.layTheoNam(nam, loaiKeHoach),
        keHoachDongTienService.layTonDau(nam, loaiKeHoach),
      ]);
      this.setState("data", dong);
      this.setState("tonDauNam", tonDau);
    } catch (error) {
      console.error("Lỗi nạp kế hoạch dòng tiền:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  private async napDanhMuc(): Promise<void> {
    if (this.getState("masterDataLoaded")) return;
    try {
      const [nhom, dongTien] = await Promise.all([
        nhomDongTienService.getPaginated({ limit: DANH_MUC_LIMIT }),
        dongTienService.getPaginated({ limit: DANH_MUC_LIMIT }),
      ]);
      this.setState("nhomDongTienList", nhom.data);
      this.setState("dongTienList", dongTien.data);
      this.setState("masterDataLoaded", true);
    } catch (error) {
      console.error("Lỗi nạp danh mục dòng tiền:", error);
    }
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ["loaiKeHoach", "KE_HOACH"],
      ["data", []],
      ["loading", false],
      ["nhomDongTienList", []],
      ["dongTienList", []],
      ["masterDataLoaded", false],
      ["tonDauNam", 0],
      ["tonDauNhap", null],
      ["nhap", {}],
      ["dongMoi", []],
      ["saving", false],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
