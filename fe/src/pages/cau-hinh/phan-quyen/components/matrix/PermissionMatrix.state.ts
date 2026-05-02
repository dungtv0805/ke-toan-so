import { BaseStates } from "@/common/c-handler/core/actions/c-state.action";

type PermissionAction = 'xem' | 'them' | 'sua' | 'xoa' | 'xuat';

interface ModulePermission {
  moduleKey: string;
  actions: Record<PermissionAction, boolean>;
}

declare module "../../phanQuyenHandler" {
  interface PhanQuyenStates {
    permissions: ModulePermission[];
    loading: boolean;
  }
}
