import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { doiTuongService } from "@/services/doiTuongService";
import { duAnService } from "@/services/duAnService";
import { boPhanService } from "@/services/boPhanService";
import { sanPhamService } from "@/services/sanPhamService";
import { dongTienService } from "@/services/dongTienService";
import { quyChauanService } from "@/services/quyChaunService";
import { nhomKhuyenMaiService } from "@/services/nhomKhuyenMaiService";
import { nhomQuanLyService } from "@/services/nhomQuanLyService";
import { hopDongService } from "@/services/hopDongService";
import { loaiChungTuService } from "@/services/loaiChungTuService";
import { loaiGiaoDichService } from "@/services/loaiGiaoDichService";
import "./master-data.event";
import "./master-data.state";
import { NhatKyChungStates, NhatKyChungEvents } from "../../../handler/nhat-ky-chung.handler";

@RegisterHandler("nhat-ky-chung")
export class MasterDataHandler extends CSubHanlder<NhatKyChungEvents, NhatKyChungStates> {
  @HandlerDecorator("loadMasterData")
  async loadMasterData(): Promise<void> {
    const isLoaded = this.getState("masterDataLoaded");
    if (isLoaded) return;

    this.setState("masterDataLoading", true);

    try {
      const [doiTuong, duAn, boPhan, sanPham, dongTien, quyChuan, nhomKhuyenMai, nhomQuanLy, hopDong, loaiChungTu, loaiGiaoDich] =
        await Promise.all([
          doiTuongService.getAll(),
          duAnService.getAll(),
          boPhanService.getAll(),
          sanPhamService.getAll(),
          dongTienService.getAll(),
          quyChauanService.getAll(),
          nhomKhuyenMaiService.getAll(),
          nhomQuanLyService.getAll(),
          hopDongService.getAll(),
          loaiChungTuService.getAll(),
          loaiGiaoDichService.getAll(),
        ]);

      this.setState("doiTuongList", doiTuong);
      this.setState("duAnList", duAn);
      this.setState("boPhanList", boPhan);
      this.setState("sanPhamList", sanPham);
      this.setState("dongTienList", dongTien);
      this.setState("quyChaunList", quyChuan);
      this.setState("nhomKhuyenMaiList", nhomKhuyenMai);
      this.setState("nhomQuanLyList", nhomQuanLy);
      this.setState("hopDongList", hopDong);
      this.setState("loaiChungTuList", loaiChungTu);
      this.setState("loaiGiaoDichList", loaiGiaoDich);
      this.setState("masterDataLoaded", true);
    } catch (error) {
      console.error("Error loading master data:", error);
    } finally {
      this.setState("masterDataLoading", false);
    }
  }
}
