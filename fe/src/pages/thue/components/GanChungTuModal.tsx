import { useState } from "react";
import { Modal, Input, Table, Typography, message } from "antd";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import { ChungTuGom, gomChungTuTheoSoPhieu } from "./gomChungTu";

const { Text } = Typography;

interface Props {
  open: boolean;
  onCancel: () => void;
  onChon: (soPhieu: string) => void;
}

/** Tìm chứng từ theo số phiếu / diễn giải để gắn tay vào một dòng bảng kê. */
export function GanChungTuModal({ open, onCancel, onChon }: Props) {
  const [tuKhoa, setTuKhoa] = useState("");
  const [rows, setRows] = useState<ChungTuGom[]>([]);
  const [loading, setLoading] = useState(false);

  const timKiem = async (kw: string) => {
    if (!kw.trim()) return setRows([]);
    setLoading(true);
    try {
      const res = await nhatKyChungService.getEntries({ search: kw.trim(), limit: 20 });
      setRows(
        gomChungTuTheoSoPhieu(
          res.data.map((d) => ({
            soPhieu: d.soPhieu,
            ngay: String(d.ngay).slice(0, 10),
            dienGiai: d.dienGiai || "",
            soTien: d.soTien || 0,
          })),
        ),
      );
    } catch {
      message.error("Không tìm được chứng từ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onCancel={onCancel} footer={null} title="Gắn với chứng từ" width={720}>
      <Input.Search
        placeholder="Số phiếu hoặc diễn giải"
        value={tuKhoa}
        onChange={(e) => setTuKhoa(e.target.value)}
        onSearch={timKiem}
        allowClear
      />
      <Table
        className="mt-3"
        size="small"
        rowKey="soPhieu"
        loading={loading}
        dataSource={rows}
        pagination={false}
        scroll={{ y: 320 }}
        onRow={(r) => ({ onClick: () => onChon(r.soPhieu), style: { cursor: "pointer" } })}
        columns={[
          { title: "Số CT", dataIndex: "soPhieu", width: 120 },
          { title: "Ngày", dataIndex: "ngay", width: 110 },
          {
            title: "Diễn giải",
            dataIndex: "dienGiai",
            ellipsis: true,
            render: (v: string, r: ChungTuGom) => (
              <span>
                {v}
                {r.soButToan > 1 && (
                  <Text type="secondary" style={{ marginLeft: 6 }}>
                    ({r.soButToan} bút toán)
                  </Text>
                )}
              </span>
            ),
          },
          {
            title: "Số tiền",
            dataIndex: "soTien",
            align: "right",
            width: 140,
            render: (v: number) => v.toLocaleString("vi-VN"),
          },
        ]}
      />
    </Modal>
  );
}
