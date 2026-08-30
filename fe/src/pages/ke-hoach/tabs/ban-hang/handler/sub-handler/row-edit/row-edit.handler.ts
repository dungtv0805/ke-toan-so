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
import {
  laKhacNhau,
  tamId,
  type DongNhap,
} from "../../../../lib/nhapBang";
import { valTuDong, type BanHangVal } from "../init/init.state";
import "./row-edit.event";

const valRong = (nhomMa = ""): BanHangVal => ({
  nhomMa,
  sanPhamId: "",
  ghiChu: "",
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
  themDong(params: { nhomMa?: string }): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<BanHangVal>[];
    this.setState("dongMoi", [
      ...dongMoi,
      { id: tamId(), val: valRong(params.nhomMa ?? "") },
    ]);
  }

  @HandlerDecorator("suaO")
  suaO(params: { id: string; patch: Partial<BanHangVal> }): void {
    this.capNhatVal(params.id, (cu) => {
      const moi = { ...cu, ...params.patch };
      // Đổi nhóm thì sản phẩm cũ có thể không còn thuộc nhóm → bỏ chọn.
      if (params.patch.nhomMa !== undefined && params.patch.nhomMa !== cu.nhomMa) {
        moi.sanPhamId = "";
      }
      return moi;
    });
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
    const dongMoi = this.getState("dongMoi") as DongNhap<BanHangVal>[];
    if (dongMoi.some((d) => d.id === params.id)) {
      this.setState(
        "dongMoi",
        dongMoi.filter((d) => d.id !== params.id),
      );
      return;
    }

    try {
      await keHoachBanHangService.xoa(params.id);
      // Bỏ luôn phần gõ dở của dòng vừa xoá, tránh gửi lên khi Lưu.
      const nhap = { ...(this.getState("nhap") as Record<string, BanHangVal>) };
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
    const data = this.getState("data") as KeHoachBanHangDong[];
    const nhap = this.getState("nhap") as Record<string, BanHangVal>;
    const dongMoi = this.getState("dongMoi") as DongNhap<BanHangVal>[];

    const thieu = dongMoi.filter((d) => !d.val.nhomMa || !d.val.sanPhamId);
    if (thieu.length > 0) {
      message.warning(
        `Còn ${thieu.length} dòng mới chưa chọn nhóm hoặc sản phẩm`,
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

    if (them.some((t) => !t.nhomSanPham || !t.sanPham)) {
      message.error("Không tìm thấy nhóm hoặc sản phẩm trong danh mục");
      return;
    }

    this.setState("saving", true);
    try {
      const kq = await keHoachBanHangService.luuHangLoat({
        nam: this.getState("nam") as number,
        them: them as never,
        // Sửa không đổi được sản phẩm — chỉ gửi phần server cho phép sửa.
        sua: sua.map(
          ({ id, nhomSanPham, ghiChu, luong, giaBinhQuan, thang }) => ({
            id,
            nhomSanPham: nhomSanPham!,
            ghiChu,
            luong,
            giaBinhQuan,
            thang,
          }),
        ),
      });
      message.success(`Đã lưu ${kq.daThem} dòng mới, ${kq.daSua} dòng sửa`);
      this.setState("nhap", {});
      this.setState("dongMoi", []);
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Lưu kế hoạch bán hàng thất bại"));
    } finally {
      this.setState("saving", false);
    }
  }

  /** Ghi giá trị mới cho một dòng, dù là dòng đã lưu hay dòng mới. */
  private capNhatVal(id: string, doi: (cu: BanHangVal) => BanHangVal): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<BanHangVal>[];
    const viTri = dongMoi.findIndex((d) => d.id === id);
    if (viTri >= 0) {
      const banSao = [...dongMoi];
      banSao[viTri] = { id, val: doi(dongMoi[viTri].val) };
      this.setState("dongMoi", banSao);
      return;
    }

    const nhap = this.getState("nhap") as Record<string, BanHangVal>;
    const goc = (this.getState("data") as KeHoachBanHangDong[]).find(
      (d) => d.id === id,
    );
    if (!goc) return;
    const cu = nhap[id] ?? valTuDong(goc);
    this.setState("nhap", { ...nhap, [id]: doi(cu) });
  }

  private dungPayload(val: BanHangVal) {
    const nhom = (this.getState("nhomSanPhamList") as NhomSanPham[]).find(
      (n) => n.ma === val.nhomMa,
    );
    const sp = (this.getState("sanPhamList") as SanPham[]).find(
      (s) => s.id === val.sanPhamId,
    );
    return {
      nhomSanPham: nhom
        ? { id: nhom.id, ma: nhom.ma, ten: nhom.ten }
        : undefined,
      sanPham: sp ? { id: sp.id, ma: sp.ma, ten: sp.ten } : undefined,
      ghiChu: val.ghiChu,
      luong: val.luong,
      giaBinhQuan: val.giaBinhQuan,
      thang: val.thang,
    };
  }

  private loiCuaApi(error: unknown, macDinh: string): string {
    const thongBao = (error as { message?: string })?.message;
    return thongBao || macDinh;
  }
}
