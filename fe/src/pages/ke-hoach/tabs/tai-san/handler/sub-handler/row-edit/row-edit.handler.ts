import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  keHoachTaiSanService,
  type KeHoachTaiSanDong,
} from "@/services/keHoachTaiSanService";
import { SO_THANG } from "@/services/keHoachBanHangService";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { BoPhan } from "@/types";
import type { TaiSanEvents, TaiSanStates } from "../../tai-san.handler";
import { laKhacNhau, tamId, type DongNhap } from "../../../../lib/nhapBang";
import { valTuDong, type TaiSanVal } from "../init/init.state";
import "./row-edit.event";

const valRong = (boPhanId = ""): TaiSanVal => ({
  boPhanId,
  maTaiSan: "",
  tenTaiSan: "",
  ghiChu: "",
  soLuong: 0,
  giaBinhQuan: 0,
  thang: Array(SO_THANG).fill(0),
});

@RegisterHandler("ke-hoach-tai-san")
export class TaiSanRowEditHandler extends CSubHanlder<
  TaiSanEvents,
  TaiSanStates
> {
  @HandlerDecorator("themDong")
  themDong(params: { boPhanId?: string }): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<TaiSanVal>[];
    this.setState("dongMoi", [
      ...dongMoi,
      { id: tamId(), val: valRong(params.boPhanId ?? "") },
    ]);
  }

  @HandlerDecorator("suaO")
  suaO(params: { id: string; patch: Partial<TaiSanVal> }): void {
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
    const dongMoi = this.getState("dongMoi") as DongNhap<TaiSanVal>[];
    if (dongMoi.some((d) => d.id === params.id)) {
      this.setState(
        "dongMoi",
        dongMoi.filter((d) => d.id !== params.id),
      );
      return;
    }

    try {
      await keHoachTaiSanService.xoa(params.id);
      const nhap = { ...(this.getState("nhap") as Record<string, TaiSanVal>) };
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
    const data = this.getState("data") as KeHoachTaiSanDong[];
    const nhap = this.getState("nhap") as Record<string, TaiSanVal>;
    const dongMoi = this.getState("dongMoi") as DongNhap<TaiSanVal>[];

    const thieu = dongMoi.filter(
      (d) => !d.val.boPhanId || !d.val.maTaiSan.trim(),
    );
    if (thieu.length > 0) {
      message.warning(
        `Còn ${thieu.length} dòng mới chưa chọn nơi sử dụng hoặc chưa nhập mã tài sản`,
      );
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

    if ([...them, ...sua].some((x) => !x.boPhan)) {
      message.error("Không tìm thấy bộ phận trong danh mục");
      return;
    }

    this.setState("saving", true);
    try {
      const kq = await keHoachTaiSanService.luuHangLoat({
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
      message.error(this.loiCuaApi(error, "Lưu kế hoạch tài sản thất bại"));
    } finally {
      this.setState("saving", false);
    }
  }

  private capNhatVal(id: string, doi: (cu: TaiSanVal) => TaiSanVal): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<TaiSanVal>[];
    const viTri = dongMoi.findIndex((d) => d.id === id);
    if (viTri >= 0) {
      const banSao = [...dongMoi];
      banSao[viTri] = { id, val: doi(dongMoi[viTri].val) };
      this.setState("dongMoi", banSao);
      return;
    }

    const nhap = this.getState("nhap") as Record<string, TaiSanVal>;
    const goc = (this.getState("data") as KeHoachTaiSanDong[]).find(
      (d) => d.id === id,
    );
    if (!goc) return;
    const cu = nhap[id] ?? valTuDong(goc);
    this.setState("nhap", { ...nhap, [id]: doi(cu) });
  }

  private dungPayload(val: TaiSanVal) {
    const bp = (this.getState("boPhanList") as BoPhan[]).find(
      (b) => b.id === val.boPhanId,
    );
    return {
      boPhan: bp ? { id: bp.id, ma: bp.ma, ten: bp.ten } : undefined,
      maTaiSan: val.maTaiSan.trim(),
      tenTaiSan: val.tenTaiSan.trim() || undefined,
      ghiChu: val.ghiChu,
      soLuong: val.soLuong,
      giaBinhQuan: val.giaBinhQuan,
      thang: val.thang,
    };
  }

  private loiCuaApi(error: unknown, macDinh: string): string {
    const thongBao = (error as { message?: string })?.message;
    return thongBao || macDinh;
  }
}
