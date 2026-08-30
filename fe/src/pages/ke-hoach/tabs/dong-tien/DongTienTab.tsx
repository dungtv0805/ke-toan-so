import React, { useEffect } from "react";
import type { LoaiKeHoach } from "@/services/keHoachService";
import {
  DongTienHandlerProvider,
  useDongTienHandler,
} from "./DongTienHandlerContext";
import { DongTienTable } from "./DongTienTable";

interface Props {
  nam: number;
  loaiKeHoach: LoaiKeHoach;
}

const DongTienTabInner: React.FC<Props> = ({ nam, loaiKeHoach }) => {
  const handler = useDongTienHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, loaiKeHoach });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, loaiKeHoach]);

  return <DongTienTable />;
};

export const DongTienTab: React.FC<Props> = (props) => (
  <DongTienHandlerProvider>
    <DongTienTabInner {...props} />
  </DongTienHandlerProvider>
);
