import { useEffect } from "react";
import { KqkdHandlerProvider, useKqkdHandler, useKqkdState } from "./KqkdHandlerContext";
import { usePagePermission } from "@/hooks/usePagePermission";
import { KqkdFilter, type KqkdFilterParams } from "./components/KqkdFilter";
import { KqkdTable } from "./components/KqkdTable";
import type { KqkdReport } from "@/services/kqkdService";

function KqkdPageInner() {
  const handler = useKqkdHandler();
  const { canExport } = usePagePermission("/bao-cao/kqkd");
  const [kqkdData] = useKqkdState("kqkdData") as [KqkdReport | null, unknown];
  const [loading] = useKqkdState("loading") as [boolean, unknown];

  useEffect(() => {
    handler.executeEvent("init", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (params: KqkdFilterParams) => {
    handler.executeEvent("onFilterChange", params);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN");
  };

  return (
    <div className="kqkd-page space-y-4 p-4">
      <h1 className="text-xl font-semibold">
        Báo cáo kết quả hoạt động kinh doanh
      </h1>

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

const KqkdPage: React.FC = () => {
  return (
    <KqkdHandlerProvider>
      <KqkdPageInner />
    </KqkdHandlerProvider>
  );
};

export default KqkdPage;
