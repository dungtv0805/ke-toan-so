import { Button, Space } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useVaiTroHandler, useVaiTroState } from "../../VaiTroHandlerContext";
import "./VaiTroHeader.state";

export function VaiTroHeader() {
  const handler = useVaiTroHandler();
  const [loading] = useVaiTroState("loading", false);

  const handleAdd = () => {
    handler.executeEvent("openModal", {});
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Quản lý Vai trò</h1>
        <p className="text-muted-foreground">Quản lý các vai trò và phân quyền trong hệ thống</p>
      </div>
      <Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAdd}
          loading={loading}
        >
          Thêm vai trò
        </Button>
      </Space>
    </div>
  );
}
