import React, { useEffect } from "react";
import type { LoaiKeHoach } from "@/services/keHoachService";
import {
  TaiSanHandlerProvider,
  useTaiSanHandler,
} from "./TaiSanHandlerContext";
import { TaiSanTable } from "./TaiSanTable";

interface Props {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
}

const TaiSanTabInner: React.FC<Props> = ({ nam, loaiKeHoach }) => {
  const handler = useTaiSanHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, loaiKeHoach });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, loaiKeHoach]);

  return <TaiSanTable />;
};

export const TaiSanTab: React.FC<Props> = (props) => (
  <TaiSanHandlerProvider>
    <TaiSanTabInner {...props} />
  </TaiSanHandlerProvider>
);
