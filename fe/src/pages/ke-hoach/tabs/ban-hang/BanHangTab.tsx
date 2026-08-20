import React, { useEffect } from "react";
import {
  BanHangHandlerProvider,
  useBanHangHandler,
} from "./BanHangHandlerContext";
import { BanHangTable } from "./BanHangTable";

const BanHangTabInner: React.FC<{ nam: number }> = ({ nam }) => {
  const handler = useBanHangHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam]);

  return <BanHangTable />;
};

export const BanHangTab: React.FC<{ nam: number }> = ({ nam }) => (
  <BanHangHandlerProvider>
    <BanHangTabInner nam={nam} />
  </BanHangHandlerProvider>
);
