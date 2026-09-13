import React, { useEffect } from "react";
import type { NguonKqkd } from "@/services/kqkdKeHoachService";
import { KqkdHandlerProvider, useKqkdHandler } from "./KqkdHandlerContext";
import { KqkdTable } from "./KqkdTable";

interface Props {
  nam: number;
  /** 'KE_HOACH' | 'DU_BAO' đọc số kế hoạch; 'THUC_HIEN' đọc chứng từ thực tế. */
  loaiKeHoach: NguonKqkd;
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
