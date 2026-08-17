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
  Tooltip,
  message,
} from "antd";
import {
  InboxOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilePdfOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import dayjs from "dayjs";
import { HopDong } from "@/types";
import {
  hopDongFileService,
  type HopDongFile,
} from "@/services/hopDongFileService";
import {
  ACCEPT_PDF,
  dinhDangDungLuong,
  kiemTraTruocKhiTaiLen,
} from "./fileHopDong";
import { XemPdfModal } from "./XemPdfModal";

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
  const [dangXem, setDangXem] = useState<HopDongFile | null>(null);

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

  /** Tải lần lượt cho khỏi đua nhau, xong cả mẻ mới nạp lại danh sách một lần. */
  const uploadBatch = async (danhSach: File[]) => {
    if (!hopDong) return;
    const hopLe: File[] = [];
    for (const f of danhSach) {
      const loi = kiemTraTruocKhiTaiLen(f);
      if (loi) message.error(loi);
      else hopLe.push(f);
    }
    if (!hopLe.length) return;

    setUploading(true);
    let thanhCong = 0;
    try {
      for (const f of hopLe) {
        try {
          await hopDongFileService.upload(hopDong.id, f);
          thanhCong++;
        } catch {
          message.error(`${f.name}: tải lên thất bại`);
        }
      }
      if (thanhCong) message.success(`Đã tải lên ${thanhCong} file`);
      await load();
    } finally {
      setUploading(false);
    }
  };

  const uploadProps: UploadProps = {
    multiple: true,
    accept: ACCEPT_PDF,
    showUploadList: false,
    // beforeUpload chạy MỘT LẦN CHO MỖI file; chỉ xử lý ở file đầu để cả mẻ đi
    // chung một lượt, tránh mỗi file gọi lại danh sách một lần.
    beforeUpload: (file, fileList) => {
      if (file === fileList[0]) void uploadBatch(fileList as File[]);
      return Upload.LIST_IGNORE;
    },
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
      title={hopDong ? `File đính kèm — ${hopDong.soHopDong}` : "File đính kèm"}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
    >
      {canUpload && (
        <Spin spinning={uploading} tip="Đang tải lên...">
          <Upload.Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Kéo file PDF vào đây, hoặc bấm để chọn
            </p>
            <p className="ant-upload-hint">
              Chỉ nhận PDF, tối đa 25MB mỗi file. Chọn được nhiều file một lúc.
            </p>
          </Upload.Dragger>
        </Spin>
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
                  <Tooltip key="xem" title="Xem">
                    <Button
                      type="text"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => setDangXem(f)}
                    />
                  </Tooltip>,
                  <Tooltip key="tai" title="Tải về">
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => handleDownload(f)}
                    />
                  </Tooltip>,
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
                  avatar={
                    <FilePdfOutlined
                      style={{ fontSize: 20, color: "#cf1322" }}
                    />
                  }
                  title={
                    <a onClick={() => setDangXem(f)}>{f.tenFile}</a>
                  }
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

      <XemPdfModal file={dangXem} onClose={() => setDangXem(null)} />
    </Modal>
  );
}
