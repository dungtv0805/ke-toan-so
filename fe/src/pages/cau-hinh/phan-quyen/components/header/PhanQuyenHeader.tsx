import { Breadcrumb, Button, Space } from "antd";
import { HomeOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { usePhanQuyenHandler, usePhanQuyenState } from "../../PhanQuyenHandlerContext";
import "./PhanQuyenHeader.state";

export function PhanQuyenHeader() {
  const handler = usePhanQuyenHandler();
  const [loading] = usePhanQuyenState("loading", false);

  const handleRefresh = () => {
    handler.executeEvent("init", {});
  };

  const handleAdd = () => {
    handler.executeEvent("openModal", {});
  };

  return (
    <>
      <Breadcrumb
        className="mb-4"
        items={[
          { title: <><HomeOutlined /> Trang chủ</> },
          { title: "Cấu hình" },
          { title: "Phân quyền người dùng" },
        ]}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Phân quyền người dùng</h1>
          <p className="text-muted-foreground">Quản lý người dùng và phân quyền theo vai trò</p>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            Làm mới
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            Thêm người dùng
          </Button>
        </Space>
      </div>
    </>
  );
}
