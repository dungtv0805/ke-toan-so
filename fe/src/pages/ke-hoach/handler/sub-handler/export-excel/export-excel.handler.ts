import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import dayjs from "dayjs";
import { exportToExcel, type ExcelColumn } from "@/utils/exportExcel";
import { keHoachService, type KeHoachDong, type LoaiKeHoach } from "@/services/keHoachService";
import type { KeHoachEvents, KeHoachStates } from "../../ke-hoach.handler";
import { buildFilters } from "../../../lib/keHoachFilters";
import { nhomKhoanMucCua, type MucDanhMuc } from "../../../lib/keHoachRow";
import "./export-excel.event";

/** Cột file xuất — đúng 17 cột của lưới, thêm Phiên bản để biết dòng thuộc bản nào. */
const EXCEL_COLUMNS: ExcelColumn[] = [
  { header: "Ngày phát sinh", dataKey: "ngay", width: 16 },
  { header: "Phiên bản", dataKey: "phienBan", width: 18 },
  { header: "Nghiệp vụ", dataKey: "nghiepVu", width: 20 },
  { header: "Diễn giải", dataKey: "noiDung", width: 30 },
  { header: "TK Nợ", dataKey: "taiKhoanNo", width: 10 },
  { header: "TK Có", dataKey: "taiKhoanCo", width: 10 },
  { header: "Số tiền", dataKey: "soTien", width: 15 },
  { header: "ĐT Nợ", dataKey: "doiTuong", width: 20 },
  { header: "ĐT Có", dataKey: "doiTuong2", width: 20 },
  { header: "Chủ đầu tư", dataKey: "chuDauTu", width: 20 },
  { header: "Dự án", dataKey: "duAn", width: 20 },
  { header: "Sản phẩm", dataKey: "sanPham", width: 20 },
  { header: "Bộ phận", dataKey: "boPhan", width: 16 },
  { header: "Đội", dataKey: "doi", width: 14 },
  { header: "Nhân viên", dataKey: "nhanVien", width: 16 },
  { header: "Dòng tiền", dataKey: "dongTien", width: 16 },
  { header: "Khoản mục", dataKey: "khoanMuc", width: 18 },
  { header: "Nhóm khoản mục", dataKey: "nhomKhoanMuc", width: 18 },
  { header: "Nhóm quản lý", dataKey: "nhomQuanLy", width: 16 },
];

/** Lấy hết dòng khớp bộ lọc (API phân trang) — giống cách xuất của bảng bút toán. */
async function layTatCa(
  filters: ReturnType<typeof buildFilters>,
): Promise<KeHoachDong[]> {
  const all: KeHoachDong[] = [];
  let page = 1;
  for (;;) {
    const res = await keHoachService.getEntries({ ...filters, page, limit: 200 });
    all.push(...res.data);
    if (page >= (res.meta?.totalPages ?? 1) || res.data.length === 0) break;
    page += 1;
  }
  return all;
}

@RegisterHandler("ke-hoach")
export class KeHoachExportHandler extends CSubHanlder<KeHoachEvents, KeHoachStates> {
  @HandlerDecorator("xuatExcel")
  async xuatExcel(): Promise<void> {
    try {
      const filters = buildFilters((key) => this.getState(key));
      const rows = await layTatCa(filters);
      if (!rows.length) {
        message.warning("Không có dòng kế hoạch nào để xuất");
        return;
      }

      const nhomKhoanMucList = (this.getState("nhomKhoanMucList") ?? []) as MucDanhMuc[];
      const laDuBao = (this.getState("loaiKeHoach") as LoaiKeHoach) === "DU_BAO";

      await exportToExcel({
        title: laDuBao ? "DỰ BÁO" : "KẾ HOẠCH",
        sheetName: laDuBao ? "DuBao" : "KeHoach",
        fileName: `${laDuBao ? "du-bao" : "ke-hoach"}-${dayjs().format("YYYYMMDD-HHmm")}.xlsx`,
        columns: EXCEL_COLUMNS,
        data: rows.map((r) => ({
          ngay: dayjs(r.ngay).format("DD/MM/YYYY"),
          phienBan: r.phienBan ?? "",
          nghiepVu: r.danhMuc?.nghiepVu?.ten ?? "",
          noiDung: r.noiDung ?? "",
          taiKhoanNo: r.danhMuc?.taiKhoanNo?.ma ?? "",
          taiKhoanCo: r.danhMuc?.taiKhoanCo?.ma ?? "",
          soTien: r.soTien ?? 0,
          doiTuong: r.danhMuc?.doiTuong?.ten ?? "",
          doiTuong2: r.danhMuc?.doiTuong2?.ten ?? "",
          chuDauTu: r.danhMuc?.chuDauTu?.ten ?? r.danhMuc?.duAn?.chuDauTuTen ?? "",
          duAn: r.danhMuc?.duAn?.ten ?? "",
          sanPham: r.danhMuc?.sanPham?.ten ?? "",
          boPhan: r.danhMuc?.boPhan?.ten ?? "",
          doi: r.danhMuc?.doi?.ten ?? "",
          nhanVien: r.danhMuc?.nhanVien?.ten ?? "",
          dongTien: r.danhMuc?.dongTien?.ten ?? "",
          khoanMuc: r.danhMuc?.khoanMuc?.ten ?? "",
          nhomKhoanMuc: nhomKhoanMucCua(r.danhMuc, nhomKhoanMucList),
          nhomQuanLy: r.danhMuc?.nhomQuanLy?.ten ?? "",
        })),
      });
      message.success(`Đã xuất ${rows.length} dòng`);
    } catch (error) {
      console.error("Lỗi xuất Excel kế hoạch:", error);
      message.error("Không xuất được file Excel");
    }
  }
}
