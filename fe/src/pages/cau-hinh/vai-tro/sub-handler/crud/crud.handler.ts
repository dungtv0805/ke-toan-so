import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { VaiTroItem } from "../../components/table/VaiTroTable.state";
import { message } from "antd";
import "./crud.event";

@RegisterHandler("vai-tro-context")
export class CrudHandler extends CSubHanlder {
  @HandlerDecorator("createVaiTro")
  async createVaiTro(params: {
    ten: string;
    moTa: string;
    trangThai: "HOAT_DONG" | "KHOA";
  }): Promise<void> {
    const currentList = (this.getState("vaiTroList") as VaiTroItem[]) || [];
    const maxId = currentList.reduce(
      (max, item) => Math.max(max, Number(item.id)),
      0
    );

    const newItem: VaiTroItem = {
      id: String(maxId + 1),
      ten: params.ten,
      moTa: params.moTa,
      soNguoiDung: 0,
      trangThai: params.trangThai,
    };

    this.setState("vaiTroList", [...currentList, newItem]);
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);
    message.success("Thêm vai trò thành công!");
  }

  @HandlerDecorator("updateVaiTro")
  async updateVaiTro(params: {
    id: string;
    data: Partial<VaiTroItem>;
  }): Promise<void> {
    const currentList = (this.getState("vaiTroList") as VaiTroItem[]) || [];
    const updatedList = currentList.map((item) =>
      item.id === params.id ? { ...item, ...params.data } : item
    );

    this.setState("vaiTroList", updatedList);
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);
    message.success("Cập nhật vai trò thành công!");
  }

  @HandlerDecorator("deleteVaiTro")
  async deleteVaiTro(params: { id: string }): Promise<void> {
    const currentList = (this.getState("vaiTroList") as VaiTroItem[]) || [];
    const updatedList = currentList.filter((item) => item.id !== params.id);

    this.setState("vaiTroList", updatedList);
    message.success("Xoá vai trò thành công!");
  }

  @HandlerDecorator("openModal")
  async openModal(params: { record?: VaiTroItem }): Promise<void> {
    this.setState("editingRecord", params.record || null);
    this.setState("modalVisible", true);
  }

  @HandlerDecorator("closeModal")
  async closeModal(): Promise<void> {
    this.setState("modalVisible", false);
    this.setState("editingRecord", null);
  }
}
