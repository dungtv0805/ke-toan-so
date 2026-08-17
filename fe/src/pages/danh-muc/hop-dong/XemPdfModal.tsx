import { useEffect, useState } from "react";
import { Modal, Button, Spin, Alert } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import { hopDongFileService, type HopDongFile } from "@/services/hopDongFileService";

interface Props {
  file: HopDongFile | null;
  onClose: () => void;
}

/**
 * Xem PDF ngay trong app. File nằm sau JWT nên `<iframe src>` trỏ thẳng API sẽ 401 —
 * phải fetch về blob rồi mới nhúng, và thu hồi object URL khi đóng để khỏi rò bộ nhớ.
 */
export function XemPdfModal({ file, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loi, setLoi] = useState<string | null>(null);

  const fileId = file?._id;

  useEffect(() => {
    if (!fileId) return;
    let huy = false;
    let urlHienTai: string | null = null;

    setUrl(null);
    setLoi(null);
    hopDongFileService
      .fetchFileObjectUrl(fileId)
      .then((u) => {
        // Modal đóng trước khi tải xong → thu hồi luôn, đừng set vào state đã bỏ.
        if (huy) {
          URL.revokeObjectURL(u);
          return;
        }
        urlHienTai = u;
        setUrl(u);
      })
      .catch(() => {
        if (!huy) setLoi("Không mở được file");
      });

    return () => {
      huy = true;
      if (urlHienTai) URL.revokeObjectURL(urlHienTai);
    };
  }, [fileId]);

  const taiVe = () => {
    if (!url || !file) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.tenFile;
    a.click();
  };

  return (
    <Modal
      title={file?.tenFile ?? "Xem file"}
      open={!!file}
      onCancel={onClose}
      width="90%"
      style={{ top: 16, maxWidth: 1200 }}
      styles={{ body: { padding: 0, height: "80vh" } }}
      footer={
        <Button icon={<DownloadOutlined />} onClick={taiVe} disabled={!url}>
          Tải về
        </Button>
      }
    >
      {loi ? (
        <Alert type="error" message={loi} style={{ margin: 16 }} />
      ) : url ? (
        <iframe
          src={url}
          title={file?.tenFile}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <Spin />
        </div>
      )}
    </Modal>
  );
}
