import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { SO_THANG } from "@/services/keHoachBanHangService";
import {
  chiPhiRong,
  keHoachNhanSuService,
  type ChiPhiNhanSu,
  type KeHoachNhanSuDong,
} from "@/services/keHoachNhanSuService";
import type { BoPhan } from "@/types";
import type { NhanSuEvents, NhanSuStates } from "../../nhan-su.handler";
import { laKhacNhau, tamId, type DongNhap } from "../../../../lib/nhapBang";
import { valTuDong, type NhanSuVal } from "../init/init.state";
import "./row-edit.event";

const valRong = (boPhanId = ""): NhanSuVal => ({
  boPhanId,
  maViTri: "",
  tenChucVu: "",
  chiPhi: chiPhiRong(),
  thang: Array(SO_THANG).fill(0),
});

@RegisterHandler("ke-hoach-nhan-su")
export class NhanSuRowEditHandler extends CSubHanlder<
  NhanSuEvents,
  NhanSuStates
> {
  @HandlerDecorator("themDong")
  themDong(params: { boPhanId?: string }): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<NhanSuVal>[];
    this.setState("dongMoi", [
      ...dongMoi,
      { id: tamId(), val: valRong(params.boPhanId ?? "") },
    ]);
  }

  @HandlerDecorator("suaO")
  suaO(params: { id: string; patch: Partial<NhanSuVal> }): void {
    this.capNhatVal(params.id, (cu) => ({ ...cu, ...params.patch }));
  }

  @HandlerDecorator("suaChiPhi")
  suaChiPhi(params: {
    id: string;
    khoa: keyof ChiPhiNhanSu;
    giaTri: number;
  }): void {
    this.capNhatVal(params.id, (cu) => ({
      ...cu,
      chiPhi: { ...cu.chiPhi, [params.khoa]: params.giaTri },
    }));
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
    const dongMoi = this.getState("dongMoi") as DongNhap<NhanSuVal>[];
    if (dongMoi.some((d) => d.id === params.id)) {
      this.setState(
        "dongMoi",
        dongMoi.filter((d) => d.id !== params.id),
      );
      return;
    }

    try {
      await keHoachNhanSuService.xoa(params.id);
      // Bỏ luôn phần gõ dở của dòng vừa xoá, tránh gửi lên khi Lưu.
      const nhap = { ...(this.getState("nhap") as Record<string, NhanSuVal>) };
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
    const data = this.getState("data") as KeHoachNhanSuDong[];
    const nhap = this.getState("nhap") as Record<string, NhanSuVal>;
    const dongMoi = this.getState("dongMoi") as DongNhap<NhanSuVal>[];

    const thieu = dongMoi.filter(
      (d) => !d.val.boPhanId || !d.val.maViTri.trim(),
    );
    if (thieu.length > 0) {
      message.warning(
        `Còn ${thieu.length} dòng mới chưa chọn bộ phận hoặc chưa nhập mã vị trí`,
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
      const kq = await keHoachNhanSuService.luuHangLoat({
        nam: this.getState("nam") as number,
        them: them as never,
        sua: sua as never,
      });
      message.success(`Đã lưu ${kq.daThem} dòng mới, ${kq.daSua} dòng sửa`);
      this.setState("nhap", {});
      this.setState("dongMoi", []);
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Lưu kế hoạch nhân sự thất bại"));
    } finally {
      this.setState("saving", false);
    }
  }

  /** Ghi giá trị mới cho một dòng, dù là dòng đã lưu hay dòng mới. */
  private capNhatVal(id: string, doi: (cu: NhanSuVal) => NhanSuVal): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<NhanSuVal>[];
    const viTri = dongMoi.findIndex((d) => d.id === id);
    if (viTri >= 0) {
      const banSao = [...dongMoi];
      banSao[viTri] = { id, val: doi(dongMoi[viTri].val) };
      this.setState("dongMoi", banSao);
      return;
    }

    const nhap = this.getState("nhap") as Record<string, NhanSuVal>;
    const goc = (this.getState("data") as KeHoachNhanSuDong[]).find(
      (d) => d.id === id,
    );
    if (!goc) return;
    const cu = nhap[id] ?? valTuDong(goc);
    this.setState("nhap", { ...nhap, [id]: doi(cu) });
  }

  private dungPayload(val: NhanSuVal) {
    const bp = (this.getState("boPhanList") as BoPhan[]).find(
      (b) => b.id === val.boPhanId,
    );
    return {
      boPhan: bp ? { id: bp.id, ma: bp.ma, ten: bp.ten } : undefined,
      maViTri: val.maViTri.trim(),
      tenChucVu: val.tenChucVu.trim() || undefined,
      chiPhi: val.chiPhi,
      thang: val.thang,
    };
  }

  private loiCuaApi(error: unknown, macDinh: string): string {
    const thongBao = (error as { message?: string })?.message;
    return thongBao || macDinh;
  }
}
