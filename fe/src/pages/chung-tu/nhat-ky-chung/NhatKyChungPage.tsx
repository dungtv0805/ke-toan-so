import { useEffect } from "react";
import { NhatKyChungHandlerProvider, useNhatKyChungHandler } from "./NhatKyChungHandlerContext";
import { DataTabs } from "./components/data-tabs/DataTabs";
import { EntryFormModal } from "./components/entry-form-modal/EntryFormModal";
import { EntryViewModal } from "./components/entry-view-modal/EntryViewModal";
import { SectionNav } from "@/components/layout/SectionNav";
import { CHUNG_TU_NAV } from "@/config/sectionNavs";

function NhatKyChungPageInner() {
  const handler = useNhatKyChungHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="nkc-page">
      <SectionNav items={CHUNG_TU_NAV} className="mb-2" />
      <DataTabs />
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
