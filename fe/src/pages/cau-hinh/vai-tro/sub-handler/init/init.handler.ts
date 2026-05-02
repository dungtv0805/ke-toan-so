import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { VaiTroItem } from "../../components/table/VaiTroTable.state";
import "./init.event";

const mockRoles: VaiTroItem[] = [
  { id: "1", ten: "Giám đốc", moTa: "Quản lý toàn bộ hệ thống", soNguoiDung: 2, trangThai: "HOAT_DONG" },
  { id: "2", ten: "Kế toán trưởng", moTa: "Quản lý kế toán", soNguoiDung: 3, trangThai: "HOAT_DONG" },
  { id: "3", ten: "Kế toán quỹ", moTa: "Quản lý thu chi", soNguoiDung: 5, trangThai: "HOAT_DONG" },
  { id: "4", ten: "Kế toán công nợ", moTa: "Quản lý công nợ", soNguoiDung: 4, trangThai: "HOAT_DONG" },
  { id: "5", ten: "Kế toán tổng hợp", moTa: "Tổng hợp báo cáo", soNguoiDung: 2, trangThai: "HOAT_DONG" },
  { id: "6", ten: "Quản lý", moTa: "Quản lý phòng ban", soNguoiDung: 3, trangThai: "HOAT_DONG" },
  { id: "7", ten: "Kiểm soát", moTa: "Kiểm soát nội bộ", soNguoiDung: 1, trangThai: "HOAT_DONG" },
];

@RegisterHandler("vai-tro-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    this.setState("loading", true);
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);
    this.setState("vaiTroList", mockRoles);
    this.setState("loading", false);
  }
}
