import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import dayjs from "dayjs";
import { keHoachService, type LoaiKeHoach } from "@/services/keHoachService";
import { taiKhoanService } from "@/services/taiKhoanService";
import { khoanMucService } from "@/services/khoanMucService";
import { doiTuongService } from "@/services/doiTuongService";
import { duAnService } from "@/services/duAnService";
import { boPhanService } from "@/services/boPhanService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import { chuDauTuService } from "@/services/chuDauTuService";
import { nhomKhoanMucService } from "@/services/nhomKhoanMucService";
import { quyChauanService } from "@/services/quyChaunService";
import { ngayLuu } from "../../../../lib/keHoachRow";
import { dongMoi } from "../../../lib/keHoachFormRows";
import type {
  KeHoachFormEvents,
  KeHoachFormStates,
} from "../../ke-hoach-form.handler";
import type { KeHoachFormHeader } from "./init.state";
import "./init.event";
import "./init.state";

const DANH_MUC_LIMIT = 500;
/** Số dòng trống mở sẵn để gõ ngay, giống bảng chi tiết của chứng từ. */
const SO_DONG_MAC_DINH = 5;

@RegisterHandler("ke-hoach-form")
export class KeHoachFormInitHandler extends CSubHanlder<
  KeHoachFormEvents,
  KeHoachFormStates
> {
  @HandlerDecorator("init")
  async init(params: { loaiKeHoach: LoaiKeHoach }): Promise<void> {
    const ngayMacDinh = ngayLuu(dayjs());
    this.setState("header", {
      loaiKeHoach: params.loaiKeHoach,
      ngayMacDinh,
    } as KeHoachFormHeader);
    this.setState(
      "dongList",
      Array.from({ length: SO_DONG_MAC_DINH }, () => dongMoi(ngayMacDinh)),
    );
    this.setState("submitting", false);
    this.setState("loading", true);
    try {
      await Promise.all([this.napDanhMuc(), this.napPhienBan(params.loaiKeHoach)]);
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("updateHeader")
  async updateHeader(params: {
    field: keyof KeHoachFormHeader;
    value: unknown;
  }): Promise<void> {
    const header = (this.getState("header") ?? {}) as KeHoachFormHeader;
    this.setState("header", { ...header, [params.field]: params.value });
  }

  private async napPhienBan(loaiKeHoach: LoaiKeHoach): Promise<void> {
    try {
      this.setState("phienBanList", await keHoachService.getPhienBanOptions(loaiKeHoach));
    } catch (error) {
      console.error("Lỗi nạp phiên bản:", error);
    }
  }

  private async napDanhMuc(): Promise<void> {
    try {
      const [
        taiKhoan,
        khoanMuc,
        doiTuong,
        duAn,
        boPhan,
        sanPham,
        dongTien,
        nhomQuanLy,
        chuDauTu,
        nhomKhoanMuc,
        quyChuan,
      ] = await Promise.all([
        taiKhoanService.getLeafAccounts(),
        khoanMucService.getPaginated({ limit: DANH_MUC_LIMIT }),
        doiTuongService.getPaginated({ limit: DANH_MUC_LIMIT }),
        duAnService.getPaginated({ limit: DANH_MUC_LIMIT }),
        boPhanService.getPaginated({ limit: DANH_MUC_LIMIT }),
        sanPhamService.getPaginated({ limit: DANH_MUC_LIMIT }),
        dongTienService.getPaginated({ limit: DANH_MUC_LIMIT }),
        nhomQuanLyService.getPaginated({ limit: DANH_MUC_LIMIT }),
        chuDauTuService.getPaginated({ limit: DANH_MUC_LIMIT }),
        nhomKhoanMucService.getPaginated({ limit: DANH_MUC_LIMIT }),
        quyChauanService.getAll(),
      ]);

      this.setState("taiKhoanList", taiKhoan);
      this.setState("khoanMucList", khoanMuc.data);
      this.setState("doiTuongList", doiTuong.data);
      this.setState("duAnList", duAn.data);
      this.setState("boPhanList", boPhan.data);
      this.setState("sanPhamList", sanPham.data);
      this.setState("dongTienList", dongTien.data);
      this.setState("nhomQuanLyList", nhomQuanLy.data);
      this.setState("chuDauTuList", chuDauTu.data);
      this.setState("nhomKhoanMucList", nhomKhoanMuc.data);
      this.setState(
        "quyChuanList",
        quyChuan.map((qc) => ({
          nghiepVu: qc.nghiepVu,
          taiKhoanNo: qc.taiKhoanNo,
          taiKhoanCo: qc.taiKhoanCo,
          moTa: qc.moTa,
        })),
      );
    } catch (error) {
      console.error("Lỗi nạp danh mục:", error);
    }
  }
}
