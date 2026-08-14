import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { hopDongService } from "@/services/hopDongService";
import { doiTuongService } from "@/services/doiTuongService";
import { sanPhamService } from "@/services/sanPhamService";
import { hoaDonBanRaService } from "@/services/hoaDonBanRaService";
import { gomSoHoaDonTheoHopDong } from "../../../soHoaDon";
import "./init.event";

@RegisterHandler("hop-dong")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    try {
      // Fetch hop-dong list and doi-tuong list concurrently
      // `doiTuongAll` (mọi loại) chỉ để tra mã/tên cho cột hiển thị: hợp đồng cũ có thể
      // trỏ tới đối tượng không mang loại KHÁCH HÀNG, tra trong danh sách lọc sẽ ra "-".
      // Hai nguồn phụ (đối tượng đầy đủ, sổ hóa đơn) hỏng thì bảng vẫn phải lên.
      const [hopDongResult, doiTuongList, stats, sanPhamList, doiTuongAll, hoaDonList] =
        await Promise.all([
          hopDongService.getPaginated({ page: 1, limit: 50 }),
          doiTuongService.getByLoai("KHACH_HANG"),
          hopDongService.getStats(),
          sanPhamService.getAll(),
          doiTuongService.getAll().catch(() => []),
          hoaDonBanRaService.getList().catch(() => []),
        ]);

      const doiTuongMap: Record<string, { ma: string; ten: string }> = {};
      for (const dt of [...doiTuongList, ...doiTuongAll]) {
        doiTuongMap[dt.id] = { ma: dt.ma, ten: dt.ten };
      }

      this.setState("data", hopDongResult.data);
      this.setState("pagination", {
        current: hopDongResult.meta.page,
        pageSize: hopDongResult.meta.limit,
        total: hopDongResult.meta.total,
      });
      this.setState("doiTuongList", doiTuongList);
      this.setState("doiTuongMap", doiTuongMap);
      this.setState("hoaDonMap", gomSoHoaDonTheoHopDong(hoaDonList));
      this.setState("sanPhamList", sanPhamList);
      this.setState("stats", stats);
      this.setState("searchKeyword", "");
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      this.setState("loading", false);
    }
  }

  @HandlerDecorator("refresh")
  async refresh(): Promise<void> {
    this.setState("loading", true);
    try {
      const pagination = this.getState("pagination") || { current: 1, pageSize: 50, total: 0 };
      const searchKeyword = this.getState("searchKeyword") || "";

      const [result, stats, hoaDonList] = await Promise.all([
        hopDongService.getPaginated({
          page: pagination.current,
          limit: pagination.pageSize,
          search: searchKeyword || undefined,
        }),
        hopDongService.getStats(),
        hoaDonBanRaService.getList().catch(() => []),
      ]);

      this.setState("data", result.data);
      this.setState("hoaDonMap", gomSoHoaDonTheoHopDong(hoaDonList));
      this.setState("pagination", {
        current: result.meta.page,
        pageSize: result.meta.limit,
        total: result.meta.total,
      });
      this.setState("stats", stats);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      this.setState("loading", false);
    }
  }
}
