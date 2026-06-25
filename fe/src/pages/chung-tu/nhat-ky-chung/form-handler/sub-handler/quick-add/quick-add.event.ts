import { BaseEvents } from "@/common";

export interface QuickAddFormEvent extends BaseEvents {
  quickCreateQuyChuan: {
    params: { key: string; loaiGiaoDich: string; nghiepVu: string; taiKhoanNo: string; taiKhoanCo: string; moTa?: string };
    result: { ok: boolean };
  };
  quickCreateDoiTuong: {
    params: { key: string; field: "doiTuongId" | "doiTuong2Id"; loai: string[]; ma: string; ten: string };
    result: { ok: boolean };
  };
  quickCreateTaiKhoan: {
    params: { key: string; field: "taiKhoanNo" | "taiKhoanCo"; ma: string; ten: string; loai: string; nhom: string; capDo: number; chiTietTheo?: string };
    result: { ok: boolean };
  };
}

declare module "../../nhat-ky-chung-form.handler" {
  interface NhatKyChungFormEvents extends QuickAddFormEvent {}
}
