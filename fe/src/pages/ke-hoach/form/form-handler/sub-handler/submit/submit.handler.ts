import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import { keHoachService } from "@/services/keHoachService";
import type {
  KeHoachFormEvents,
  KeHoachFormStates,
} from "../../ke-hoach-form.handler";
import type { DanhMucLists } from "../../../../lib/keHoachRow";
import {
  dongMoi,
  loiCuaLo,
  toPayloads,
  type DongKeHoach,
} from "../../../lib/keHoachFormRows";
import type { KeHoachFormHeader } from "../init/init.state";
import "./submit.event";

const SO_DONG_MAC_DINH = 5;

@RegisterHandler("ke-hoach-form")
export class KeHoachFormSubmitHandler extends CSubHanlder<
  KeHoachFormEvents,
  KeHoachFormStates
> {
  @HandlerDecorator("submitForm")
  async submitForm(params: { giuLaiForm?: boolean }): Promise<boolean> {
    const header = (this.getState("header") ?? {}) as KeHoachFormHeader;
    const list = (this.getState("dongList") ?? []) as DongKeHoach[];

    // Dòng trống hoàn toàn (mở sẵn mà không gõ gì) thì bỏ qua, không bắt lỗi.
    const daNhap = list.filter(
      (d) => d.soTien || d.taiKhoanNo || d.taiKhoanCo || d.noiDung || d.nghiepVu,
    );

    const loi = loiCuaLo(daNhap);
    if (loi.length) {
      message.error(loi.slice(0, 5).join("; "));
      return false;
    }

    // Dòng bỏ trống diễn giải thì dùng diễn giải chung của cả lô.
    const chuanHoa = daNhap.map((d) => ({
      ...d,
      noiDung: d.noiDung || header.dienGiaiChung || "",
    }));

    this.setState("submitting", true);
    try {
      const payloads = toPayloads(
        chuanHoa,
        this.danhMucLists(),
        header.loaiKeHoach,
        header.phienBan,
      );
      await keHoachService.createBatch(payloads);
      message.success(`Đã lưu ${payloads.length} dòng kế hoạch`);

      if (params?.giuLaiForm) {
        this.setState(
          "dongList",
          Array.from({ length: SO_DONG_MAC_DINH }, () => dongMoi(header.ngayMacDinh)),
        );
      }
      return true;
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Không lưu được kế hoạch");
      return false;
    } finally {
      this.setState("submitting", false);
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
