import { message } from "antd";
import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import {
  keHoachDongTienService,
  type KeHoachDongTienDong,
} from "@/services/keHoachDongTienService";
import { SO_THANG } from "@/services/keHoachBanHangService";
import type { LoaiKeHoach } from "@/services/keHoachService";
import type { NhomDongTien } from "@/services/nhomDongTienService";
import type { DongTien } from "@/types";
import type { DongTienEvents, DongTienStates } from "../../dong-tien.handler";
import { laKhacNhau, tamId, type DongNhap } from "../../../../lib/nhapBang";
import { valTuDong, type DongTienVal } from "../init/init.state";
import "./row-edit.event";

const valRong = (nhomMa = ""): DongTienVal => ({
  nhomMa,
  dongTienId: "",
  chieu: "THU",
  ghiChu: "",
  giaTriMucTieu: 0,
  thang: Array(SO_THANG).fill(0),
});

@RegisterHandler("ke-hoach-dong-tien")
export class DongTienRowEditHandler extends CSubHanlder<
  DongTienEvents,
  DongTienStates
> {
  @HandlerDecorator("themDong")
  themDong(params: { nhomMa?: string }): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<DongTienVal>[];
    this.setState("dongMoi", [
      ...dongMoi,
      { id: tamId(), val: valRong(params.nhomMa ?? "") },
    ]);
  }

  @HandlerDecorator("suaO")
  suaO(params: { id: string; patch: Partial<DongTienVal> }): void {
    this.capNhatVal(params.id, (cu) => {
      const moi = { ...cu, ...params.patch };
      // Đổi nhóm thì dòng tiền cũ có thể không còn thuộc nhóm → bỏ chọn.
      if (
        params.patch.nhomMa !== undefined &&
        params.patch.nhomMa !== cu.nhomMa
      ) {
        moi.dongTienId = "";
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

  @HandlerDecorator("suaTonDau")
  suaTonDau(params: { giaTri: number }): void {
    this.setState("tonDauNhap", params.giaTri);
  }

  @HandlerDecorator("boDong")
  async boDong(params: { id: string }): Promise<void> {
    const dongMoi = this.getState("dongMoi") as DongNhap<DongTienVal>[];
    if (dongMoi.some((d) => d.id === params.id)) {
      this.setState(
        "dongMoi",
        dongMoi.filter((d) => d.id !== params.id),
      );
      return;
    }

    try {
      await keHoachDongTienService.xoa(params.id);
      // Bỏ luôn phần gõ dở của dòng vừa xoá, tránh gửi lên khi Lưu.
      const nhap = { ...(this.getState("nhap") as Record<string, DongTienVal>) };
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
    this.setState("tonDauNhap", null);
  }

  @HandlerDecorator("luuTatCa")
  async luuTatCa(): Promise<void> {
    const data = this.getState("data") as KeHoachDongTienDong[];
    const nhap = this.getState("nhap") as Record<string, DongTienVal>;
    const dongMoi = this.getState("dongMoi") as DongNhap<DongTienVal>[];
    const tonDauNhap = this.getState("tonDauNhap") as number | null;

    const thieu = dongMoi.filter((d) => !d.val.nhomMa || !d.val.dongTienId);
    if (thieu.length > 0) {
      message.warning(
        `Còn ${thieu.length} dòng mới chưa chọn nhóm hoặc dòng tiền`,
      );
      return;
    }

    const them = dongMoi.map((d) => this.dungPayload(d.val));
    const sua = data
      .filter((d) => nhap[d.id] && laKhacNhau(nhap[d.id], valTuDong(d)))
      .map((d) => ({ id: d.id, ...this.dungPayload(nhap[d.id]) }));

    if (them.length === 0 && sua.length === 0 && tonDauNhap === null) {
      message.info("Không có thay đổi nào để lưu");
      return;
    }

    if (them.some((t) => !t.nhomDongTien || !t.dongTien)) {
      message.error("Không tìm thấy nhóm hoặc dòng tiền trong danh mục");
      return;
    }

    const nam = this.getState("nam") as number;
    const loaiKeHoach = this.getState("loaiKeHoach") as LoaiKeHoach;

    this.setState("saving", true);
    try {
      if (tonDauNhap !== null) {
        await keHoachDongTienService.luuTonDau(nam, loaiKeHoach, tonDauNhap);
      }
      if (them.length > 0 || sua.length > 0) {
        const kq = await keHoachDongTienService.luuHangLoat({
          nam,
          loaiKeHoach,
          them: them as never,
          // Sửa không đổi được dòng tiền — chỉ gửi phần server cho phép sửa.
          sua: sua.map(({ id, nhomDongTien, chieu, ghiChu, giaTriMucTieu, thang }) => ({
            id,
            nhomDongTien: nhomDongTien!,
            chieu,
            ghiChu,
            giaTriMucTieu,
            thang,
          })),
        });
        message.success(`Đã lưu ${kq.daThem} dòng mới, ${kq.daSua} dòng sửa`);
      } else {
        message.success("Đã lưu tồn quỹ đầu năm");
      }
      this.setState("nhap", {});
      this.setState("dongMoi", []);
      this.setState("tonDauNhap", null);
      await this.executeEvent("refresh", {});
    } catch (error) {
      message.error(this.loiCuaApi(error, "Lưu kế hoạch dòng tiền thất bại"));
    } finally {
      this.setState("saving", false);
    }
  }

  /** Ghi giá trị mới cho một dòng, dù là dòng đã lưu hay dòng mới. */
  private capNhatVal(id: string, doi: (cu: DongTienVal) => DongTienVal): void {
    const dongMoi = this.getState("dongMoi") as DongNhap<DongTienVal>[];
    const viTri = dongMoi.findIndex((d) => d.id === id);
    if (viTri >= 0) {
      const banSao = [...dongMoi];
      banSao[viTri] = { id, val: doi(dongMoi[viTri].val) };
      this.setState("dongMoi", banSao);
      return;
    }

    const nhap = this.getState("nhap") as Record<string, DongTienVal>;
    const goc = (this.getState("data") as KeHoachDongTienDong[]).find(
      (d) => d.id === id,
    );
    if (!goc) return;
    const cu = nhap[id] ?? valTuDong(goc);
    this.setState("nhap", { ...nhap, [id]: doi(cu) });
  }

  private dungPayload(val: DongTienVal) {
    const nhom = (this.getState("nhomDongTienList") as NhomDongTien[]).find(
      (n) => n.ma === val.nhomMa,
    );
    const dt = (this.getState("dongTienList") as DongTien[]).find(
      (d) => d.id === val.dongTienId,
    );
    return {
      nhomDongTien: nhom
        ? { id: nhom.id, ma: nhom.ma, ten: nhom.ten }
        : undefined,
      dongTien: dt ? { id: dt.id, ma: dt.ma, ten: dt.ten } : undefined,
      chieu: val.chieu,
      ghiChu: val.ghiChu,
      giaTriMucTieu: val.giaTriMucTieu,
      thang: val.thang,
    };
  }

  private loiCuaApi(error: unknown, macDinh: string): string {
    const thongBao = (error as { message?: string })?.message;
    return thongBao || macDinh;
  }
}
