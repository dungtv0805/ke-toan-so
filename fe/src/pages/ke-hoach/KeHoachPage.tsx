import React, { useEffect } from "react";
import { Card } from "antd";
import type { LoaiKeHoach } from "@/services/keHoachService";
import { KeHoachHandlerProvider, useKeHoachHandler, useKeHoachState } from "./KeHoachHandlerContext";
import { FilterBar } from "./components/FilterBar";
import { KeHoachTable } from "./components/KeHoachTable";
import { SoSanhTable } from "./components/SoSanhTable";

interface Props {
  /** KE_HOACH cho /trung-tam-du-lieu/ke-hoach, DU_BAO cho /trung-tam-du-lieu/du-bao. */
  loaiKeHoach: LoaiKeHoach;
}

const KeHoachPageInner: React.FC<Props> = ({ loaiKeHoach }) => {
  const handler = useKeHoachHandler();
  const [view] = useKeHoachState("view", "list");

  useEffect(() => {
    handler.executeEvent("init", { loaiKeHoach });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaiKeHoach]);

  return (
    <div className="p-2">
      <FilterBar />
      <Card size="small" styles={{ body: { padding: 0 } }}>
        {view === "list" ? <KeHoachTable /> : <SoSanhTable />}
      </Card>
    </div>
  );
};

const KeHoachPage: React.FC<Props> = ({ loaiKeHoach }) => (
  <KeHoachHandlerProvider>
    <KeHoachPageInner loaiKeHoach={loaiKeHoach} />
  </KeHoachHandlerProvider>
);

export default KeHoachPage;
