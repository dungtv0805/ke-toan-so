import { useEffect } from "react";
import { Modal, Button } from "antd";
import {
  ImportHandlerProvider,
  useImportHandler,
  useImportState,
} from "./ImportHandlerContext";
import { UploadStep } from "./components/UploadStep";
import { PreviewTable } from "./components/PreviewTable";
import type { ImportDanhMucConfig } from "./types";

interface Props {
  open: boolean;
  config: ImportDanhMucConfig;
  onClose: () => void;
  /** Gọi sau khi import xong (kể cả import một phần) để trang cha nạp lại bảng. */
  onImported?: () => void;
}

function ImportDanhMucModalInner({ open, config, onClose, onImported }: Props) {
  const handler = useImportHandler();
  const [hasErrors] = useImportState("hasErrors", false);
  const [parsed] = useImportState("parsed", false);
  const [submitting] = useImportState("submitting", false);
  const [validItems] = useImportState("validItems", []);

  useEffect(() => {
    if (open) {
      handler.executeEvent("loadRefs", { config });
    }
  }, [open, config, handler]);

  const handleClose = () => {
    handler.executeEvent("resetImport", {});
    onClose();
  };

  const handleImport = () => {
    handler.executeEvent("submitImport", {
      onSuccess: () => {
        onImported?.();
      },
    });
  };

  const count = validItems?.length ?? 0;
  const canImport = parsed && !hasErrors && count > 0;

  return (
    <Modal
      title={`Import ${config.title} từ Excel`}
      open={open}
      onCancel={handleClose}
      width={900}
      destroyOnClose
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Đóng
        </Button>,
        <Button
          key="import"
          type="primary"
          disabled={!canImport}
          loading={submitting}
          onClick={handleImport}
        >
          {`Import ${count} bản ghi`}
        </Button>,
      ]}
    >
      <UploadStep />
      <PreviewTable />
    </Modal>
  );
}

export function ImportDanhMucModal(props: Props) {
  return (
    <ImportHandlerProvider>
      <ImportDanhMucModalInner {...props} />
    </ImportHandlerProvider>
  );
}
