import React, { useEffect } from "react";
import type { LoaiKeHoach } from "@/services/keHoachService";
import { KqkdHandlerProvider, useKqkdHandler } from "./KqkdHandlerContext";
import { KqkdTable } from "./KqkdTable";

interface Props {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
  phienBan?: string;
}

const KqkdTabInner: React.FC<Props> = ({ nam, loaiKeHoach, phienBan }) => {
  const handler = useKqkdHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, loaiKeHoach, phienBan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, loaiKeHoach, phienBan]);

  return <KqkdTable />;
};

export const KqkdTab: React.FC<Props> = (props) => (
  <KqkdHandlerProvider>
    <KqkdTabInner {...props} />
  </KqkdHandlerProvider>
);
