import React, { useEffect } from "react";
import type { LoaiKeHoach } from "@/services/keHoachService";
import {
  NguonVonHandlerProvider,
  useNguonVonHandler,
} from "./NguonVonHandlerContext";
import { NguonVonTable } from "./NguonVonTable";

interface Props {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
}

const NguonVonTabInner: React.FC<Props> = ({ nam, loaiKeHoach }) => {
  const handler = useNguonVonHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, loaiKeHoach });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, loaiKeHoach]);

  return <NguonVonTable />;
};

export const NguonVonTab: React.FC<Props> = (props) => (
  <NguonVonHandlerProvider>
    <NguonVonTabInner {...props} />
  </NguonVonHandlerProvider>
);
