import { BaseEvents } from "@/common";

export interface SubmitImportEvent extends BaseEvents {
  submitImport: {
    params: {
      /**
       * Gọi khi có bản ghi được tạo — cả khi import thành công toàn phần lẫn một phần —
       * để trang cha (đứng sau modal) nạp lại bảng dữ liệu.
       */
      onImported?: () => void;
      /**
       * CHỈ gọi khi import thành công toàn phần (không còn dòng lỗi nào). Dùng để đóng modal;
       * KHÔNG gọi khi import một phần vì khi đó modal phải ở lại cho người dùng xem/sửa lỗi.
       */
      onSuccess?: () => void;
    };
    result: void;
  };
}

declare module "../../import.handler" {
  interface ImportDanhMucEvents extends SubmitImportEvent {}
}
