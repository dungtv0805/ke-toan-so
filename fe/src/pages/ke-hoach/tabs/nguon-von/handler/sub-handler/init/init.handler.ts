import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { keHoachNguonVonService } from "@/services/keHoachNguonVonService";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { NguonVonEvents, NguonVonStates } from "../../nguon-von.handler";
import "./init.event";
import "./init.state";

@RegisterHandler("ke-hoach-nguon-von")
export class NguonVonInitHandler extends CSubHanlder<
  NguonVonEvents,
  NguonVonStates
> {
  @HandlerDecorator("init")
  async init(params: { nam: number; loaiKeHoach: LoaiKeHoach }): Promise<void> {
    this.khoiTaoMacDinh();
    this.setState("nam", params.nam);
    this.setState("loaiKeHoach", params.loaiKeHoach);
    // Đổi năm hoặc đổi loại là đổi hẳn bản kế hoạch — bỏ mọi thứ đang gõ dở.
    this.setState("nhap", {});
    this.setState("dongMoi", []);
    await this.napDong(params.nam, params.loaiKeHoach);
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    await this.napDong(
      this.getState("nam") as number,
      this.getState("loaiKeHoach") as LoaiKeHoach,
    );
  }

  @HandlerDecorator("doiHienSoDu")
  doiHienSoDu(): void {
    this.setState("hienSoDu", !this.getState("hienSoDu"));
  }

  private async napDong(nam: number, loaiKeHoach: LoaiKeHoach): Promise<void> {
    this.setState("loading", true);
    try {
      this.setState(
        "data",
        await keHoachNguonVonService.layTheoNam(nam, loaiKeHoach),
      );
    } catch (error) {
      console.error("Lỗi nạp kế hoạch nguồn vốn:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ["loaiKeHoach", "KE_HOACH"],
      ["data", []],
      ["loading", false],
      ["nhap", {}],
      ["dongMoi", []],
      ["saving", false],
      ["hienSoDu", true],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
  }
}
