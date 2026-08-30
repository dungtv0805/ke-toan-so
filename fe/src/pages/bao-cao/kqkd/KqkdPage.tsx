import { useEffect, useState } from "react";
import { Alert, Button, message } from "antd";
import { ExportOutlined } from "@ant-design/icons";
import { KqkdHandlerProvider, useKqkdHandler, useKqkdState } from "./KqkdHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { KqkdFilter, type KqkdFilterParams } from "./components/KqkdFilter";
import { KqkdTable } from "./components/KqkdTable";
import type { KqkdReport } from "@/services/kqkdService";
import { exportReportExcel } from "@/utils/exportReportExcel";
import { buildKqkdSheets } from "./kqkdExport";

interface Props {
  /**
   * Bật góc nhìn "P&L KHÔNG KHẤU HAO": BE bỏ phát sinh khấu hao ngay ở tầng
   * đọc bút toán. Chỉ là một góc nhìn — không sửa bút toán, không ảnh hưởng
   * báo cáo tài chính.
   */
  loaiTruKhauHao?: boolean;
  /** Đường dẫn dùng để tra quyền — hai trang có quyền riêng. */
  duongDanQuyen?: string;
  tieuDe?: string;
}

function KqkdPageInner({ loaiTruKhauHao, duongDanQuyen, tieuDe }: Props) {
  const handler = useKqkdHandler();
  const { canExport } = usePagePermission(duongDanQuyen ?? "/bao-cao/kqkd");
  const [kqkdData] = useKqkdState("kqkdData") as [KqkdReport | null, unknown];
  const [loading] = useKqkdState("loading") as [boolean, unknown];

  useEffect(() => {
    handler.executeEvent("init", { loaiTruKhauHao });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaiTruKhauHao]);

  const handleFilter = (params: KqkdFilterParams) => {
    handler.executeEvent("onFilterChange", params);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN");
  };

  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    const chiTieu = kqkdData?.chiTieu ?? [];
    const meta = kqkdData?.kyHienTai && kqkdData?.kyTruoc
      ? [`Kỳ hiện tại: ${formatDate(kqkdData.kyHienTai.startDate)} – ${formatDate(kqkdData.kyHienTai.endDate)}`,
         `Kỳ trước: ${formatDate(kqkdData.kyTruoc.startDate)} – ${formatDate(kqkdData.kyTruoc.endDate)}`]
      : undefined;
    const tenBaoCao = loaiTruKhauHao
      ? "P&L KHÔNG KHẤU HAO"
      : "BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH";
    const sheets = buildKqkdSheets(chiTieu, tenBaoCao, meta);
    if (sheets.length === 0) { message.warning("Không có dữ liệu để xuất"); return; }
    setExporting(true);
    try {
      await exportReportExcel(
        loaiTruKhauHao ? "P&L khong khau hao" : "Bao cao KQKD",
        sheets,
      );
      message.success("Đã xuất Excel");
    } catch (e) {
      console.error("export excel error", e);
      message.error("Xuất Excel thất bại");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="kqkd-page space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          {tieuDe ?? "Báo cáo kết quả hoạt động kinh doanh"}
        </h1>
        {canExport && (
          <Button icon={<ExportOutlined />} onClick={handleExport} loading={exporting}>
            Xuất Excel
          </Button>
        )}
      </div>

      {loaiTruKhauHao && (
        <Alert
          type="info"
          showIcon
          message="Đã loại trừ các phát sinh khấu hao (khoản mục Khấu hao kèm tài khoản 214) ngay từ dữ liệu chi tiết."
          description="Đây chỉ là một góc nhìn báo cáo: bút toán khấu hao vẫn nguyên trong sổ, báo cáo tài chính không đổi."
        />
      )}

      <KqkdFilter onFilter={handleFilter} loading={loading} />

      {kqkdData?.kyHienTai && kqkdData?.kyTruoc && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>
            Kỳ hiện tại: {formatDate(kqkdData.kyHienTai.startDate)} –{" "}
            {formatDate(kqkdData.kyHienTai.endDate)}
          </span>
          <span>
            Kỳ trước: {formatDate(kqkdData.kyTruoc.startDate)} –{" "}
            {formatDate(kqkdData.kyTruoc.endDate)}
          </span>
        </div>
      )}

      <KqkdTable data={kqkdData?.chiTieu ?? []} loading={loading} />
    </div>
  );
}

const KqkdPage: React.FC<Props> = (props) => {
  return (
    <KqkdHandlerProvider>
      <KqkdPageInner {...props} />
    </KqkdHandlerProvider>
  );
};

export default KqkdPage;
