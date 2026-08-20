import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  keHoachBanHangService,
  SO_THANG,
  type KeHoachBanHangDong,
} from "@/services/keHoachBanHangService";
import type { NhomSanPham, SanPham } from "@/types";
import type { BanHangEvents, BanHangStates } from "../../ban-hang.handler";
import { DONG_MOI_KEY, type BanHangForm } from "../init/init.state";
import "./row-edit.event";

const formRong = (): BanHangForm => ({
  nhomMa: undefined,
  sanPhamId: undefined,
  luong: 0,
  giaBinhQuan: 0,
  thang: Array(SO_THANG).fill(0),
});

@RegisterHandler("ke-hoach-ban-hang")
export class BanHangRowEditHandler extends CSubHanlder<
  BanHangEvents,
  BanHangStates
> {
  @HandlerDecorator("themDong")
  themDong(): void {
    this.setState("editingKey", DONG_MOI_KEY);
    this.setState("formValues", formRong());
  }

  @HandlerDecorator("batDauSua")
  batDauSua(params: { key: string }): void {
    const dong = (this.getState("data") as KeHoachBanHangDong[]).find(
      (d) => d.id === params.key,
    );
    if (!dong) return;
    // Nhóm lưu theo mã vì `SanPham.nhom` là mã, không phải id.
    this.setState("editingKey", params.key);
    this.setState("formValues", {
      nhomMa: dong.nhomSanPham.ma,
      sanPhamId: dong.sanPham.id,
      luong: dong.luong,
      giaBinhQuan: dong.giaBinhQuan,
      thang: [...dong.thang],
    });
  }

  @HandlerDecorator("huySua")
  huySua(): void {
    this.setState("editingKey", null);
    this.setState("formValues", null);
  }

  @HandlerDecorator("datForm")
  datForm(params: { patch: Partial<BanHangForm> }): void {
    const hienTai = (this.getState("formValues") as BanHangForm) ?? formRong();
    const moi = { ...hienTai, ...params.patch };
    // Đổi nhóm thì sản phẩm cũ có thể không còn thuộc nhóm → bỏ chọn.
    if (params.patch.nhomMa !== undefined && params.patch.nhomMa !== hienTai.nhomMa) {
      moi.sanPhamId = undefined;
    }
    this.setState("formValues", moi);
  }

  @HandlerDecorator("datThang")
  datThang(params: { chiSo: number; giaTri: number }): void {
    const hienTai = (this.getState("formValues") as BanHangForm) ?? formRong();
    const thang = [...hienTai.thang];
    thang[params.chiSo] = params.giaTri;
    this.setState("formValues", { ...hienTai, thang });
  }

  @HandlerDecorator("luuDong")
  async luuDong(): Promise<void> {
    const form = this.getState("formValues") as BanHangForm | null;
    const editingKey = this.getState("editingKey") as string | null;
    if (!form || !editingKey) return;

    const themMoi = editingKey === DONG_MOI_KEY;
    if (themMoi && (!form.nhomMa || !form.sanPhamId)) {
      message.warning("Chọn nhóm sản phẩm và sản phẩm trước khi lưu");
      return;
    }

    this.setState("saving", true);
    try {
      if (themMoi) {
        const nhomSanPham = this.mucNhom(form.nhomMa!);
        const sanPham = this.mucSanPham(form.sanPhamId!);
        if (!nhomSanPham || !sanPham) {
          message.error("Không tìm thấy nhóm hoặc sản phẩm trong danh mục");
          return;
        }
        await keHoachBanHangService.taoMoi({
          nam: this.getState("nam") as number,
          nhomSanPham,
          sanPham,
          luong: form.luong,
          giaBinhQuan: form.giaBinhQuan,
          thang: form.thang,
        });
      } else {
        // Sản phẩm không đổi được khi sửa; nhóm thì có (sản phẩm được chuyển nhóm).
        const nhomSanPham = form.nhomMa ? this.mucNhom(form.nhomMa) : undefined;
        await keHoachBanHangService.capNhat(editingKey, {
          ...(nhomSanPham ? { nhomSanPham } : {}),
          luong: form.luong,
          giaBinhQuan: form.giaBinhQuan,
          thang: form.thang,
        });
      }
      await this.executeEvent("huySua", {});
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Lưu dòng kế hoạch bán hàng thất bại"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("xoaDong")
  async xoaDong(params: { id: string }): Promise<void> {
    try {
      await keHoachBanHangService.xoa(params.id);
      message.success("Đã xoá dòng kế hoạch");
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Xoá dòng kế hoạch thất bại"));
    }
  }

  private mucNhom(ma: string) {
    const nhom = (this.getState("nhomSanPhamList") as NhomSanPham[]).find(
      (n) => n.ma === ma,
    );
    return nhom ? { id: nhom.id, ma: nhom.ma, ten: nhom.ten } : undefined;
  }

  private mucSanPham(id: string) {
    const sp = (this.getState("sanPhamList") as SanPham[]).find(
      (s) => s.id === id,
    );
    return sp ? { id: sp.id, ma: sp.ma, ten: sp.ten } : undefined;
  }

  private loiCuaApi(error: unknown, macDinh: string): string {
    const thongBao = (error as { message?: string })?.message;
    return thongBao || macDinh;
  }
}
