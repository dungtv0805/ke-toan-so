import { useEffect } from "react";
import { PhanQuyenHandlerProvider, usePhanQuyenHandler } from "./PhanQuyenHandlerContext";
import { PhanQuyenHeader } from "./components/header/PhanQuyenHeader";
import { PhanQuyenStats } from "./components/stats/PhanQuyenStats";
import { PhanQuyenTable } from "./components/table/PhanQuyenTable";
import { PhanQuyenModal } from "./components/modal/PhanQuyenModal";
import { RoleReferenceCard } from "./components/role-reference/RoleReferenceCard";

function PhanQuyenPageInner() {
  const handler = usePhanQuyenHandler();

  useEffect(() => {
    handler.executeEvent("init", {});
  }, [handler]);

  return (
    <div className="p-6">
      <PhanQuyenHeader />
      <PhanQuyenStats />
      <PhanQuyenTable />
      <RoleReferenceCard />
      <PhanQuyenModal />
    </div>
  );
}

const PhanQuyenPage: React.FC = () => {
  return (
    <PhanQuyenHandlerProvider>
      <PhanQuyenPageInner />
    </PhanQuyenHandlerProvider>
  );
};

export default PhanQuyenPage;
