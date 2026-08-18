import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { nhatKyChungService, CreateEntryDto, BatchItemDto } from "@/services/nhatKyChungService";
import { bangKeMuaVaoService, bangKeBanRaService } from "@/services/taxService";
import { message, Modal } from "antd";
import dayjs from "dayjs";
import { v4 as uuidv4 } from "uuid";
import "./submit.event";
import { NhatKyChungFormStates, NhatKyChungFormEvents } from "../../nhat-ky-chung-form.handler";
import { ChungTuHeader, ChungTuChiTiet, TaiKhoanItem } from "../init/init.state";
import { DanhMuc, LoaiChungTu, LoaiGiaoDich } from "@/types";
import { validateFieldRules, formatViolation } from "../../../fieldRulesValidation";
import { dungDongNhap, timHoaDonCanGoLienKet, HoaDonDangGan } from "../../../hoaDonLienKet";

@RegisterHandler("nhat-ky-chung-form")
export class SubmitFormHandler extends CSubHanlder<NhatKyChungFormEvents, NhatKyChungFormStates> {
  @HandlerDecorator("validateForm")
  async validateForm(): Promise<{ valid: boolean; errors: string[] }> {
    const header = this.getState("header") as ChungTuHeader | null;
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
    const errors: string[] = [];

    // Validate header
    if (!header?.ngay) {
      errors.push("Vui lòng chọn ngày chứng từ");
    }

    if (!header?.loaiGiaoDich) {
      errors.push("Vui lòng chọn loại giao dịch");
    }

    // Validate chi tiết
    if (chiTietList.length === 0) {
      errors.push("Vui lòng thêm ít nhất 1 dòng chi tiết");
    }

    chiTietList.forEach((item, index) => {
      if (!item.nghiepVu) {
        errors.push(`Dòng ${index + 1}: Vui lòng chọn nghiệp vụ`);
      }
      if (!item.taiKhoanNo) {
        errors.push(`Dòng ${index + 1}: Vui lòng chọn TK Nợ`);
      }
      if (!item.taiKhoanCo) {
        errors.push(`Dòng ${index + 1}: Vui lòng chọn TK Có`);
      }
      if (!item.soTien || item.soTien <= 0) {
        errors.push(`Dòng ${index + 1}: Số tiền phải lớn hơn 0`);
      }
    });

    return { valid: errors.length === 0, errors };
  }

  @HandlerDecorator("submitForm")
  async submitForm(): Promise<void> {
    // Validate first
    const validation = await this.executeEvent("validateForm", {});
    if (!validation.valid) {
      validation.errors.forEach((err) => message.error(err));
      return;
    }

    // Kiểm tra quy tắc nhập liệu theo cấu hình tài khoản (fieldRules)
    const chiTietForRules = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
    const taiKhoanForRules = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];
    const ruleViolations = validateFieldRules(chiTietForRules, taiKhoanForRules);
    const blocking = ruleViolations.filter((v) => v.level === "BAT_BUOC");
    if (blocking.length > 0) {
      blocking.forEach((v) => message.error(formatViolation(v)));
      return;
    }
    const warnings = ruleViolations.filter((v) => v.level === "CANH_BAO");
    if (warnings.length > 0) {
      const proceed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: "Cảnh báo thiếu thông tin",
          content: warnings.map((v) => formatViolation(v)).join("; "),
          okText: "Vẫn lưu",
          cancelText: "Quay lại",
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });
      if (!proceed) return;
    }

    const header = this.getState("header") as ChungTuHeader;
    const chiTietList = (this.getState("chiTietList") as ChungTuChiTiet[]) || [];
    const isEditing = this.getState("isEditing") as boolean;

    this.setState("submitting", true);

    try {
      // Determine loai (PHIEU_THU or PHIEU_CHI) from loaiGiaoDich
      const loai: LoaiChungTu = header.loaiGiaoDich === "PHIEU_CHI" || header.loaiGiaoDich === "BAO_NO"
        ? "PHIEU_CHI"
        : "PHIEU_THU";

      if (isEditing && header.soPhieu) {
        // Build items for batch update with id tracking
        const items: BatchItemDto[] = chiTietList.map((ct) => ({
          id: ct.id, // Include id for existing items (undefined for new)
          loai,
          ngay: header.ngay.format("YYYY-MM-DD"),
          ngayGhiSo: (header.ngayGhiSo || header.ngay).format("YYYY-MM-DD"),
          soTien: ct.soTien,
          noiDung: ct.noiDung || header.dienGiaiChung || "",
          soTaiKhoan: ct.soTaiKhoan,
          nguoiGiaoDich: header.nguoiGiaoDich,
          diaChi: header.diaChi,
          ghiChu: header.ghiChu,
          danhMuc: this.buildDanhMuc(ct, header),
        }));

        // Update batch
        await nhatKyChungService.updateBatch(header.soPhieu, items);
        await this.ghiHoaDonAnToan(header.soPhieu, header);
        message.success("Cập nhật chứng từ thành công");
      } else {
        // Build items for batch create (no id needed)
        const items: CreateEntryDto[] = chiTietList.map((ct) => ({
          loai,
          ngay: header.ngay.format("YYYY-MM-DD"),
          ngayGhiSo: (header.ngayGhiSo || header.ngay).format("YYYY-MM-DD"),
          soTien: ct.soTien,
          noiDung: ct.noiDung || header.dienGiaiChung || "",
          soTaiKhoan: ct.soTaiKhoan,
          nguoiGiaoDich: header.nguoiGiaoDich,
          diaChi: header.diaChi,
          ghiChu: header.ghiChu,
          danhMuc: this.buildDanhMuc(ct, header),
        }));

        // Create batch
        const created = await nhatKyChungService.createBatch(items);
        const soPhieuMoi = created[0]?.soPhieu;
        if (soPhieuMoi) {
          await this.ghiHoaDonAnToan(soPhieuMoi, header);
        } else if ((header.hoaDon || []).length > 0) {
          console.error("tao chung tu khong tra ve so phieu, khong the gan hoa don", created);
          message.error(
            "Chứng từ đã tạo, nhưng không xác định được số phiếu nên chưa gắn được hóa đơn. Mở lại chứng từ và lưu lần nữa.",
          );
        }
        message.success("Tạo chứng từ thành công");
      }

      // Navigate back
      window.history.back();
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Có lỗi xảy ra");
    } finally {
      this.setState("submitting", false);
    }
  }

  /**
   * Ghi liên kết hóa đơn SAU KHI chứng từ đã lưu — chứng từ mới chưa có số phiếu
   * trước đó. Hai lần ghi vào hai service khác nhau, không có transaction chung:
   * hỏng bước này thì KHÔNG rollback chứng từ, báo để người nhập bấm lưu lại.
   *
   * Trước khi gắn/tạo, đọc lại từ SERVER (nguồn sự thật) những hóa đơn đang
   * thật sự gắn với số phiếu này. Hóa đơn nào đã bị bỏ chip khỏi ô trên form
   * (không còn trong `header.hoaDon`) thì gỡ liên kết — spec §5.4: bỏ chip →
   * dòng bảng kê về `soChungTu` rỗng, dòng vẫn còn.
   */
  private async ghiHoaDon(soPhieu: string, header: ChungTuHeader): Promise<void> {
    const hoaDon = header.hoaDon || [];

    const [muaMap, banMap] = await Promise.all([
      bangKeMuaVaoService.layTheoSoChungTu([soPhieu]),
      bangKeBanRaService.layTheoSoChungTu([soPhieu]),
    ]);
    const dangGanOServer: HoaDonDangGan[] = [
      ...(muaMap[soPhieu] || []).map((r) => ({ id: r.id, soHoaDon: r.soHoaDon, loai: "mua" as const })),
      ...(banMap[soPhieu] || []).map((r) => ({ id: r.id, soHoaDon: r.soHoaDon, loai: "ban" as const })),
    ];
    const canGoLienKet = timHoaDonCanGoLienKet(dangGanOServer, hoaDon);

    const doiTuong = (this.getState("chiTietList") as ChungTuChiTiet[])?.find(
      (ct) => ct.doiTuongSnapshot,
    );
    const doiTuongTen = doiTuong?.doiTuongSnapshot?.ten as string | undefined;
    const doiTuongMst = doiTuong?.doiTuongSnapshot?.maSoThue as string | undefined;

    type ThaoTac = { soHoaDon: string; chay: () => Promise<unknown> };

    const thaoTacGan: ThaoTac[] = hoaDon.map((hd) => {
      const service = hd.loai === "mua" ? bangKeMuaVaoService : bangKeBanRaService;
      return {
        soHoaDon: hd.soHoaDon,
        chay: () =>
          hd.id
            ? service.ganChungTu(hd.id, soPhieu)
            : service.create(
                dungDongNhap({
                  soHoaDon: hd.soHoaDon,
                  loai: hd.loai,
                  ngayChungTu: header.ngay.format("YYYY-MM-DD"),
                  soChungTu: soPhieu,
                  doiTuongTen,
                  doiTuongMst,
                }),
              ),
      };
    });

    const thaoTacGo: ThaoTac[] = canGoLienKet.map((hd) => ({
      soHoaDon: hd.soHoaDon,
      chay: () => (hd.loai === "mua" ? bangKeMuaVaoService : bangKeBanRaService).goLienKet(hd.id),
    }));

    const tatCa = [...thaoTacGan, ...thaoTacGo];
    if (!tatCa.length) return;

    const ketQua = await Promise.allSettled(tatCa.map((t) => t.chay()));
    const loi = ketQua
      .map((k, i) => (k.status === "rejected" ? tatCa[i].soHoaDon : null))
      .filter((s): s is string => s !== null);

    if (loi.length) {
      throw new Error(`hóa đơn ${loi.join(", ")}`);
    }
  }

  /** Bọc ghiHoaDon: hỏng thì báo rõ chứng từ ĐÃ lưu, không ném tiếp. */
  private async ghiHoaDonAnToan(soPhieu: string, header: ChungTuHeader): Promise<void> {
    try {
      await this.ghiHoaDon(soPhieu, header);
    } catch (e) {
      console.error("gan hoa don that bai", e);
      const chiTiet = e instanceof Error && e.message ? ` (${e.message})` : "";
      message.error(
        `Chứng từ ${soPhieu} đã lưu, nhưng chưa gắn được hóa đơn${chiTiet}. Mở lại chứng từ và lưu lần nữa.`,
      );
    }
  }

  @HandlerDecorator("resetForm")
  async resetForm(): Promise<void> {
    this.setState("header", {
      ngay: dayjs(),
      ngayGhiSo: dayjs(),
      loaiGiaoDich: undefined,
      loai: undefined,
      loaiTen: undefined,
      dienGiaiChung: "",
      nguoiGiaoDich: "",
      diaChi: "",
      ghiChu: "",
    });

    this.setState("chiTietList", [
      {
        key: uuidv4(),
        taiKhoanNo: "",
        taiKhoanCo: "",
        soTien: 0,
        noiDung: "",
        nghiepVu: undefined,
        nghiepVuTen: undefined,
      },
    ]);

    this.setState("isEditing", false);
    this.setState("cloneFromSoPhieu", null);
  }

  private buildDanhMuc(chiTiet: ChungTuChiTiet, header: ChungTuHeader): DanhMuc {
    const taiKhoanList = (this.getState("taiKhoanList") as TaiKhoanItem[]) || [];
    const loaiGiaoDichList = (this.getState("loaiGiaoDichList") as LoaiGiaoDich[]) || [];

    const danhMuc: DanhMuc = {};

    // Tài khoản Nợ
    if (chiTiet.taiKhoanNo) {
      const tkNo = taiKhoanList.find((tk) => tk.ma === chiTiet.taiKhoanNo);
      danhMuc.taiKhoanNo = {
        ma: chiTiet.taiKhoanNo,
        ten: tkNo?.ten || "",
        loai: tkNo?.loai || "",
        nhom: tkNo?.nhom || "",
      };
    }

    // Tài khoản Có
    if (chiTiet.taiKhoanCo) {
      const tkCo = taiKhoanList.find((tk) => tk.ma === chiTiet.taiKhoanCo);
      danhMuc.taiKhoanCo = {
        ma: chiTiet.taiKhoanCo,
        ten: tkCo?.ten || "",
        loai: tkCo?.loai || "",
        nhom: tkCo?.nhom || "",
      };
    }

    // Loại giao dịch từ header - lấy tên từ loaiGiaoDichList
    if (header.loaiGiaoDich) {
      const loaiGD = loaiGiaoDichList.find((lgd) => lgd.ma === header.loaiGiaoDich);
      danhMuc.loaiGiaoDich = {
        ma: header.loaiGiaoDich,
        ten: loaiGD?.ten || header.loaiGiaoDich,
      };
    }

    // Nghiệp vụ từ chi tiết
    if (chiTiet.nghiepVu) {
      danhMuc.nghiepVu = {
        ma: chiTiet.nghiepVu,
        ten: chiTiet.nghiepVuTen || chiTiet.nghiepVu,
      };
    }

    // Snapshots from chi tiết
    if (chiTiet.doiTuongSnapshot) {
      danhMuc.doiTuong = chiTiet.doiTuongSnapshot as DanhMuc["doiTuong"];
    }
    if (chiTiet.doiTuong2Snapshot) {
      danhMuc.doiTuong2 = chiTiet.doiTuong2Snapshot as DanhMuc["doiTuong2"];
    }
    if (chiTiet.duAnSnapshot) {
      danhMuc.duAn = chiTiet.duAnSnapshot as DanhMuc["duAn"];
    }
    if (chiTiet.boPhanSnapshot) {
      danhMuc.boPhan = chiTiet.boPhanSnapshot as DanhMuc["boPhan"];
    }
    if (chiTiet.doiSnapshot) {
      danhMuc.doi = chiTiet.doiSnapshot as DanhMuc["doi"];
    }
    if (chiTiet.nhanVienSnapshot) {
      danhMuc.nhanVien = chiTiet.nhanVienSnapshot as DanhMuc["nhanVien"];
    }
    if (chiTiet.sanPhamSnapshot) {
      danhMuc.sanPham = chiTiet.sanPhamSnapshot as DanhMuc["sanPham"];
    }
    if (chiTiet.dongTienSnapshot) {
      danhMuc.dongTien = chiTiet.dongTienSnapshot as DanhMuc["dongTien"];
    }
    if (chiTiet.nhomKhuyenMaiSnapshot) {
      danhMuc.nhomKhuyenMai = chiTiet.nhomKhuyenMaiSnapshot as DanhMuc["nhomKhuyenMai"];
    }
    if (chiTiet.nhomQuanLySnapshot) {
      danhMuc.nhomQuanLy = chiTiet.nhomQuanLySnapshot as DanhMuc["nhomQuanLy"];
    }
    if (chiTiet.khoanMucSnapshot) {
      danhMuc.khoanMuc = chiTiet.khoanMucSnapshot as DanhMuc["khoanMuc"];
    }
    if (chiTiet.hopDongSnapshot) {
      danhMuc.hopDong = chiTiet.hopDongSnapshot as DanhMuc["hopDong"];
    }

    return danhMuc;
  }
}
