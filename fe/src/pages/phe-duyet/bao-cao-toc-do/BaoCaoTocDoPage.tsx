import React, { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import {
  pheDuyetService,
  type BaoCaoTocDo,
  type DongTocDo,
} from "@/services/pheDuyetService";
import { dinhDangThoiLuong } from "../lib/thoiGian";

const { RangePicker } = DatePicker;

const cotChung = (tieuDe: string): ColumnsType<DongTocDo> => [
  { title: tieuDe, dataIndex: "ten", ellipsis: true },
  { title: "Số lượt xử lý", dataIndex: "soLuong", width: 120, align: "right" },
  {
    title: "Thời gian xử lý TB",
    dataIndex: "trungBinhGiay",
    width: 180,
    align: "right",
    render: (v: number) => dinhDangThoiLuong(v),
  },
  {
    title: "Quá 24 giờ",
    dataIndex: "soQuaHan",
    width: 110,
    align: "right",
    render: (v: number) =>
      v > 0 ? <Tag color="red">{v}</Tag> : <span style={{ color: "#8A8A8F" }}>0</span>,
  },
];

/** Báo cáo tốc độ xử lý — mục 15. */
const BaoCaoTocDoPage: React.FC = () => {
  const [khoang, setKhoang] = useState<[Dayjs, Dayjs] | null>(null);
  const [duLieu, setDuLieu] = useState<BaoCaoTocDo | null>(null);
  const [dangTai, setDangTai] = useState(false);

  const nap = async () => {
    setDangTai(true);
    try {
      const res = await pheDuyetService.baoCaoTocDo({
        tuNgay: khoang?.[0]?.startOf("day").toISOString(),
        denNgay: khoang?.[1]?.endOf("day").toISOString(),
      });
      setDuLieu(res);
    } catch (e) {
      message.error(
        e instanceof Error ? e.message : "Không tải được báo cáo tốc độ xử lý",
      );
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    void nap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bang = (tieuDe: string, ds?: DongTocDo[]) => (
    <Card size="small" title={tieuDe}>
      <Table<DongTocDo>
        rowKey="ten"
        size="small"
        pagination={false}
        loading={dangTai}
        dataSource={ds ?? []}
        columns={cotChung(tieuDe)}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="Chưa có lượt phê duyệt nào trong kỳ"
            />
          ),
        }}
      />
    </Card>
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: "100%" }}>
      <Card size="small">
        <Space wrap>
          <RangePicker
            size="small"
            format="DD/MM/YYYY"
            value={khoang}
            onChange={(v) => setKhoang(v as [Dayjs, Dayjs] | null)}
          />
          <Button
            size="small"
            type="primary"
            icon={<SearchOutlined />}
            loading={dangTai}
            onClick={nap}
          >
            Xem
          </Button>
        </Space>
      </Card>

      {duLieu?.diemNghen && (
        <Alert
          type="warning"
          showIcon
          message={`Điểm nghẽn hiện tại: ${duLieu.diemNghen}`}
          description="Đây là vị trí có thời gian xử lý trung bình cao nhất trong kỳ đã chọn."
        />
      )}

      <Row gutter={12}>
        <Col xs={24} md={8}>
          <Card size="small">
            <Statistic
              title="Lượt đã gửi phê duyệt"
              value={duLieu?.soDangCho ?? 0}
              loading={dangTai}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Statistic
              title="Số vị trí tham gia duyệt"
              value={duLieu?.theoViTri?.length ?? 0}
              loading={dangTai}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card size="small">
            <Statistic
              title="Lượt xử lý quá 24 giờ"
              value={(duLieu?.theoViTri ?? []).reduce((t, d) => t + d.soQuaHan, 0)}
              valueStyle={{ color: "#cf1322" }}
              loading={dangTai}
            />
          </Card>
        </Col>
      </Row>

      {bang("Vị trí phân quyền", duLieu?.theoViTri)}
      {bang("Người dùng", duLieu?.theoNguoiDung)}
      {bang("Loại nghiệp vụ", duLieu?.theoLoaiNghiepVu)}
    </Space>
  );
};

export default BaoCaoTocDoPage;
