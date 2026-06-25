import { ChungTuChiTiet, TaiKhoanItem } from "../../init/init.state";
import { QuyChuan, DoiTuong, TaiKhoan } from "@/types";
import { buildDoiTuongSnapshot } from "@/utils/snapshotBuilder";

/** Điền nghiệp vụ vào 1 dòng + auto-fill TK Nợ/Có/nội dung từ quy chuẩn (đồng nhất handleNghiepVuChange). */
export function applyNghiepVu(item: ChungTuChiTiet, quyChuan: QuyChuan): ChungTuChiTiet {
  return {
    ...item,
    nghiepVu: quyChuan.nghiepVu,
    nghiepVuTen: quyChuan.nghiepVu,
    taiKhoanNo: quyChuan.taiKhoanNo || item.taiKhoanNo,
    taiKhoanCo: quyChuan.taiKhoanCo || item.taiKhoanCo,
    noiDung: quyChuan.moTa || item.noiDung,
  };
}

/** Map tài khoản vừa tạo về đúng shape TaiKhoanItem dùng trong dropdown của bảng. */
export function toTaiKhoanItem(tk: TaiKhoan): TaiKhoanItem {
  return {
    ma: tk.ma,
    ten: tk.ten,
    loai: tk.loai,
    nhom: tk.nhom,
    chiTietTheo: tk.chiTietTheo ?? undefined,
    fieldRules: (tk.fieldRules ?? null) as TaiKhoanItem["fieldRules"],
  };
}

export function quickAddQuyChuanReducer(input: {
  chiTietList: ChungTuChiTiet[];
  quyChaunList: QuyChuan[];
  key: string;
  created: QuyChuan;
}): { chiTietList: ChungTuChiTiet[]; quyChaunList: QuyChuan[] } {
  const quyChaunList = [...input.quyChaunList, input.created];
  const chiTietList = input.chiTietList.map((item) =>
    item.key === input.key ? applyNghiepVu(item, input.created) : item
  );
  return { chiTietList, quyChaunList };
}

export function quickAddDoiTuongReducer(input: {
  chiTietList: ChungTuChiTiet[];
  doiTuongList: DoiTuong[];
  key: string;
  field: "doiTuongId" | "doiTuong2Id";
  created: DoiTuong;
}): { chiTietList: ChungTuChiTiet[]; doiTuongList: DoiTuong[] } {
  const doiTuongList = [...input.doiTuongList, input.created];
  const snapshotField = input.field === "doiTuongId" ? "doiTuongSnapshot" : "doiTuong2Snapshot";
  const chiTietList = input.chiTietList.map((item) =>
    item.key === input.key
      ? { ...item, [input.field]: input.created.id, [snapshotField]: buildDoiTuongSnapshot(input.created) }
      : item
  );
  return { chiTietList, doiTuongList };
}

export function quickAddTaiKhoanReducer(input: {
  chiTietList: ChungTuChiTiet[];
  taiKhoanList: TaiKhoanItem[];
  key: string;
  field: "taiKhoanNo" | "taiKhoanCo";
  created: TaiKhoan;
}): { chiTietList: ChungTuChiTiet[]; taiKhoanList: TaiKhoanItem[] } {
  const taiKhoanList = [...input.taiKhoanList, toTaiKhoanItem(input.created)];
  const chiTietList = input.chiTietList.map((item) =>
    item.key === input.key ? { ...item, [input.field]: input.created.ma } : item
  );
  return { chiTietList, taiKhoanList };
}
