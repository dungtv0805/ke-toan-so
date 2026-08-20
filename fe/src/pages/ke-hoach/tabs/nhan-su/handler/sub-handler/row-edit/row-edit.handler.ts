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
import { DONG_MOI_KEY, type NhanSuForm } from "../init/init.state";
import "./row-edit.event";

const formRong = (): NhanSuForm => ({
  boPhanId: undefined,
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
  themDong(): void {
    this.setState("editingKey", DONG_MOI_KEY);
    this.setState("formValues", formRong());
  }

  @HandlerDecorator("batDauSua")
  batDauSua(params: { key: string }): void {
    const dong = (this.getState("data") as KeHoachNhanSuDong[]).find(
      (d) => d.id === params.key,
    );
    if (!dong) return;
    this.setState("editingKey", params.key);
    this.setState("formValues", {
      boPhanId: dong.boPhan.id,
      maViTri: dong.maViTri,
      tenChucVu: dong.tenChucVu ?? "",
      chiPhi: { ...dong.chiPhi },
      thang: [...dong.thang],
    });
  }

  @HandlerDecorator("huySua")
  huySua(): void {
    this.setState("editingKey", null);
    this.setState("formValues", null);
  }

  @HandlerDecorator("datForm")
  datForm(params: { patch: Partial<NhanSuForm> }): void {
    const hienTai = (this.getState("formValues") as NhanSuForm) ?? formRong();
    this.setState("formValues", { ...hienTai, ...params.patch });
  }

  @HandlerDecorator("datChiPhi")
  datChiPhi(params: { khoa: keyof ChiPhiNhanSu; giaTri: number }): void {
    const hienTai = (this.getState("formValues") as NhanSuForm) ?? formRong();
    this.setState("formValues", {
      ...hienTai,
      chiPhi: { ...hienTai.chiPhi, [params.khoa]: params.giaTri },
    });
  }

  @HandlerDecorator("datThang")
  datThang(params: { chiSo: number; giaTri: number }): void {
    const hienTai = (this.getState("formValues") as NhanSuForm) ?? formRong();
    const thang = [...hienTai.thang];
    thang[params.chiSo] = params.giaTri;
    this.setState("formValues", { ...hienTai, thang });
  }

  @HandlerDecorator("luuDong")
  async luuDong(): Promise<void> {
    const form = this.getState("formValues") as NhanSuForm | null;
    const editingKey = this.getState("editingKey") as string | null;
    if (!form || !editingKey) return;

    if (!form.boPhanId) {
      message.warning("Chọn bộ phận trước khi lưu");
      return;
    }
    if (!form.maViTri.trim()) {
      message.warning("Nhập mã vị trí trước khi lưu");
      return;
    }

    const boPhan = this.mucBoPhan(form.boPhanId);
    if (!boPhan) {
      message.error("Không tìm thấy bộ phận trong danh mục");
      return;
    }

    this.setState("saving", true);
    try {
      const chung = {
        boPhan,
        maViTri: form.maViTri.trim(),
        tenChucVu: form.tenChucVu.trim() || undefined,
        chiPhi: form.chiPhi,
        thang: form.thang,
      };
      if (editingKey === DONG_MOI_KEY) {
        await keHoachNhanSuService.taoMoi({
          nam: this.getState("nam") as number,
          ...chung,
        });
      } else {
        await keHoachNhanSuService.capNhat(editingKey, chung);
      }
      await this.executeEvent("huySua", {});
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Lưu dòng kế hoạch nhân sự thất bại"));
    } finally {
      this.setState("saving", false);
    }
  }

  @HandlerDecorator("xoaDong")
  async xoaDong(params: { id: string }): Promise<void> {
    try {
      await keHoachNhanSuService.xoa(params.id);
      message.success("Đã xoá dòng kế hoạch");
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Xoá dòng kế hoạch thất bại"));
    }
  }

  private mucBoPhan(id: string) {
    const bp = (this.getState("boPhanList") as BoPhan[]).find(
      (b) => b.id === id,
    );
    return bp ? { id: bp.id, ma: bp.ma, ten: bp.ten } : undefined;
  }

  private loiCuaApi(error: unknown, macDinh: string): string {
    const thongBao = (error as { message?: string })?.message;
    return thongBao || macDinh;
  }
}
