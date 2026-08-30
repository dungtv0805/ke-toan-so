import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  keHoachNguonVonService,
  type KeHoachNguonVonDong,
  type NhomNguonVon,
} from "@/services/keHoachNguonVonService";
import { SO_THANG } from "@/services/keHoachBanHangService";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { NguonVonEvents, NguonVonStates } from "../../nguon-von.handler";
import { laKhacNhau, tamId, type DongNhap } from "../../../../lib/nhapBang";
import { valTuDong, type NguonVonVal } from "../init/init.state";
import "./row-edit.event";

const valRong = (nhom: NhomNguonVon = "NO_PHAI_TRA"): NguonVonVal => ({
  nhom,
  maChiTieu: "",
  tenChiTieu: "",
  ghiChu: "",
  soDuDauNam: 0,
  giaTriMucTieu: 0,
  thang: Array(SO_THANG).fill(0),
});

@RegisterHandler("ke-hoach-nguon-von")
export class NguonVonRowEditHandler extends CSubHanlder<
  NguonVonEvents,
  NguonVonStates
> {
  @HandlerDecorator("themDong")
  themDong(params: { nhom?: NhomNguonVon }): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<NguonVonVal>[];
    this.setState("dongMoi", [
      ...dongMoi,
      { id: tamId(), val: valRong(params.nhom) },
    ]);
  }

  @HandlerDecorator("suaO")
  suaO(params: { id: string; patch: Partial<NguonVonVal> }): void {
    this.capNhatVal(params.id, (cu) => ({ ...cu, ...params.patch }));
  }

  @HandlerDecorator("suaThang")
  suaThang(params: { id: string; chiSo: number; giaTri: number }): void {
    this.capNhatVal(params.id, (cu) => {
      const thang = [...cu.thang];
      thang[params.chiSo] = params.giaTri;
      return { ...cu, thang };
    });
  }

  @HandlerDecorator("boDong")
  async boDong(params: { id: string }): Promise<void> {
    const dongMoi = this.getState("dongMoi") as DongNhap<NguonVonVal>[];
    if (dongMoi.some((d) => d.id === params.id)) {
      this.setState(
        "dongMoi",
        dongMoi.filter((d) => d.id !== params.id),
      );
      return;
    }

    try {
      await keHoachNguonVonService.xoa(params.id);
      const nhap = { ...(this.getState("nhap") as Record<string, NguonVonVal>) };
      delete nhap[params.id];
      this.setState("nhap", nhap);
      message.success("Đã xoá dòng kế hoạch");
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Xoá dòng kế hoạch thất bại"));
    }
  }

  @HandlerDecorator("huyThayDoi")
  huyThayDoi(): void {
    this.setState("nhap", {});
    this.setState("dongMoi", []);
  }

  @HandlerDecorator("luuTatCa")
  async luuTatCa(): Promise<void> {
    const data = this.getState("data") as KeHoachNguonVonDong[];
    const nhap = this.getState("nhap") as Record<string, NguonVonVal>;
    const dongMoi = this.getState("dongMoi") as DongNhap<NguonVonVal>[];

    const thieu = dongMoi.filter((d) => !d.val.maChiTieu.trim());
    if (thieu.length > 0) {
      message.warning(`Còn ${thieu.length} dòng mới chưa nhập mã chỉ tiêu`);
      return;
    }

    const them = dongMoi.map((d) => this.dungPayload(d.val));
    const sua = data
      .filter((d) => nhap[d.id] && laKhacNhau(nhap[d.id], valTuDong(d)))
      .map((d) => ({ id: d.id, ...this.dungPayload(nhap[d.id]) }));

    if (them.length === 0 && sua.length === 0) {
      message.info("Không có thay đổi nào để lưu");
      return;
    }

    this.setState("saving", true);
    try {
      const kq = await keHoachNguonVonService.luuHangLoat({
        nam: this.getState("nam") as number,
        loaiKeHoach: this.getState("loaiKeHoach") as LoaiKeHoach,
        them: them as never,
        sua: sua as never,
      });
      message.success(`Đã lưu ${kq.daThem} dòng mới, ${kq.daSua} dòng sửa`);
      this.setState("nhap", {});
      this.setState("dongMoi", []);
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Lưu kế hoạch nguồn vốn thất bại"));
    } finally {
      this.setState("saving", false);
    }
  }

  private capNhatVal(id: string, doi: (cu: NguonVonVal) => NguonVonVal): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<NguonVonVal>[];
    const viTri = dongMoi.findIndex((d) => d.id === id);
    if (viTri >= 0) {
      const banSao = [...dongMoi];
      banSao[viTri] = { id, val: doi(dongMoi[viTri].val) };
      this.setState("dongMoi", banSao);
      return;
    }

    const nhap = this.getState("nhap") as Record<string, NguonVonVal>;
    const goc = (this.getState("data") as KeHoachNguonVonDong[]).find(
      (d) => d.id === id,
    );
    if (!goc) return;
    const cu = nhap[id] ?? valTuDong(goc);
    this.setState("nhap", { ...nhap, [id]: doi(cu) });
  }

  private dungPayload(val: NguonVonVal) {
    return {
      nhom: val.nhom,
      maChiTieu: val.maChiTieu.trim(),
      tenChiTieu: val.tenChiTieu.trim() || undefined,
      ghiChu: val.ghiChu,
      soDuDauNam: val.soDuDauNam,
      giaTriMucTieu: val.giaTriMucTieu,
      thang: val.thang,
    };
  }

  private loiCuaApi(error: unknown, macDinh: string): string {
    const thongBao = (error as { message?: string })?.message;
    return thongBao || macDinh;
  }
}
