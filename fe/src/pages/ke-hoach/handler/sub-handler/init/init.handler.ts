import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import dayjs from "dayjs";
import { keHoachService, type KeHoachFilters } from "@/services/keHoachService";
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
import type { KeHoachEvents, KeHoachStates } from "../../ke-hoach.handler";
import {
  buildFilters,
  KE_HOACH_FILTER_STATE_KEYS,
} from "../../../lib/keHoachFilters";
import "./init.event";
import "./init.state";

const PAGE_SIZE = 100;
/** getAll() của một số danh mục chỉ trả 100 bản ghi → dùng getPaginated cho chắc. */
const DANH_MUC_LIMIT = 500;

/** Mặc định mở ra là kế hoạch của NĂM NAY. */
export const defaultDateRange = (): [dayjs.Dayjs, dayjs.Dayjs] => [
  dayjs().startOf("year"),
  dayjs().endOf("year"),
];

@RegisterHandler("ke-hoach")
export class KeHoachInitHandler extends CSubHanlder<KeHoachEvents, KeHoachStates> {
  @HandlerDecorator("init")
  async init(params: { loaiKeHoach: "KE_HOACH" | "DU_BAO" }): Promise<void> {
    this.setState("loaiKeHoach", params.loaiKeHoach);
    this.khoiTaoMacDinh();
    await Promise.all([
      this.napDong(),
      this.napPhienBan(),
      this.napDanhMuc(),
    ]);
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    await Promise.all([this.napDong(), this.napPhienBan()]);
    if (this.getState("view") !== "list") {
      await this.executeEvent("loadSoSanh", {});
    }
  }

  @HandlerDecorator("loadPage")
  async loadPage(params: { page: number; limit?: number }): Promise<void> {
    await this.napDong(params.page, params.limit ?? PAGE_SIZE);
  }

  private async napDong(page = 1, limit = PAGE_SIZE): Promise<void> {
    this.setState("loading", true);
    try {
      const res = await keHoachService.getEntries({
        ...buildFilters((key) => this.getState(key)),
        page,
        limit,
      });
      this.setState("data", res.data);
      this.setState("pagination", res.meta);
    } catch (error) {
      console.error("Lỗi nạp dòng kế hoạch:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  private async napPhienBan(): Promise<void> {
    try {
      const list = await keHoachService.getPhienBanOptions(
        this.getState("loaiKeHoach") as "KE_HOACH" | "DU_BAO",
      );
      this.setState("phienBanList", list);
    } catch (error) {
      console.error("Lỗi nạp phiên bản:", error);
    }
  }

  private async napDanhMuc(): Promise<void> {
    if (this.getState("masterDataLoaded")) return;
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
      this.setState("masterDataLoaded", true);
    } catch (error) {
      console.error("Lỗi nạp danh mục:", error);
    }
  }

  private khoiTaoMacDinh(): void {
    const mac: [string, unknown][] = [
      ["dateRange", defaultDateRange()],
      ["searchText", ""],
      ["phienBan", undefined],
      ["phienBanList", []],
      ["view", "list"],
      ["chiTieu", "tong"],
      ["data", []],
      ["loading", false],
      ["pagination", { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 0 }],
      ["selectedRowKeys", []],
      ["soSanh", null],
      ["soSanhLoading", false],
      ["taiKhoanList", []],
      ["doiTuongList", []],
      ["duAnList", []],
      ["boPhanList", []],
      ["sanPhamList", []],
      ["dongTienList", []],
      ["khoanMucList", []],
      ["nhomQuanLyList", []],
      ["chuDauTuList", []],
      ["nhomKhoanMucList", []],
      ["quyChuanList", []],
      ["masterDataLoaded", false],
    ];
    for (const [key, value] of mac) {
      if (!this.hasState(key)) this.setState(key, value);
    }
    // Tiêu chí lọc theo cột — khởi tạo rỗng để popover header cột có state để đọc.
    for (const key of KE_HOACH_FILTER_STATE_KEYS) {
      if (!this.hasState(key)) this.setState(key, undefined);
    }
  }
}
