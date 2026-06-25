import React, { useState, useEffect } from "react";
import {
  Card,
  Table,
  Select,
  InputNumber,
  Space,
  Typography,
  Breadcrumb,
  Tag,
  message,
} from "antd";
import { HomeOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { taxReportService, TongHopThue } from "@/services/taxService";

const { Text, Title } = Typography;

const fmt = (n?: number) => (n ?? 0).toLocaleString("vi-VN");

const QUY_OPTIONS = [
  { value: 0, label: "Cả năm" },
  { value: 1, label: "Quý 1" },
  { value: 2, label: "Quý 2" },
  { value: 3, label: "Quý 3" },
  { value: 4, label: "Quý 4" },
];

const TongHopThuePage: React.FC = () => {
  const [nam, setNam] = useState<number>(dayjs().year());
  const [quy, setQuy] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<TongHopThue | null>(null);

  const fetchData = async (namArg = nam, quyArg = quy) => {
    setLoading(true);
    try {
      const res = await taxReportService.getTongHop(namArg, quyArg || undefined);
      setData(res);
    } catch {
      message.error("Không thể tải dữ liệu tổng hợp thuế");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const vatRows = [
    { key: "1", chiTieu: "Thuế GTGT đầu vào (mua vào)", giaTri: data?.vatDauVao },
    { key: "2", chiTieu: "Thuế GTGT đầu ra (bán ra)", giaTri: data?.vatDauRa },
    {
      key: "3",
      chiTieu: "Thuế GTGT phải nộp trong kỳ",
      giaTri: data?.vatPhaiNop,
      strong: true,
    },
    {
      key: "4",
      chiTieu: "Thuế GTGT còn được khấu trừ chuyển kỳ sau",
      giaTri: data?.vatConKhauTru,
    },
  ];

  const nvRows = [
    { key: "1", chiTieu: "Thuế TNDN phải nộp (tạm tính)", giaTri: data?.nghiaVuNganSach.thueTNDN },
    { key: "2", chiTieu: "Thuế GTGT phải nộp", giaTri: data?.nghiaVuNganSach.vatPhaiNop },
    { key: "3", chiTieu: "Thuế TNCN phải nộp", giaTri: data?.nghiaVuNganSach.thueTNCN },
    { key: "4", chiTieu: "Bảo hiểm xã hội (3383)", giaTri: data?.nghiaVuNganSach.bhxh },
    { key: "5", chiTieu: "Bảo hiểm y tế (3384)", giaTri: data?.nghiaVuNganSach.bhyt },
    { key: "6", chiTieu: "Bảo hiểm thất nghiệp (3386)", giaTri: data?.nghiaVuNganSach.bhtn },
  ];

  const columns = [
    {
      title: "Chỉ tiêu",
      dataIndex: "chiTieu",
      key: "chiTieu",
      render: (v: string, r: { strong?: boolean }) =>
        r.strong ? <Text strong>{v}</Text> : v,
    },
    {
      title: "Số tiền",
      dataIndex: "giaTri",
      key: "giaTri",
      width: 220,
      align: "right" as const,
      render: (v: number, r: { strong?: boolean }) =>
        r.strong ? <Text strong>{fmt(v)}</Text> : fmt(v),
    },
  ];

  return (
    <div className="space-y-3">
      <Breadcrumb
        items={[
          { href: "/", title: <HomeOutlined /> },
          { title: "Thuế" },
          { title: "Tổng hợp thuế" },
        ]}
      />

      <Card>
        <Space className="mb-4" wrap>
          <Text strong>Kỳ:</Text>
          <Select
            value={quy}
            onChange={(v) => {
              setQuy(v);
              fetchData(nam, v);
            }}
            options={QUY_OPTIONS}
            style={{ width: 120 }}
          />
          <Text strong>Năm:</Text>
          <InputNumber
            value={nam}
            onChange={(v) => {
              const y = v || dayjs().year();
              setNam(y);
              fetchData(y, quy);
            }}
            style={{ width: 110 }}
          />
          <Tag color="blue">
            {quy ? `Quý ${quy}/${nam}` : `Năm ${nam}`}
          </Tag>
        </Space>

        <Title level={5}>Thuế giá trị gia tăng</Title>
        <Table
          columns={columns}
          dataSource={vatRows}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          className="mb-6"
        />

        <Title level={5}>Tổng hợp nghĩa vụ ngân sách</Title>
        <Table
          columns={columns}
          dataSource={nvRows}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  );
};

export default TongHopThuePage;
