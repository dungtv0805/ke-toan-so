import React, { useState } from "react";
import { Modal, Upload, Button, Table, Alert, Space, message, Tag } from "antd";
import { InboxOutlined, DownloadOutlined } from "@ant-design/icons";
import * as XLSX from "xlsx";
import { keHoachService, type LoaiKeHoach } from "@/services/keHoachService";
import { useKeHoachHandler, useKeHoachState } from "../KeHoachHandlerContext";
import type { DanhMucLists, MucDanhMuc } from "../lib/keHoachRow";
import {
  IMPORT_COLUMNS,
  parseKeHoachSheet,
  type DongImport,
  type KetQuaImport,
} from "./parseKeHoachSheet";

interface Props {
  open: boolean;
  onClose: () => void;
}

const tien = (v: number) => new Intl.NumberFormat("vi-VN").format(v);

/** File mẫu: 1 sheet, hàng 1 là header đúng thứ tự cột mà parse đọc theo vị trí. */
function taiFileMau() {
  const ws = XLSX.utils.aoa_to_sheet([
    IMPORT_COLUMNS.map((c) => c.header),
    ["01/01/2026", "Bán hàng", "Doanh thu kế hoạch T1", "131", "511", 100000000],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "KeHoach");
  XLSX.writeFile(wb, "mau-ke-hoach.xlsx");
}

export const ImportKeHoachModal: React.FC<Props> = ({ open, onClose }) => {
  const handler = useKeHoachHandler();
  const [ketQua, setKetQua] = useState<KetQuaImport | null>(null);
  const [tenFile, setTenFile] = useState("");
  const [dangLuu, setDangLuu] = useState(false);

  const lay = (key: string) =>
    (handler.getState(key) ?? []) as MucDanhMuc[];
  const [loaiKeHoach] = useKeHoachState("loaiKeHoach", "KE_HOACH");
  const [phienBan] = useKeHoachState("phienBan");

  const doc = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      // Không bật cellDates: ô ngày giữ dạng serial cho normalizeNgay đọc.
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, {
        header: 1,
        raw: true,
        defval: "",
      }) as unknown[][];

      const lists: DanhMucLists = {
        taiKhoanList: lay("taiKhoanList"),
        doiTuongList: lay("doiTuongList"),
        duAnList: lay("duAnList"),
        boPhanList: lay("boPhanList"),
        sanPhamList: lay("sanPhamList"),
        dongTienList: lay("dongTienList"),
        khoanMucList: lay("khoanMucList"),
        nhomQuanLyList: lay("nhomQuanLyList"),
        chuDauTuList: lay("chuDauTuList"),
        nhomKhoanMucList: lay("nhomKhoanMucList"),
      };

      const res = parseKeHoachSheet(
        aoa,
        lists,
        loaiKeHoach as LoaiKeHoach,
        phienBan as string | undefined,
      );
      if (!res.rows.length) message.warning("File không có dòng dữ liệu");
      setTenFile(file.name);
      setKetQua(res);
    } catch (error) {
      console.error("Lỗi đọc file Excel:", error);
      message.error("Không đọc được file Excel. Kiểm tra lại định dạng.");
    }
    return false;
  };

  const luu = async () => {
    const hopLe = ketQua?.rows.filter((r) => !r.loi).map((r) => r.payload) ?? [];
    if (!hopLe.length) return;
    setDangLuu(true);
    try {
      await keHoachService.importEntries(hopLe);
      message.success(`Đã nhập ${hopLe.length} dòng kế hoạch`);
      setKetQua(null);
      setTenFile("");
      onClose();
      await handler.executeEvent("refresh", {});
    } catch (error) {
      const err = error as { message?: string };
      message.error(err.message || "Không nhập được dữ liệu");
    } finally {
      setDangLuu(false);
    }
  };

  return (
    <Modal
      open={open}
      title="Nhập kế hoạch từ Excel"
      width={900}
      onCancel={() => {
        setKetQua(null);
        setTenFile("");
        onClose();
      }}
      footer={[
        <Button key="mau" icon={<DownloadOutlined />} onClick={taiFileMau}>
          Tải file mẫu
        </Button>,
        <Button key="huy" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="luu"
          type="primary"
          loading={dangLuu}
          disabled={!ketQua?.soDongHopLe}
          onClick={luu}
        >
          Nhập {ketQua?.soDongHopLe ?? 0} dòng hợp lệ
        </Button>,
      ]}
    >
      <Space direction="vertical" className="w-full">
        <Upload.Dragger accept=".xlsx,.xls" maxCount={1} beforeUpload={doc} showUploadList={false}>
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {tenFile || "Kéo thả hoặc bấm để chọn file Excel"}
          </p>
          <p className="ant-upload-hint">
            Cột đọc theo VỊ TRÍ đúng như file mẫu. Các chiều nhập theo mã danh mục.
          </p>
        </Upload.Dragger>

        {ketQua && (
          <>
            <Alert
              type={ketQua.soDongLoi ? "warning" : "success"}
              showIcon
              message={`${ketQua.soDongHopLe} dòng hợp lệ, ${ketQua.soDongLoi} dòng lỗi (dòng lỗi sẽ bị bỏ qua)`}
            />
            <Table<DongImport>
              rowKey="rowNumber"
              size="small"
              bordered
              dataSource={ketQua.rows}
              pagination={{ pageSize: 10 }}
              scroll={{ x: "max-content" }}
              columns={[
                { title: "Dòng", dataIndex: "rowNumber", width: 70 },
                {
                  title: "Trạng thái",
                  key: "loi",
                  width: 260,
                  render: (_, r) =>
                    r.loi ? <Tag color="red">{r.loi}</Tag> : <Tag color="green">Hợp lệ</Tag>,
                },
                {
                  title: "Ngày",
                  key: "ngay",
                  width: 110,
                  render: (_, r) => (r.payload.ngay ? r.payload.ngay.slice(0, 10) : "-"),
                },
                { title: "Diễn giải", key: "noiDung", render: (_, r) => r.payload.noiDung || "-" },
                {
                  title: "TK Nợ / Có",
                  key: "tk",
                  width: 120,
                  render: (_, r) =>
                    `${r.payload.danhMuc?.taiKhoanNo?.ma ?? "-"} / ${r.payload.danhMuc?.taiKhoanCo?.ma ?? "-"}`,
                },
                {
                  title: "Số tiền",
                  key: "soTien",
                  align: "right",
                  width: 130,
                  render: (_, r) => tien(r.payload.soTien),
                },
              ]}
            />
          </>
        )}
      </Space>
    </Modal>
  );
};
