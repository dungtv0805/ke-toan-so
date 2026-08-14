import { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Upload,
  Button,
  List,
  Typography,
  Popconfirm,
  Empty,
  Spin,
  message,
} from "antd";
import {
  UploadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  PaperClipOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import dayjs from "dayjs";
import { HopDong } from "@/types";
import {
  hopDongFileService,
  type HopDongFile,
} from "@/services/hopDongFileService";
import { dinhDangDungLuong, kiemTraTruocKhiTaiLen } from "./fileHopDong";

const { Text } = Typography;

interface Props {
  hopDong: HopDong | null;
  open: boolean;
  canUpload: boolean;
  canDelete: boolean;
  onClose: () => void;
  /** Báo về trang cha để cập nhật badge số file trên bảng. */
  onChanged: (hopDongId: string, soFile: number) => void;
}

export function FileHopDongModal({
  hopDong,
  open,
  canUpload,
  canDelete,
  onClose,
  onChanged,
}: Props) {
  const [files, setFiles] = useState<HopDongFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // onChanged làm trang cha đổi state → hàm mới mỗi lần render. Giữ nó trong ref để
  // `load` không đổi identity, nếu không useEffect bên dưới sẽ gọi API vô tận.
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  const hopDongId = hopDong?.id;

  const load = useCallback(async () => {
    if (!hopDongId) return;
    setLoading(true);
    try {
      const list = await hopDongFileService.list(hopDongId);
      setFiles(list);
      onChangedRef.current(hopDongId, list.length);
    } catch {
      message.error("Không tải được danh sách file");
    } finally {
      setLoading(false);
    }
  }, [hopDongId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const uploadProps: UploadProps = {
    showUploadList: false,
    beforeUpload: (file) => {
      const loi = kiemTraTruocKhiTaiLen(file as File);
      if (loi) {
        message.error(loi);
        return Upload.LIST_IGNORE;
      }
      handleUpload(file as File);
      return false; // tự gọi API, không để antd tự tải lên
    },
  };

  const handleUpload = async (file: File) => {
    if (!hopDong) return;
    setUploading(true);
    try {
      await hopDongFileService.upload(hopDong.id, file);
      message.success("Đã tải file lên");
      await load();
    } catch {
      message.error("Tải file lên thất bại");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (f: HopDongFile) => {
    try {
      const url = await hopDongFileService.fetchFileObjectUrl(f._id);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.tenFile;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error("Không tải được file");
    }
  };

  const handleDelete = async (f: HopDongFile) => {
    try {
      await hopDongFileService.remove(f._id);
      message.success("Đã xóa file");
      await load();
    } catch {
      message.error("Xóa file thất bại");
    }
  };

  return (
    <Modal
      title={
        hopDong
          ? `File đính kèm — ${hopDong.soHopDong}`
          : "File đính kèm"
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      {canUpload && (
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />} loading={uploading}>
            Tải file lên
          </Button>
        </Upload>
      )}

      <Spin spinning={loading}>
        {files.length === 0 && !loading ? (
          <Empty
            description="Chưa có file nào"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: "24px 0" }}
          />
        ) : (
          <List
            style={{ marginTop: 12 }}
            dataSource={files}
            rowKey="_id"
            renderItem={(f) => (
              <List.Item
                actions={[
                  <Button
                    key="tai"
                    type="text"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => handleDownload(f)}
                  />,
                  ...(canDelete
                    ? [
                        <Popconfirm
                          key="xoa"
                          title="Xóa file này?"
                          okText="Xóa"
                          cancelText="Hủy"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleDelete(f)}
                        >
                          <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                          />
                        </Popconfirm>,
                      ]
                    : []),
                ]}
              >
                <List.Item.Meta
                  avatar={<PaperClipOutlined />}
                  title={f.tenFile}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dinhDangDungLuong(f.size)} ·{" "}
                      {dayjs(f.createdAt).format("DD/MM/YYYY HH:mm")}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>
    </Modal>
  );
}
