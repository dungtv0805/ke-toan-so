import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import "./quick-add.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuChiTiet, TaiKhoanItem } from "../init/init.state";
import { QuyChuan, DoiTuong, TaiKhoan } from "@/types";
import { quyChauanService } from "@/services/quyChaunService";
import { doiTuongService } from "@/services/doiTuongService";
import { taiKhoanService } from "@/services/taiKhoanService";
import {
  quickAddQuyChuanReducer,
  quickAddDoiTuongReducer,
  quickAddTaiKhoanReducer,
} from "./quick-add.reducers";

@RegisterHandler("nhat-ky-chung-form")
export class QuickAddFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("quickCreateQuyChuan")
  async quickCreateQuyChuan(params: {
    key: string; loaiGiaoDich: string; nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string;
  }): Promise<{ ok: boolean }> {
    try {
      const created: QuyChuan = await quyChauanService.create({
        loaiGiaoDich: params.loaiGiaoDich,
        nghiepVu: params.nghiepVu,
        taiKhoanNo: params.taiKhoanNo,
        taiKhoanCo: params.taiKhoanCo,
        moTa: params.moTa,
      });
      const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
      const quyChaunList = (this.getState("quyChaunList") as QuyChuan[]) || [];
      const next = quickAddQuyChuanReducer({ chiTietList, quyChaunList, key: params.key, created });
      this.setState("quyChaunList", next.quyChaunList);
      this.setState("chiTietList", next.chiTietList);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @HandlerDecorator("quickCreateDoiTuong")
  async quickCreateDoiTuong(params: {
    key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[]; ma: string; ten: string;
  }): Promise<{ ok: boolean }> {
    try {
      const created: DoiTuong = await doiTuongService.create({
        loai: params.loai,
        ma: params.ma,
        ten: params.ten,
      } as unknown as Omit<DoiTuong, "id">);
      const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
      const doiTuongList = (this.getState("doiTuongList") as DoiTuong[]) || [];
      const next = quickAddDoiTuongReducer({ chiTietList, doiTuongList, key: params.key, field: params.field, created });
      this.setState("doiTuongList", next.doiTuongList);
      this.setState("chiTietList", next.chiTietList);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  @HandlerDecorator("quickCreateTaiKhoan")
  async quickCreateTaiKhoan(params: {
    key: string; field: "taiKhoanNo" | "taiKhoanCo"; ma: string; ten: string; loai: string; nhom: string; capDo: number; chiTietTheo?: string;
  }): Promise<{ ok: boolean }> {
    try {
      const created: TaiKhoan = await taiKhoanService.create({
        ma: params.ma,
        ten: params.ten,
        capDo: params.capDo,
        loai: params.loai,
        nhom: params.nhom,
        chiTietTheo: params.chiTietTheo ?? null,
        moTa: "",
        fieldRules: null,
      } as unknown as Omit<TaiKhoan, "id">);
      const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
      const taiKhoanList = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];
      const next = quickAddTaiKhoanReducer({ chiTietList, taiKhoanList, key: params.key, field: params.field, created });
      this.setState("taiKhoanList", next.taiKhoanList);
      this.setState("chiTietList", next.chiTietList);
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
