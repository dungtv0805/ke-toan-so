import React, { useEffect } from "react";
import type { LoaiKeHoach } from "@/services/keHoachService";
import {
  NhanSuHandlerProvider,
  useNhanSuHandler,
} from "./NhanSuHandlerContext";
import { NhanSuTable } from "./NhanSuTable";

interface Props {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
}

const NhanSuTabInner: React.FC<Props> = ({ nam, loaiKeHoach }) => {
  const handler = useNhanSuHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, loaiKeHoach });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, loaiKeHoach]);

  return <NhanSuTable />;
};

export const NhanSuTab: React.FC<Props> = (props) => (
  <NhanSuHandlerProvider>
    <NhanSuTabInner {...props} />
  </NhanSuHandlerProvider>
);
