import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { message } from "antd";
import "./save.event";

@RegisterHandler("phan-quyen-context")
export class SaveHandler extends CSubHanlder {
  @HandlerDecorator("savePermissions")
  async savePermissions(): Promise<void> {
    message.success("Đã lưu thành công!");
  }
}
