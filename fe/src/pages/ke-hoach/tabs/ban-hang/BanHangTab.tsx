import React, { useEffect } from "react";
import type { LoaiKeHoach } from "@/services/keHoachService";
import {
  BanHangHandlerProvider,
  useBanHangHandler,
} from "./BanHangHandlerContext";
import { BanHangTable } from "./BanHangTable";

interface Props {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
}

const BanHangTabInner: React.FC<Props> = ({ nam, loaiKeHoach }) => {
  const handler = useBanHangHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, loaiKeHoach });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, loaiKeHoach]);

  return <BanHangTable />;
};

export const BanHangTab: React.FC<Props> = (props) => (
  <BanHangHandlerProvider>
    <BanHangTabInner {...props} />
  </BanHangHandlerProvider>
);
