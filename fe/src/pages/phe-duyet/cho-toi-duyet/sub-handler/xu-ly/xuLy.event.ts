import { BaseEvents } from "@/common";

export interface XuLyEvent extends BaseEvents {
  xuLyPheDuyet: {
    params: { id: string; hanhDong: "DUYET" | "TRA_LAI" | "TU_CHOI"; yKien?: string };
    result: boolean;
  };
}

declare module "../../choToiDuyetHandler" {
  interface ChoToiDuyetEvents extends XuLyEvent {}
}
