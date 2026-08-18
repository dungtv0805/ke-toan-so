import { BaseEvents } from "@/common";

export interface DeleteBatchParams {
  ids: string[];
  /**
   * Số phiếu của các bút toán được chọn — cần để gỡ liên kết hóa đơn của những
   * chứng từ đã hết sạch bút toán. Nơi gọi có sẵn danh sách dòng đã chọn.
   */
  soPhieuList?: string[];
}

export interface DeleteBatchEvent extends BaseEvents {
  deleteBatch: { params: DeleteBatchParams; result: void };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends DeleteBatchEvent {}
}
