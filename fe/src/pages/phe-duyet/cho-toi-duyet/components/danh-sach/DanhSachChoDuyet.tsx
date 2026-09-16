import React from "react";
import { Button, Card, Empty, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { QuyTrinhPheDuyet } from "@/services/pheDuyetService";
import { formatCurrency } from "@/pages/chung-tu/phieu/lib/format";
import { dinhDangThoiLuong } from "../../../lib/thoiGian";
import {
  useChoToiDuyetHandler,
  useChoToiDuyetState,
} from "../../ChoToiDuyetHandlerContext";
import "./DanhSachChoDuyet.state";

/**
 * Khu vực CHỜ TÔI DUYỆT — mục 6.
 *
 * Danh sách đã được BE lọc: chỉ nghiệp vụ đang đến lượt một trong các vị trí
 * người đang đăng nhập đảm nhiệm. Không có bộ lọc nào ở đây cho phép xem
 * nghiệp vụ của cấp khác — đó là chủ đích, không phải thiếu tính năng.
 */
export function DanhSachChoDuyet() {
  const handler = useChoToiDuyetHandler();
  const [danhSach] = useChoToiDuyetState("danhSach", []);
  const [dangTai] = useChoToiDuyetState("dangTai", false);

  const cot: ColumnsType<QuyTrinhPheDuyet> = [
    {
      title: "Ngày gửi",
      dataIndex: "ngayGuiDuyet",
      width: 130,
      render: (v?: string) => (v ? dayjs(v).format("DD/MM/YYYY HH:mm") : "—"),
    },
    {
      title: "Loại nghiệp vụ",
      dataIndex: "loaiNghiepVuTen",
      width: 150,
      render: (v: string, r) => v || r.loaiNghiepVuMa,
    },
    {
      title: "Số phiếu",
      dataIndex: "soPhieu",
      width: 110,
      render: (v?: string) => v || "—",
    },
    {
      title: "Nội dung",
      dataIndex: "noiDung",
      ellipsis: true,
      render: (v?: string) => v || "—",
    },
    {
      title: "Số tiền",
      dataIndex: "soTien",
      width: 130,
      align: "right",
      render: (v: number) => formatCurrency(Number(v) || 0),
    },
    {
      title: "Người lập",
      dataIndex: "nguoiLapTen",
      width: 130,
      render: (v?: string) => v || "—",
    },
    {
      title: "Bộ phận",
      dataIndex: "boPhan",
      width: 110,
      render: (v?: string) => v || "—",
    },
    {
      title: "Vị trí cần duyệt",
      dataIndex: "viTriCanDuyet",
      width: 150,
      render: (v?: string) => (v ? <Tag color="processing">{v}</Tag> : "—"),
    },
    {
      title: "Thời gian chờ",
      dataIndex: "thoiGianChoGiay",
      width: 150,
      render: (giay?: number) => {
        const nhan = dinhDangThoiLuong(giay);
        // Quá một ngày thì đánh dấu đỏ — mục 15 gọi đây là điểm nghẽn.
        const treo = (giay ?? 0) > 24 * 3600;
        return treo ? (
          <Tooltip title="Đã chờ quá 24 giờ">
            <span style={{ color: "#cf1322", fontWeight: 600 }}>{nhan}</span>
          </Tooltip>
        ) : (
          nhan
        );
      },
    },
    {
      title: "",
      key: "thaoTac",
      width: 90,
      fixed: "right",
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          onClick={() => handler.executeEvent("moChiTiet", { id: r.id })}
        >
          Xem & duyệt
        </Button>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title={`Chờ tôi duyệt (${danhSach?.length ?? 0})`}
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          loading={dangTai}
          onClick={() => handler.executeEvent("taiLaiDanhSach", {})}
        >
          Tải lại
        </Button>
      }
    >
      <Table<QuyTrinhPheDuyet>
        rowKey="id"
        size="small"
        loading={dangTai}
        dataSource={danhSach ?? []}
        columns={cot}
        scroll={{ x: 1200 }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Không có nghiệp vụ nào đang chờ bạn duyệt"
            />
          ),
        }}
      />
    </Card>
  );
}
