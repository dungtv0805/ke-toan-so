import { Select } from "antd";
import { usePhanQuyenHandler, usePhanQuyenState } from "../../PhanQuyenHandlerContext";
import "./PhanQuyenHeader.state";

export function PhanQuyenHeader() {
  const handler = usePhanQuyenHandler();
  const [selectedRoleId] = usePhanQuyenState("selectedRoleId", null);
  const [roleOptions] = usePhanQuyenState("roleOptions", []);

  return (
    // Điện thoại: tiêu đề 24px + ô chọn 240px không đứng chung một hàng 360px →
    // xuống dòng, ô chọn vai trò giãn hết bề ngang cho dễ bấm.
    <div className="flex justify-between items-center mb-6 dt:flex-wrap dt:gap-2 dt:mb-3">
      <h1 className="text-2xl font-bold dt:text-xl">Thiết lập Phân quyền</h1>
      <Select
        className="dt:!w-full"
        style={{ width: 240 }}
        placeholder="Chọn vai trò"
        value={selectedRoleId}
        onChange={(value: string) => handler.executeEvent("selectRole", { roleId: value })}
        options={roleOptions.map((role) => ({
          value: role.id,
          label: role.ten,
        }))}
      />
    </div>
  );
}
