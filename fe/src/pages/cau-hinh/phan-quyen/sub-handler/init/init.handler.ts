import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { phanQuyenService } from "@/services/phanQuyenService";
import { message } from "antd";
import { convertPermissionsToMatrix } from "../../utils/permissionConverter";
import "./init.event";

const defaultRoleNames = [
  'Giám đốc',
  'Kế toán trưởng',
  'Kế toán quỹ',
  'Kế toán công nợ',
  'Kế toán tổng hợp',
  'Quản lý',
  'Kiểm soát',
];

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
        roleOptions = defaultRoleNames.map((ten, index) => ({
          id: String(index + 1),
          ten,
        }));
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

      const roleOptions = defaultRoleNames.map((ten, index) => ({
        id: String(index + 1),
        ten,
      }));
      this.setState("roleOptions", roleOptions);
      this.setState("selectedRoleId", roleOptions[0].id);
      this.setState("permissions", convertPermissionsToMatrix([]));
    } finally {
      this.setState("loading", false);
    }
  }
}
