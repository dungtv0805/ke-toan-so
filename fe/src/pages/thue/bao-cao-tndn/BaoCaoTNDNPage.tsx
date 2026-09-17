import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Table,
  Button,
  InputNumber,
  Space,
  Typography,
  Tag,
  message,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import {
  taxReportService,
  BaoCaoTNDN,
  DieuChinhThue,
  NghiaVuChinhSach,
  TNDNQuyData,
} from "@/services/taxService";
import { usePagePermission } from "@/hooks/usePagePermission";
import { useTableColumnFilters } from "@/components/table/useTableColumnFilters";
import { filterTndnRows } from "./tndnFilter";
import { useManHinh } from "@/hooks/useManHinh";
import { RONG_COT_GHIM_DIEN_THOAI } from "@/components/table/ghimTheoManHinh";

const { Text, Title } = Typography;

const fmt = (n?: number) => (n ?? 0).toLocaleString("vi-VN");

// Dòng "Tổng (gồm tự tính)" — 1 dòng, không wrap, cắt gọn nếu dài.
const autoTotalStyle: React.CSSProperties = {
  fontSize: 11,
  color: "hsl(var(--ink-2))",
  marginTop: 2,
  textAlign: "right",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

type InputKey = keyof Omit<DieuChinhThue, "nam">;

interface RowDef {
  key: string;
  tt?: string;
  label: string;
  kind: "calc" | "input" | "rate" | "section" | "nvcs";
  /** kind 'calc': lấy số từ báo cáo TNDN (dùng được cho cả 1 quý lẫn dòng lũy kế). */
  sel?: (q: TNDNQuyData) => number;
  /** kind 'input': field trong bản ghi điều chỉnh thuế. */
  inputKey?: InputKey;
  /** kind 'nvcs': số lấy thẳng từ bảng nghĩa vụ chính sách. */
  vals?: number[];
  valLuyKe?: number;
  /** kind 'input': dòng "Tổng:" dưới ô nhập, khi nguồn không phải cpKhongTruAuto. */
  tongVals?: number[];
  tongLuyKe?: number;
  strong?: boolean;
  /** Thụt vào — dòng chi tiết nằm dưới một dòng tổng. */
  indent?: boolean;
  note?: string;
}

/** Maps inputKey of the 4 non-deductible rows → cpKhongTruAuto array index */
const NHOM_INDEX: Record<string, number> = {
  cpkdtDichVuHangHoa: 0,
  cpkdtTscdCcdc: 1,
  cpkdtNhanCong: 2,
  cpkdtTaiChinhKhac: 3,
};

/**
 * Nhóm THUẾ TNDN — dựng theo đúng bố cục bảng "Tình hình thực hiện nghĩa vụ
 * chính sách" ở Tổng quan (11 chỉ tiêu, doanh thu gộp 511+515+711), chỉ khác là
 * chèn thêm các ô nhập điều chỉnh vì đây là nơi duy nhất nhập được.
 */
const ROWS_TNDN: RowDef[] = [
  { key: "sec-tndn", label: "THUẾ TNDN", kind: "section" },
  { key: "r1", tt: "1", label: "Doanh thu thuần", kind: "calc", sel: (q) => q.dt511 + q.dt515 + q.dt711, note: "Có TK 511 + 515 + 711" },
  { key: "r2", tt: "2", label: "Giá vốn", kind: "calc", sel: (q) => q.cp632, note: "Nợ TK 632" },
  { key: "r3", tt: "3", label: "Chi phí bán hàng", kind: "calc", sel: (q) => q.cp641, note: "Nợ TK 641" },
  { key: "r4", tt: "4", label: "Chi phí quản lý", kind: "calc", sel: (q) => q.cp642, note: "Nợ TK 642" },
  { key: "r5", tt: "5", label: "Chi phí khác", kind: "calc", sel: (q) => q.cp811, note: "Nợ TK 811" },
  { key: "r6", tt: "6", label: "Tổng CP phát sinh", kind: "calc", sel: (q) => q.tongChiPhi, strong: true, note: "632 + 641 + 642 + 811" },
  { key: "r7", tt: "7", label: "Lợi nhuận trước thuế", kind: "calc", sel: (q) => q.lnTruocThue, strong: true },
  { key: "r8", tt: "8", label: "Chi phí không được trừ", kind: "calc", sel: (q) => q.chiPhiKhongTru, strong: true, note: "Tự tính từ chứng từ + số nhập thêm bên dưới" },
  { key: "i1", label: "Chi phí dịch vụ, hàng hóa mua vào", kind: "input", inputKey: "cpkdtDichVuHangHoa", indent: true },
  { key: "i2", label: "Chi phí về TSCĐ, CCDC, CPTT", kind: "input", inputKey: "cpkdtTscdCcdc", indent: true },
  { key: "i3", label: "Chi phí nhân công, bảo hiểm", kind: "input", inputKey: "cpkdtNhanCong", indent: true },
  { key: "i4", label: "Chi phí tài chính, chi phí khác", kind: "input", inputKey: "cpkdtTaiChinhKhac", indent: true },
  { key: "iMien", label: "Thu nhập miễn thuế", kind: "input", inputKey: "thuNhapMienThue" },
  { key: "iLo", label: "Lỗ được chuyển", kind: "input", inputKey: "loDuocChuyen" },
  { key: "r9", tt: "9", label: "Thu nhập tính thuế", kind: "calc", sel: (q) => q.thuNhapTinhThue, strong: true, note: "LN trước thuế + CP không trừ − TN miễn − lỗ chuyển" },
  { key: "rRate", label: "Thuế suất TNDN", kind: "rate", note: "Bậc thang theo doanh thu lũy kế" },
  { key: "r10", tt: "10", label: "Thuế TNDN phải nộp", kind: "calc", sel: (q) => q.thueTNDN, strong: true },
  { key: "r11", tt: "11", label: "Lợi nhuận sau thuế", kind: "calc", sel: (q) => q.lnSauThue, strong: true },
];

/** Ghi chú cho các dòng GTGT — dựng động từ API nên tra theo tên chỉ tiêu. */
const GHI_CHU_GTGT: Record<string, string> = {
  "VAT còn kỳ trước": "Số còn được khấu trừ chuyển sang từ quý trước",
  "VAT bán ra": "Bảng kê bán ra",
  "VAT mua vào": "Bảng kê mua vào",
  "VAT còn phải nộp": "VAT bán ra − VAT mua vào",
};

const BaoCaoTNDNPage: React.FC = () => {
  const { canEdit } = usePagePermission("/thue/bao-cao-tndn");
  const [nam, setNam] = useState<number>(dayjs().year());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bao, setBao] = useState<BaoCaoTNDN | null>(null);
  const [dc, setDc] = useState<DieuChinhThue | null>(null);
  const [nvcs, setNvcs] = useState<NghiaVuChinhSach | null>(null);

  const fetchData = async (namArg = nam) => {
    setLoading(true);
    try {
      const [b, d, n] = await Promise.all([
        taxReportService.getBaoCaoTNDN(namArg),
        taxReportService.getDieuChinh(namArg),
        taxReportService.getNghiaVuChinhSach(namArg),
      ]);
      setBao(b);
      setDc(d);
      setNvcs(n);
    } catch {
      message.error("Không thể tải báo cáo TNDN");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (field: InputKey, qi: number, val: number | null) => {
    if (!dc) return;
    const arr = [...((dc[field] as number[]) || [0, 0, 0, 0])];
    arr[qi] = val || 0;
    setDc({ ...dc, [field]: arr });
  };

  const handleSave = async () => {
    if (!dc) return;
    setSaving(true);
    try {
      await taxReportService.putDieuChinh(nam, dc);
      message.success("Đã lưu điều chỉnh và tính lại báo cáo");
      await fetchData(nam);
    } catch {
      message.error("Lưu điều chỉnh thất bại");
    } finally {
      setSaving(false);
    }
  };

  // Nhóm THUẾ GTGT: chỉ để xem nên dựng thẳng từ bảng nghĩa vụ chính sách —
  // có gì hiện nấy, khỏi phải sửa hai chỗ khi backend thêm bớt chỉ tiêu.
  const rowsGtgt = useMemo<RowDef[]>(() => {
    const sec = nvcs?.sections?.find((s) => s.ma === "GTGT");
    if (!sec?.rows?.length) return [];
    return [
      { key: "sec-gtgt", label: sec.tieuDe, kind: "section" },
      ...sec.rows.map<RowDef>((r, i) => ({
        key: `gtgt-${i}`,
        tt: r.tt,
        label: r.chiTieu,
        kind: "nvcs",
        vals: [r.q1, r.q2, r.q3, r.q4],
        valLuyKe: r.luyKe,
        strong: r.chiTieu.includes("phải nộp"),
        note: GHI_CHU_GTGT[r.chiTieu],
      })),
    ];
  }, [nvcs]);

  // Nhóm THUẾ TNCN: có ô nhập điều chỉnh nên định nghĩa cố định; số "Tổng"
  // (đã gồm phần tự lấy từ Có TK 3335) lấy từ bảng nghĩa vụ chính sách.
  const rowsTncn = useMemo<RowDef[]>(() => {
    const sec = nvcs?.sections?.find((s) => s.ma === "TNCN");
    const r = sec?.rows?.[0];
    return [
      { key: "sec-tncn", label: sec?.tieuDe ?? "THUẾ TNCN", kind: "section" },
      {
        key: "iTNCN",
        tt: r?.tt ?? "1",
        label: r?.chiTieu ?? "Thuế TNCN phải nộp",
        kind: "input",
        inputKey: "thueTNCN",
        strong: true,
        note: "Tự lấy Có TK 3335 + số nhập thêm",
        ...(r
          ? { tongVals: [r.q1, r.q2, r.q3, r.q4], tongLuyKe: r.luyKe }
          : {}),
      },
    ];
  }, [nvcs]);

  const calcCell = (row: RowDef, qi: number): number => {
    const q = bao?.quy?.[qi];
    return q && row.sel ? Number(row.sel(q)) || 0 : 0;
  };

  const calcLuyKe = (row: RowDef): number =>
    bao?.luyKe && row.sel ? Number(row.sel(bao.luyKe)) || 0 : 0;

  /** Số "Tổng:" dưới ô nhập — cpKhongTruAuto cho 4 nhóm CP, tongVals cho dòng khác. */
  const tongCuaOnhap = (row: RowDef, qi: number | "luyKe"): number | null => {
    const nhomIdx = NHOM_INDEX[row.inputKey as string];
    if (nhomIdx !== undefined) {
      const src = qi === "luyKe" ? bao?.luyKe : bao?.quy?.[qi];
      return src?.cpKhongTruAuto?.[nhomIdx] ?? 0;
    }
    if (qi === "luyKe") return row.tongLuyKe ?? null;
    return row.tongVals?.[qi] ?? null;
  };

  const renderOnhap = (row: RowDef, qi: number) => {
    const arr = (dc?.[row.inputKey as InputKey] as number[]) || [0, 0, 0, 0];
    const autoTotal = tongCuaOnhap(row, qi);
    return (
      <div>
        <InputNumber
          size="small"
          value={arr[qi]}
          disabled={!canEdit}
          onChange={(val) => handleInputChange(row.inputKey as InputKey, qi, val)}
          style={{ width: "100%" }}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
          parser={(v) => Number((v || "").replace(/,/g, ""))}
          controls={false}
        />
        {autoTotal !== null && (
          <div style={autoTotalStyle} title={`Tổng gồm tự tính: ${fmt(autoTotal)}`}>
            Tổng: {fmt(autoTotal)}
          </div>
        )}
      </div>
    );
  };

  const renderQuarter = (row: RowDef, qi: number) => {
    if (row.kind === "section") return null;
    if (row.kind === "calc") {
      const v = calcCell(row, qi);
      return row.strong ? <Text strong>{fmt(v)}</Text> : fmt(v);
    }
    if (row.kind === "nvcs") {
      const v = row.vals?.[qi] ?? 0;
      return row.strong ? <Text strong>{fmt(v)}</Text> : fmt(v);
    }
    if (row.kind === "rate") {
      const r = bao?.quy?.[qi]?.thueSuat ?? 0;
      return `${Math.round(r * 100)}%`;
    }
    return renderOnhap(row, qi);
  };

  const renderLuyKe = (row: RowDef) => {
    if (row.kind === "section") return null;
    if (row.kind === "calc") {
      const v = calcLuyKe(row);
      return row.strong ? <Text strong>{fmt(v)}</Text> : fmt(v);
    }
    if (row.kind === "nvcs") {
      const v = row.valLuyKe ?? 0;
      return row.strong ? <Text strong>{fmt(v)}</Text> : fmt(v);
    }
    if (row.kind === "rate") {
      const r = bao?.luyKe?.thueSuat ?? 0;
      return `${Math.round(r * 100)}%`;
    }
    const arr = (dc?.[row.inputKey as InputKey] as number[]) || [0, 0, 0, 0];
    const autoTotalLK = tongCuaOnhap(row, "luyKe");
    const sumManual = arr.reduce((s, x) => s + (x || 0), 0);
    return (
      <div style={{ textAlign: "right" }}>
        <Text strong>{fmt(sumManual)}</Text>
        {autoTotalLK !== null && (
          <div style={autoTotalStyle} title={`Tổng gồm tự tính: ${fmt(autoTotalLK)}`}>
            Tổng: {fmt(autoTotalLK)}
          </div>
        )}
      </div>
    );
  };

  // Lọc theo cột ở header + cố định cột. Bảng có dòng tiêu đề nhóm (kind: 'section') nên
  // việc lọc do `filterTndnRows` lo (ẩn luôn tiêu đề nhóm khi nhóm rỗng).
  const { filterable, filters, hasPinned } = useTableColumnFilters("thue-bao-cao-tndn");
  const allRows = useMemo<RowDef[]>(
    () => [...ROWS_TNDN, ...rowsGtgt, ...rowsTncn],
    [rowsGtgt, rowsTncn],
  );
  const viewRows = useMemo(() => filterTndnRows(allRows, filters), [allRows, filters]);

  // Điện thoại: bảng rộng ~1350px, vuốt ngang là mất tên chỉ tiêu → ghim cột
  // "Chỉ tiêu" (hẹp lại, xuống dòng). Muốn ghim nó thì cột TT đứng trước cũng
  // phải ghim — phí chỗ ở màn 390px — nên bỏ cột TT và ghép số TT vào đầu tên
  // ("1. Doanh thu…"). Dòng tiêu đề nhóm gộp trọn số cột đang hiển thị.
  const dienThoai = useManHinh() === "mobile";
  const soCot = dienThoai ? 7 : 8;

  const quarterCol = (qi: number) => ({
    title: `Quý ${qi + 1}`,
    key: `q${qi}`,
    width: 160,
    align: "right" as const,
    onCell: (row: RowDef) =>
      row.kind === "section" ? { colSpan: 0 } : {},
    render: (_: unknown, row: RowDef) => renderQuarter(row, qi),
  });

  const cotTT = {
    title: "TT",
    dataIndex: "tt",
    key: "tt",
    width: 44,
    align: "center" as const,
    onCell: (row: RowDef) =>
      row.kind === "section" ? { colSpan: 0 } : {},
  };

  const columns = [
    ...(dienThoai ? [] : [cotTT]),
    filterable<RowDef>({
      title: "Chỉ tiêu",
      dataIndex: "label",
      key: "label",
      width: dienThoai ? RONG_COT_GHIM_DIEN_THOAI : 280,
      fixed: dienThoai ? ("left" as const) : undefined,
      onCell: (row: RowDef) =>
        row.kind === "section" ? { colSpan: soCot } : {},
      render: (v: string, row: RowDef) => {
        if (row.kind === "section")
          return <Text strong className="text-primary">{v}</Text>;
        const nhan = dienThoai && row.tt ? `${row.tt}. ${v}` : v;
        const noiDung = row.strong ? <Text strong>{nhan}</Text> : nhan;
        return row.indent ? (
          <span style={{ paddingLeft: 16 }}>{noiDung}</span>
        ) : (
          noiDung
        );
      },
    }),
    quarterCol(0),
    quarterCol(1),
    quarterCol(2),
    quarterCol(3),
    {
      title: "Lũy kế",
      key: "luyKe",
      width: 170,
      align: "right" as const,
      onCell: (row: RowDef) =>
        row.kind === "section" ? { colSpan: 0 } : {},
      render: (_: unknown, row: RowDef) => renderLuyKe(row),
    },
    filterable<RowDef>({
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 220,
      onCell: (row: RowDef) =>
        row.kind === "section" ? { colSpan: 0 } : {},
      render: (v?: string) => (v ? <Text type="secondary">{v}</Text> : null),
    }),
  ];

  return (
    <div className="space-y-3">
      <Card>
        <Space className="mb-4" wrap>
          <Title level={5} className="!mb-0">
            Tình hình thực hiện nghĩa vụ thuế
          </Title>
          <Text strong>Năm:</Text>
          <InputNumber
            value={nam}
            onChange={(v) => {
              const y = v || dayjs().year();
              setNam(y);
              fetchData(y);
            }}
            style={{ width: 110 }}
          />
          <Tag color="blue">Doanh thu lũy kế: {fmt(bao?.luyKe?.doanhThuLuyKe)}</Tag>
          {canEdit && (
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              Lưu & tính lại
            </Button>
          )}
        </Space>

        <Table
          columns={columns}
          dataSource={viewRows}
          rowKey="key"
          loading={loading}
          pagination={false}
          size="small"
          // Cột ghim (fixed) chỉ có tác dụng khi bảng cuộn ngang được.
          scroll={{ x: hasPinned ? "max-content" : 1240, y: "calc(100vh - 280px)" }}
        />
      </Card>
    </div>
  );
};

export default BaoCaoTNDNPage;
