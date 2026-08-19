import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import dayjs from "dayjs";
import { keHoachService, type KeHoachDong, type LoaiKeHoach } from "@/services/keHoachService";
import type { KeHoachEvents, KeHoachStates } from "../../ke-hoach.handler";
import {
  loiCuaDong,
  toPayload,
  toRowValues,
  type DanhMucLists,
  type RowValues,
} from "../../../lib/keHoachRow";
import { DONG_MOI_ID } from "./row-edit.state";
import "./row-edit.event";
import "./row-edit.state";

@RegisterHandler("ke-hoach")
export class KeHoachRowEditHandler extends CSubHanlder<KeHoachEvents, KeHoachStates> {
  @HandlerDecorator("themDong")
  async themDong(): Promise<void> {
    const range = this.getState("dateRange") as [dayjs.Dayjs, dayjs.Dayjs] | undefined;
    // Ngày mặc định: hôm nay nếu nằm trong kỳ đang lọc, ngược lại là đầu kỳ.
    const homNay = dayjs();
    const trongKy =
      !range || (homNay.isAfter(range[0]) && homNay.isBefore(range[1]));
    this.setState("editingRowId", DONG_MOI_ID);
    this.setState("editingValues", {
      ngay: (trongKy ? homNay : range?.[0] ?? homNay).toISOString(),
      soTien: 0,
      noiDung: "",
    });
  }

  @HandlerDecorator("suaDong")
  async suaDong(params: { record: KeHoachDong }): Promise<void> {
    this.setState("editingRowId", params.record.id);
    this.setState("editingValues", toRowValues(params.record));
  }

  @HandlerDecorator("nhanBanDong")
  async nhanBanDong(params: { record: KeHoachDong }): Promise<void> {
    this.setState("editingRowId", DONG_MOI_ID);
    this.setState("editingValues", toRowValues(params.record));
  }

  @HandlerDecorator("doiGiaTri")
  async doiGiaTri(params: { field: keyof RowValues; value: unknown }): Promise<void> {
    const values = (this.getState("editingValues") ?? {}) as RowValues;
    const next: RowValues = { ...values, [params.field]: params.value };

    // Chọn nghiệp vụ → gợi ý TK Nợ/Có từ Quy chuẩn hạch toán (chỉ điền ô còn trống).
    if (params.field === "nghiepVu" && params.value) {
      const quyChuan = (this.getState("quyChuanList") ?? []) as {
        nghiepVu: string;
        taiKhoanNo: string;
        taiKhoanCo: string;
        moTa?: string;
      }[];
      const qc = quyChuan.find((q) => q.nghiepVu === params.value);
      if (qc) {
        if (!next.taiKhoanNo) next.taiKhoanNo = qc.taiKhoanNo;
        if (!next.taiKhoanCo) next.taiKhoanCo = qc.taiKhoanCo;
        if (!next.noiDung) next.noiDung = qc.moTa ?? "";
      }
    }

    this.setState("editingValues", next);
  }

  @HandlerDecorator("huySuaDong")
  async huySuaDong(): Promise<void> {
    this.setState("editingRowId", null);
    this.setState("editingValues", {});
  }

  @HandlerDecorator("luuDong")
  async luuDong(): Promise<void> {
    const rowId = this.getState("editingRowId") as string | null;
    if (!rowId) return;
    const values = (this.getState("editingValues") ?? {}) as RowValues;

    const loi = loiCuaDong(values);
    if (loi) {
      message.warning(loi);
      return;
    }

    const payload = toPayload(
      values,
      this.danhMucLists(),
      this.getState("loaiKeHoach") as LoaiKeHoach,
      this.getState("phienBan") as string | undefined,
    );

    this.setState("savingRow", true);
    try {
      if (rowId === DONG_MOI_ID) {
        await keHoachService.create(payload);
        message.success("Đã thêm dòng kế hoạch");
      } else {
        await keHoachService.update(rowId, payload);
        message.success("Đã lưu dòng kế hoạch");
      }
      this.setState("editingRowId", null);
      this.setState("editingValues", {});
      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Không lưu được dòng kế hoạch");
    } finally {
      this.setState("savingRow", false);
    }
  }

  @HandlerDecorator("xoaDong")
  async xoaDong(params: { id: string }): Promise<void> {
    try {
      await keHoachService.remove(params.id);
      message.success("Đã xóa dòng kế hoạch");
      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Không xóa được dòng kế hoạch");
    }
  }

  @HandlerDecorator("xoaNhieuDong")
  async xoaNhieuDong(): Promise<void> {
    const ids = (this.getState("selectedRowKeys") ?? []) as string[];
    if (!ids.length) {
      message.warning("Chưa chọn dòng nào");
      return;
    }
    try {
      const res = await keHoachService.removeBatch(ids);
      message.success(`Đã xóa ${res.deleted} dòng kế hoạch`);
      this.setState("selectedRowKeys", []);
      await this.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Không xóa được các dòng đã chọn");
    }
  }

  private danhMucLists(): DanhMucLists {
    const lay = (key: string) => (this.getState(key) ?? []) as DanhMucLists["taiKhoanList"];
    return {
      taiKhoanList: lay("taiKhoanList"),
      doiTuongList: lay("doiTuongList"),
      duAnList: lay("duAnList"),
      boPhanList: lay("boPhanList"),
      sanPhamList: lay("sanPhamList"),
      dongTienList: lay("dongTienList"),
      khoanMucList: lay("khoanMucList"),
      nhomQuanLyList: lay("nhomQuanLyList"),
      chuDauTuList: lay("chuDauTuList"),
      nhomKhoanMucList: lay("nhomKhoanMucList"),
    };
  }
}
