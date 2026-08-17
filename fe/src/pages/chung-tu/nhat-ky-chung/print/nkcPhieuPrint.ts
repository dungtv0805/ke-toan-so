import type { ChungTu, LoaiChungTu, NhatKyChung } from "@/types";
import { phieuTemplateService } from "@/services/phieuTemplateService";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { printPhieu } from "../../phieu/lib/printPhieu";
import { getDefaultTemplate } from "../../phieu/lib/printTemplates";
import { toPhieuLines, type PhieuLine } from "../../phieu/lib/phieuLines";

/**
 * In MỘT bút toán theo mẫu phiếu thu / phiếu chi. Dùng chung cho nút "In" ở cột
 * Chức năng và nút "In phiếu" trong modal xem chi tiết.
 */

/** Loại phiếu mặc định khi in: theo chính bút toán (không có thì coi là phiếu thu). */
export const loaiPhieuCuaButToan = (entry: NhatKyChung): LoaiChungTu =>
  entry.loaiChungTu === "Phiếu chi" ? "PHIEU_CHI" : "PHIEU_THU";

export async function printNkcEntry(
  entry: NhatKyChung,
  loai: LoaiChungTu,
  tenCongTy: string,
): Promise<void> {
  let template: string;
  try {
    const tpl = await phieuTemplateService.getByLoai(loai);
    template = tpl?.html || getDefaultTemplate(loai);
  } catch {
    template = getDefaultTemplate(loai);
  }

  const danhMuc = entry.danhMuc;
  const phieu = {
    soPhieu: entry.soPhieu,
    ngay: entry.ngay,
    nguoiGiaoDich: entry.nguoiGiaoDich,
    diaChi: entry.diaChi,
    noiDung: entry.dienGiai,
    soTien: entry.soTien,
    ghiChu: entry.ghiChu,
    danhMuc: {
      taiKhoanNo: { ma: entry.taiKhoanNo ?? danhMuc?.taiKhoanNo?.ma },
      taiKhoanCo: { ma: entry.taiKhoanCo ?? danhMuc?.taiKhoanCo?.ma },
    },
  } as unknown as ChungTu;

  // Một dòng bút toán chỉ là một phần của chứng từ — nạp đủ các dòng cùng số phiếu
  // để phiếu in ra có bảng chi tiết và số tiền là TỔNG, không phải mỗi dòng này.
  let dong: PhieuLine[] | undefined;
  try {
    const records = await nhatKyChungService.getBySoPhieu(entry.soPhieu);
    if (records.length > 0) dong = toPhieuLines(records);
  } catch (e) {
    console.error("Error loading voucher lines for print:", e);
  }

  printPhieu(phieu, template, { tenCongTy, diaChiCongTy: "" }, dong);
}
