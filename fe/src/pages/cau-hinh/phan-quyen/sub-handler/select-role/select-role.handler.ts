import { HandlerDecorator, RegisterHandler } from "@/common";
import { CSubHanlder } from "@/common/c-handler/core/sub-handler.ts/sub-handler";
import { permissionModules, PermissionModule } from "../../constants/permissionModules";
import "./select-role.event";

function collectLeafModules(modules: PermissionModule[]): string[] {
  const keys: string[] = [];
  for (const mod of modules) {
    if (mod.children) {
      keys.push(...collectLeafModules(mod.children));
    } else {
      keys.push(mod.key);
    }
  }
  return keys;
}

function generateDefaultPermissions() {
  const leafKeys = collectLeafModules(permissionModules);
  return leafKeys.map((key) => ({
    moduleKey: key,
    actions: {
      xem: true,
      them: true,
      sua: true,
      xoa: true,
      xuat: true,
    },
  }));
}

@RegisterHandler("phan-quyen-context")
export class SelectRoleHandler extends CSubHanlder {
  @HandlerDecorator("selectRole")
  async selectRole(params: { roleId: string }): Promise<void> {
    this.setState("selectedRoleId", params.roleId);
    this.setState("permissions", generateDefaultPermissions());
  }
}
