import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import dayjs from "dayjs";
import "./load-data.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuHeader, ChungTuChiTiet } from "../init/init.state";
import { NhatKyChung, DoiTuong, DuAn, BoPhan, SanPham, DongTien, NhomKhuyenMai, NhomQuanLy, KhoanMuc } from "@/types";
import { KhoanMucItem } from "../init/init.state";

@RegisterHandler("nhat-ky-chung-form")
export class LoadDataFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("loadDataBySoPhieu")
  async loadDataBySoPhieu(params: { soPhieu: string }): Promise<void> {
    this.setState("loading", true);

    try {
      // Lấy tất cả items có cùng soPhieu
      const items = await nhatKyChungService.getBySoPhieu(params.soPhieu);

      if (items.length > 0) {
        // Header từ item đầu tiên
        const first = items[0];
        const header: ChungTuHeader = {
          soPhieu: first.soPhieu,
          ngay: dayjs(first.ngay),
          loai: first.danhMuc?.loaiChungTu?.ma || first.danhMuc?.loaiGiaoDich?.ma,
          loaiTen: first.danhMuc?.loaiChungTu?.ten || first.danhMuc?.loaiGiaoDich?.ten || first.loaiChungTu,
          dienGiaiChung: first.dienGiai,
          nguoiGiaoDich: first.nguoiGiaoDich,
          diaChi: first.diaChi,
          ghiChu: first.ghiChu,
        };
        this.setState("header", header);

        // Chi tiết từ tất cả items
        const chiTietList: ChungTuChiTiet[] = items.map((item) => this.mapItemToChiTiet(item));
        this.setState("chiTietList", chiTietList);
      }
    } catch (error) {
      console.error("Error loading data by soPhieu:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  private mapItemToChiTiet(item: NhatKyChung): ChungTuChiTiet {
    const danhMuc = item.danhMuc;
    const doiTuongList = (this.getState("doiTuongList") as DoiTuong[]) || [];
    const duAnList = (this.getState("duAnList") as DuAn[]) || [];
    const boPhanList = (this.getState("boPhanList") as BoPhan[]) || [];
    const sanPhamList = (this.getState("sanPhamList") as SanPham[]) || [];
    const dongTienList = (this.getState("dongTienList") as DongTien[]) || [];
    const nhomKhuyenMaiList = (this.getState("nhomKhuyenMaiList") as NhomKhuyenMai[]) || [];
    const nhomQuanLyList = (this.getState("nhomQuanLyList") as NhomQuanLy[]) || [];
    const khoanMucList = (this.getState("khoanMucList") as KhoanMucItem[]) || [];

    // Find IDs from master data based on danhMuc snapshots
    const doiTuong = danhMuc?.doiTuong ? doiTuongList.find((d) => d.ma === danhMuc.doiTuong?.ma) : undefined;
    const doiTuong2 = danhMuc?.doiTuong2 ? doiTuongList.find((d) => d.ma === danhMuc.doiTuong2?.ma) : undefined;
    const duAn = danhMuc?.duAn ? duAnList.find((d) => d.ma === danhMuc.duAn?.ma) : undefined;
    const boPhan = danhMuc?.boPhan ? boPhanList.find((b) => b.ma === danhMuc.boPhan?.ma) : undefined;
    const doi = danhMuc?.doi ? boPhanList.find((b) => b.ma === danhMuc.doi?.ma) : undefined;
    const nhanVien = danhMuc?.nhanVien ? doiTuongList.find((d) => d.ma === danhMuc.nhanVien?.ma) : undefined;
    const sanPham = danhMuc?.sanPham ? sanPhamList.find((s) => s.ma === danhMuc.sanPham?.ma) : undefined;
    const dongTien = danhMuc?.dongTien ? dongTienList.find((d) => d.ma === danhMuc.dongTien?.ma) : undefined;
    const nhomKhuyenMai = danhMuc?.nhomKhuyenMai ? nhomKhuyenMaiList.find((n) => n.ma === danhMuc.nhomKhuyenMai?.ma) : undefined;
    const nhomQuanLy = danhMuc?.nhomQuanLy ? nhomQuanLyList.find((n) => n.ma === danhMuc.nhomQuanLy?.ma) : undefined;
    const khoanMuc = danhMuc?.khoanMuc ? khoanMucList.find((k) => k.ma === danhMuc.khoanMuc?.ma) : undefined;

    return {
      key: item.id,
      id: item.id,
      taiKhoanNo: item.taiKhoanNo || "",
      taiKhoanCo: item.taiKhoanCo || "",
      soTien: item.soTien,
      noiDung: item.dienGiai,

      // IDs
      doiTuongId: doiTuong?.id,
      doiTuong2Id: doiTuong2?.id,
      duAnId: duAn?.id,
      boPhanId: boPhan?.id,
      doiId: doi?.id,
      nhanVienId: nhanVien?.id,
      sanPhamId: sanPham?.id,
      dongTienId: dongTien?.id,
      nhomKhuyenMaiId: nhomKhuyenMai?.id,
      nhomQuanLyId: nhomQuanLy?.id,
      khoanMucId: khoanMuc?.id,

      // Snapshots
      doiTuongSnapshot: danhMuc?.doiTuong as Record<string, unknown>,
      doiTuong2Snapshot: danhMuc?.doiTuong2 as Record<string, unknown>,
      duAnSnapshot: danhMuc?.duAn as Record<string, unknown>,
      boPhanSnapshot: danhMuc?.boPhan as Record<string, unknown>,
      doiSnapshot: danhMuc?.doi as Record<string, unknown>,
      nhanVienSnapshot: danhMuc?.nhanVien as Record<string, unknown>,
      sanPhamSnapshot: danhMuc?.sanPham as Record<string, unknown>,
      dongTienSnapshot: danhMuc?.dongTien as Record<string, unknown>,
      nhomKhuyenMaiSnapshot: danhMuc?.nhomKhuyenMai as Record<string, unknown>,
      nhomQuanLySnapshot: danhMuc?.nhomQuanLy as Record<string, unknown>,
      khoanMucSnapshot: danhMuc?.khoanMuc as Record<string, unknown>,
    };
  }
}
