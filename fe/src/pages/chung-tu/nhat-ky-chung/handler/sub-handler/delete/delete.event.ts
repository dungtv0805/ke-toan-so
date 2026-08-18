import { BaseEvents } from "@/common";

export interface DeleteEntryParams {
  id: string;
  /** Số phiếu của bút toán bị xóa — cần để biết chứng từ đã hết dòng hay chưa. */
  soPhieu: string;
}

export interface DeleteEvent extends BaseEvents {
  deleteEntry: { params: DeleteEntryParams; result: void };
}

declare module "../../../handler/nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends DeleteEvent {}
}
