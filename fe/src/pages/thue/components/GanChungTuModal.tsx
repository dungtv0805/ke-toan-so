import { useEffect, useRef, useState } from "react";
import { Modal, Input, Table, Typography, Button, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { nhatKyChungService } from "@/services/nhatKyChungService";
import type { NhatKyChung } from "@/types";
import { ChungTuGoiY, gomChungTuTheoSoPhieu, xepGoiY } from "./gomChungTu";

const { Text } = Typography;

/** Hóa đơn đang cần gắn — đủ để gợi ý chứng từ (MST) và xếp hạng (tiền, ngày). */
export interface HoaDonGan {
  soHoaDon: string;
  ngayHoaDon: string;
  mst?: string;
  tenDoiTac?: string;
  tongThanhToan: number;
  giaTriChuaThue: number;
}

interface Props {
  open: boolean;
  /** `null` khi modal đóng. Đổi hóa đơn thì trang cha đổi `key` để làm mới modal. */
  hoaDon: HoaDonGan | null;
  onCancel: () => void;
  onChon: (soPhieu: string) => void;
}

/** Số bút toán nạp mỗi lần — gom theo số phiếu xong còn ít chứng từ hơn. */
const SO_DONG = 100;
const CHO_GO_MS = 300;

const sangDong = (d: NhatKyChung) => ({
  soPhieu: d.soPhieu,
  ngay: String(d.ngay).slice(0, 10),
  dienGiai: d.dienGiai || "",
  soTien: d.soTien || 0,
  soHopDong: d.danhMuc?.hopDong?.soHopDong || undefined,
});

/**
 * Chọn chứng từ để gắn tay vào một dòng bảng kê.
 *
 * Mở ra là có GỢI Ý ngay: chứng từ cùng mã số thuế đối tác, khớp số tiền lên
 * đầu (xem `xepGoiY`). Bản trước mở ra bảng trống, phải gõ rồi Enter mới tìm —
 * người dùng tưởng không chọn được chứng từ nào. Gõ thì tìm luôn (số phiếu,
 * diễn giải, tên/MST đối tượng, số đơn hàng); xoá ô tìm thì quay về gợi ý.
 */
export function GanChungTuModal({ open, hoaDon, onCancel, onChon }: Props) {
  const [tuKhoa, setTuKhoa] = useState("");
  const [rows, setRows] = useState<ChungTuGoiY[]>([]);
  const [loading, setLoading] = useState(false);
  // Chỉ nhận kết quả của lần tìm MỚI NHẤT — gõ nhanh thì các lần cũ về sau vẫn bị bỏ.
  const lanTim = useRef(0);

  useEffect(() => {
    if (!open || !hoaDon) return;
    const kw = tuKhoa.trim();
    // Không có từ khóa và hóa đơn không có MST → không có gì để gợi ý.
    if (!kw && !hoaDon.mst) {
      lanTim.current++; // bỏ lần tìm đang bay (nếu có) — nó không được đổ kết quả về nữa
      setLoading(false);
      setRows([]);
      return;
    }
    const lan = ++lanTim.current;
    const hen = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await nhatKyChungService.getEntries(
          kw ? { search: kw, limit: SO_DONG } : { mst: hoaDon.mst, limit: SO_DONG },
        );
        if (lan !== lanTim.current) return;
        setRows(xepGoiY(gomChungTuTheoSoPhieu(res.data.map(sangDong)), hoaDon));
      } catch {
        if (lan === lanTim.current) message.error("Không tải được danh sách chứng từ");
      } finally {
        if (lan === lanTim.current) setLoading(false);
      }
    }, kw ? CHO_GO_MS : 0);
    return () => clearTimeout(hen);
  }, [open, hoaDon, tuKhoa]);

  const dangGoiY = !tuKhoa.trim();

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title={hoaDon ? `Gắn chứng từ cho hóa đơn ${hoaDon.soHoaDon}` : "Gắn với chứng từ"}
      width={820}
    >
      <Input
        autoFocus
        allowClear
        prefix={<SearchOutlined className="text-muted-foreground" />}
        placeholder="Tìm số phiếu, diễn giải, tên / MST khách, số đơn hàng…"
        value={tuKhoa}
        onChange={(e) => setTuKhoa(e.target.value)}
      />
      <div className="mt-2 mb-1">
        <Text type="secondary">
          {dangGoiY
            ? hoaDon?.mst
              ? `Gợi ý: chứng từ của MST ${hoaDon.mst}${hoaDon.tenDoiTac ? ` (${hoaDon.tenDoiTac})` : ""} — khớp số tiền xếp trước.`
              : "Hóa đơn chưa có MST nên không có gợi ý — gõ để tìm chứng từ."
            : "Kết quả tìm — khớp số tiền xếp trước."}
        </Text>
      </div>
      <Table<ChungTuGoiY>
        size="small"
        rowKey="soPhieu"
        loading={loading}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 720, y: 360 }}
        locale={{ emptyText: dangGoiY ? "Không có chứng từ gợi ý" : "Không tìm thấy chứng từ" }}
        onRow={(r) => ({ onClick: () => onChon(r.soPhieu), style: { cursor: "pointer" } })}
        columns={[
          { title: "Số CT", dataIndex: "soPhieu", width: 120 },
          {
            title: "Ngày",
            dataIndex: "ngay",
            width: 100,
            render: (v: string) => dayjs(v).format("DD/MM/YYYY"),
          },
          {
            title: "Diễn giải",
            dataIndex: "dienGiai",
            ellipsis: true,
            render: (v: string, r: ChungTuGoiY) => (
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
            title: "Đơn hàng",
            dataIndex: "soHopDong",
            width: 120,
            render: (v?: string) => v || <Text type="secondary">—</Text>,
          },
          {
            title: "Số tiền",
            dataIndex: "soTien",
            align: "right",
            width: 150,
            render: (v: number, r: ChungTuGoiY) => (
              <span>
                {r.khopTien && <Tag color="green">Khớp</Tag>}
                {v.toLocaleString("vi-VN")}
              </span>
            ),
          },
          {
            key: "chon",
            width: 72,
            render: (_: unknown, r: ChungTuGoiY) => (
              <Button
                size="small"
                type="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onChon(r.soPhieu);
                }}
              >
                Chọn
              </Button>
            ),
          },
        ]}
      />
    </Modal>
  );
}
