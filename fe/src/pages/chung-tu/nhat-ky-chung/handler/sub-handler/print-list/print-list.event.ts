import { BaseEvents } from "@/common";

export interface PrintListEvent extends BaseEvents {
  printList: {
    params: {
      tenCongTy?: string;
      /** Key cột đang hiện trên bảng, đúng thứ tự — bản in bám theo. */
      cot?: string[];
    };
    result: void;
  };
}

declare module "../../nhat-ky-chung.handler" {
  interface NhatKyChungEvents extends PrintListEvent {}
}
