import { v4 as uuidv4 } from "uuid";
import type { KeHoachPayload, LoaiKeHoach } from "@/services/keHoachService";
import {
  loiCuaDong,
  toPayload,
  type DanhMucLists,
  type RowValues,
} from "../../lib/keHoachRow";

/** Một dòng trong bảng nhập lô — RowValues + khóa dòng trên UI. */
export interface DongKeHoach extends RowValues {
  key: string;
}

export interface QuyChuanGoiY {
  nghiepVu: string;
  taiKhoanNo: string;
  taiKhoanCo: string;
  moTa?: string;
}

export function dongMoi(ngayMacDinh?: string): DongKeHoach {
  return { key: uuidv4(), ngay: ngayMacDinh, soTien: 0, noiDung: "" };
}

export function nhanBan(dong: DongKeHoach): DongKeHoach {
  return { ...dong, key: uuidv4() };
}

export function capNhat(
  list: DongKeHoach[],
  key: string,
  patch: Partial<DongKeHoach>,
): DongKeHoach[] {
  return list.map((d) => (d.key === key ? { ...d, ...patch } : d));
}

/**
 * Chọn nghiệp vụ → lấy TK Nợ/Có và diễn giải từ Quy chuẩn hạch toán, nhưng KHÔNG
 * ghi đè thứ người dùng đã tự nhập.
 */
export function apDungQuyChuan(
  dong: DongKeHoach,
  nghiepVu: string | undefined,
  quyChuanList: QuyChuanGoiY[],
): DongKeHoach {
  const sau: DongKeHoach = { ...dong, nghiepVu };
  if (!nghiepVu) return sau;
  const qc = quyChuanList.find((q) => q.nghiepVu === nghiepVu);
  if (!qc) return sau;
  if (!sau.taiKhoanNo) sau.taiKhoanNo = qc.taiKhoanNo || undefined;
  if (!sau.taiKhoanCo) sau.taiKhoanCo = qc.taiKhoanCo || undefined;
  if (!sau.noiDung) sau.noiDung = qc.moTa ?? "";
  return sau;
}

/** Lỗi của cả lô, nêu rõ số thứ tự dòng để người dùng dò được trên bảng. */
export function loiCuaLo(list: DongKeHoach[]): string[] {
  if (!list.length) return ["Chưa có dòng kế hoạch nào"];
  const loi: string[] = [];
  list.forEach((dong, i) => {
    const l = loiCuaDong(dong);
    if (l) loi.push(`Dòng ${i + 1}: ${l}`);
  });
  return loi;
}

export function toPayloads(
  list: DongKeHoach[],
  lists: DanhMucLists,
  loaiKeHoach: LoaiKeHoach,
  phienBan?: string,
): KeHoachPayload[] {
  return list.map((dong) => toPayload(dong, lists, loaiKeHoach, phienBan));
}
