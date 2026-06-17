import { useEffect } from "react";
import { PhieuHandlerProvider, usePhieuHandler, usePhieuConfig, usePhieuState } from "./PhieuHandlerContext";
import { PhieuConfig } from "./phieuConfig";
import { StatsCards } from "./components/stats/StatsCards";
import { FilterBar } from "./components/filter/FilterBar";
import { PhieuTable } from "./components/table/PhieuTable";
import { PhieuFormModal } from "./components/form-modal/PhieuFormModal";
import { PhieuViewModal } from "./components/view-modal/PhieuViewModal";
import { SummaryTabs } from "./components/summary/SummaryTabs";
import { ImportExcelModal } from "./import/ImportExcelModal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function PhieuListPageInner() {
  const handler = usePhieuHandler();
  const config = usePhieuConfig();
  const [importModalOpen, setImportModalOpen] = usePhieuState("importModalOpen", false);

  useEffect(() => {
    handler.executeEvent("init", { config });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{config.title}</h1>
      <StatsCards />
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Danh sách</TabsTrigger>
          <TabsTrigger value="summary">Tổng hợp</TabsTrigger>
        </TabsList>
        <TabsContent value="list" className="space-y-3">
          <FilterBar />
          <PhieuTable />
        </TabsContent>
        <TabsContent value="summary">
          <SummaryTabs />
        </TabsContent>
      </Tabs>
      <PhieuFormModal />
      <PhieuViewModal />
      <ImportExcelModal
        open={!!importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={() => handler.executeEvent("refresh", {})}
        service={config.service}
      />
    </div>
  );
}

export function PhieuListPage({ config }: { config: PhieuConfig }) {
  return (
    <PhieuHandlerProvider config={config}>
      <PhieuListPageInner />
    </PhieuHandlerProvider>
  );
}
