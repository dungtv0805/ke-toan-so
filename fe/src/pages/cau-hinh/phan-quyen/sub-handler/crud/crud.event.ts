import { BaseEvents } from "@/common";
import { NguoiDung } from "@/types";

export interface CrudEvent extends BaseEvents {
  createNguoiDung: { params: Omit<NguoiDung, "id">; result: NguoiDung };
  addExistingUser: { params: { userId: string; vaiTro: string }; result: NguoiDung };
  updateNguoiDung: { params: { id: string; data: Partial<NguoiDung> }; result: NguoiDung };
  deleteNguoiDung: { params: { id: string }; result: void };
  openModal: { params: { record?: NguoiDung }; result: void };
  closeModal: { params: Record<string, never>; result: void };
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenEvents extends CrudEvent {}
}
