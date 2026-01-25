import { useEffect, useRef } from "react";
import { NhatKyChungHandlerProvider, useNhatKyChungHandler, useNhatKyChungState } from "./NhatKyChungHandlerContext";
import { PageHeader } from "./components/page-header/PageHeader";
import { StatsCards } from "./components/stats-cards/StatsCards";
import { DataTabs } from "./components/data-tabs/DataTabs";
import { EntryFormModal } from "./components/entry-form-modal/EntryFormModal";
import { EntryViewModal } from "./components/entry-view-modal/EntryViewModal";

function NhatKyChungPageInner() {
  const handler = useNhatKyChungHandler();
  const tableRef = useRef<HTMLDivElement>(null);
  const [loading] = useNhatKyChungState("loading", true);
  const hasScrolled = useRef(false);

  useEffect(() => {
    handler.executeEvent("init", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Scroll to table when data loaded
  useEffect(() => {
    if (!loading && !hasScrolled.current && tableRef.current) {
      hasScrolled.current = true;
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [loading]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader />
      <StatsCards />
      <div ref={tableRef}>
        <DataTabs />
      </div>
      <EntryFormModal />
      <EntryViewModal />
    </div>
  );
}

const NhatKyChungPage: React.FC = () => {
  return (
    <NhatKyChungHandlerProvider>
      <NhatKyChungPageInner />
    </NhatKyChungHandlerProvider>
  );
};

export default NhatKyChungPage;
