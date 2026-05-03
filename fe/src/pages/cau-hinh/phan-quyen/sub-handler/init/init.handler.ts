import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { phanQuyenService } from "@/services/phanQuyenService";
import { vaiTroOptions } from "@/mock-data/nguoi-dung";
import { message } from "antd";
import { convertPermissionsToMatrix } from "../../utils/permissionConverter";
import "./init.event";

const defaultRoles = vaiTroOptions
  .filter((v) => v.value !== 'ADMIN')
  .map((v) => ({ id: v.value, ten: v.label }));

@RegisterHandler("phan-quyen-context")
export class InitHandler extends CSubHanlder {
  @HandlerDecorator("init")
  async init(): Promise<void> {
    try {
      const phanQuyenList = await phanQuyenService.getAll();

      let roleOptions: { id: string; ten: string }[];

      if (phanQuyenList && phanQuyenList.length > 0) {
        roleOptions = phanQuyenList.map((item) => ({
          id: item.vaiTro || item._id,
          ten: item.ten,
        }));
      } else {
        roleOptions = [...defaultRoles];
      }

      this.setState("roleOptions", roleOptions);
      this.setState("selectedRoleId", roleOptions[0].id);

      try {
        const permissionsArray = await phanQuyenService.getPermissionsByVaiTro(roleOptions[0].id);
        this.setState("permissions", convertPermissionsToMatrix(permissionsArray));
      } catch {
        this.setState("permissions", convertPermissionsToMatrix([]));
      }
    } catch (error) {
      message.error("Không thể tải danh sách vai trò");
      console.error("Init phan quyen error:", error);

      const roleOptions = [...defaultRoles];
      this.setState("roleOptions", roleOptions);
      this.setState("selectedRoleId", roleOptions[0].id);
      this.setState("permissions", convertPermissionsToMatrix([]));
    } finally {
      this.setState("loading", false);
    }
  }
}
