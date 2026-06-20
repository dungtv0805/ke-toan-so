import {
  BangTongHopCongNo,
  CongNoRowVal,
  congNoTongHopService,
} from "@/services/congNoTongHopService";
import { doiTuongService } from "@/services/doiTuongService";
import { taiKhoanService } from "@/services/taiKhoanService";
import { TaiKhoan } from "@/types";
import { HomeOutlined, ReloadOutlined, TableOutlined } from "@ant-design/icons";
import {
  Breadcrumb,
  Button,
  Card,
  DatePicker,
  Select,
  Space,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const { RangePicker } = DatePicker;

// TK công nợ = chi tiết theo đối tượng (loại trừ ngân hàng/quỹ)
const CONG_NO_TYPES = ["KHACH_HANG", "NHA_CUNG_CAP", "NHA_THAU", "NHAN_VIEN"];

const fmt = (v: number) => (v ? new Intl.NumberFormat("vi-VN").format(v) : "-");

interface FlatRow {
  key: string;
  isAccount: boolean;
  isTotal: boolean;
  drillable: boolean;
  accMa?: string; // mã TK (cho drill-down của dòng đối tượng)
  ma: string;
  ten: string;
  val: CongNoRowVal;
}

const BangTongHopCongNoPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<BangTongHopCongNo | null>(null);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [maTaiKhoan, setMaTaiKhoan] = useState<string>();
  const [maDoiTuong, setMaDoiTuong] = useState<string>();
  const [tkOptions, setTkOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [dtOptions, setDtOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    Promise.all([taiKhoanService.getAll(), doiTuongService.getAll()])
      .then(([tks, dts]) => {
        setTkOptions(
          (tks as TaiKhoan[])
            .filter(
              (t) => t.chiTietTheo && CONG_NO_TYPES.includes(t.chiTietTheo),
            )
            .map((t) => ({ value: t.ma, label: `${t.ma} - ${t.ten}` })),
        );
        setDtOptions(
          dts.map((d) => ({ value: d.ma, label: `${d.ma} - ${d.ten}` })),
        );
      })
      .catch((e) => console.error("load options error", e));
  }, []);

  const fetchData = useCallback(async () => {
    if (!range) return;
    setLoading(true);
    try {
      const res = await congNoTongHopService.getReport({
        startDate: range[0].format("YYYY-MM-DD"),
        endDate: range[1].format("YYYY-MM-DD"),
        maTaiKhoan,
        maDoiTuong,
      });
      setData(res);
    } catch (e) {
      console.error("Error fetching cong no report:", e);
    } finally {
      setLoading(false);
    }
  }, [range, maTaiKhoan, maDoiTuong]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Flatten: [Tổng cộng] + mỗi TK: dòng TK + các dòng đối tượng
  const rows: FlatRow[] = useMemo(() => {
    if (!data) return [];
    const out: FlatRow[] = [
      {
        key: "__totals__",
        isAccount: false,
        isTotal: true,
        drillable: false,
        ma: "",
        ten: "TỔNG CỘNG",
        val: data.totals,
      },
    ];
    for (const acc of data.accounts) {
      out.push({
        key: `acc-${acc.ma}`,
        isAccount: true,
        isTotal: false,
        drillable: false,
        ma: acc.ma,
        ten: acc.ten,
        val: { dauKy: acc.dauKy, phatSinh: acc.phatSinh, cuoiKy: acc.cuoiKy },
      });
      for (const dt of acc.doiTuongs) {
        out.push({
          key: `acc-${acc.ma}-dt-${dt.ma || "none"}`,
          isAccount: false,
          isTotal: false,
          drillable: !!dt.ma,
          accMa: acc.ma,
          ma: dt.ma,
          ten: dt.ten,
          val: { dauKy: dt.dauKy, phatSinh: dt.phatSinh, cuoiKy: dt.cuoiKy },
        });
      }
    }
    return out;
  }, [data]);

  const numCol = (
    key: string,
    title: string,
    pick: (v: CongNoRowVal) => number,
  ) => ({
    title,
    key,
    align: "right" as const,
    width: 120,
    render: (_: unknown, r: FlatRow) => (
      <span style={{ fontWeight: r.isAccount || r.isTotal ? 700 : 400 }}>
        {fmt(pick(r.val))}
      </span>
    ),
  });

  const columns: ColumnsType<FlatRow> = [
    {
      title: "Mã ĐT",
      dataIndex: "ma",
      key: "ma",
      width: 90,
      render: (text: string, r: FlatRow) => (
        <span style={{ fontWeight: r.isAccount || r.isTotal ? 700 : 400 }}>
          {text}
        </span>
      ),
    },
    {
      title: "Tên đối tượng",
      dataIndex: "ten",
      key: "ten",
      width: 280,
      render: (text: string, r: FlatRow) => (
        <span
          style={{
            fontWeight: r.isAccount || r.isTotal ? 700 : 400,
            color: r.isAccount ? "#1890ff" : "inherit",
            paddingLeft: r.isAccount || r.isTotal ? 0 : 16,
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: "Số dư đầu kỳ",
      children: [
        numCol("dk-pt", "Phải thu", (v) => v.dauKy.phaiThu),
        numCol("dk-ptr", "Phải trả", (v) => v.dauKy.phaiTra),
      ],
    },
    {
      title: "Số phát sinh",
      children: [
        numCol("ps-pt", "Phải thu", (v) => v.phatSinh.phaiThu),
        numCol("ps-ptr", "Phải trả", (v) => v.phatSinh.phaiTra),
      ],
    },
    {
      title: "Số dư cuối kỳ",
      children: [
        numCol("ck-pt", "Phải thu", (v) => v.cuoiKy.phaiThu),
        numCol("ck-ptr", "Phải trả", (v) => v.cuoiKy.phaiTra),
      ],
    },
  ];

  const handleDrill = (r: FlatRow) => {
    if (!r.drillable || !r.accMa) return;
    const q = new URLSearchParams({
      maTaiKhoan: r.accMa,
      maDoiTuong: r.ma,
      startDate: range[0].toISOString(),
      endDate: range[1].toISOString(),
    });
    navigate(`/bao-cao/so-chi-tiet-tai-khoan?${q.toString()}`);
  };

  return (
    <div>
      <Breadcrumb
        items={[
          {
            href: "/",
            title: (
              <>
                <HomeOutlined /> Trang chủ
              </>
            ),
          },
          { title: "Báo cáo" },
          { title: "Bảng tổng hợp công nợ" },
        ]}
        style={{ marginBottom: 16 }}
      />
      <Card
        title={
          <Space>
            <TableOutlined />
            <span>Bảng tổng hợp công nợ</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={fetchData}
            loading={loading}
          >
            Xem báo cáo
          </Button>
        }
      >
        <Space wrap style={{ marginBottom: 16 }}>
          <RangePicker
            value={range}
            format="DD/MM/YYYY"
            allowClear={false}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả tài khoản công nợ"
            style={{ width: 280 }}
            options={tkOptions}
            value={maTaiKhoan}
            onChange={setMaTaiKhoan}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Tất cả đối tượng"
            style={{ width: 280 }}
            options={dtOptions}
            value={maDoiTuong}
            onChange={setMaDoiTuong}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={rows}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          bordered
          scroll={{ y: "calc(100vh - 320px)" }}
          rowClassName={(r) =>
            r.isTotal
              ? "cong-no-total-row"
              : r.isAccount
                ? "cong-no-account-row"
                : ""
          }
          onRow={(r) => ({
            onClick: () => handleDrill(r),
            style: r.drillable
              ? { cursor: "pointer" }
              : r.isAccount
                ? { background: "#fff7e6" }
                : r.isTotal
                  ? { background: "#e6f7ff" }
                  : undefined,
          })}
        />
      </Card>
    </div>
  );
};

export default BangTongHopCongNoPage;
