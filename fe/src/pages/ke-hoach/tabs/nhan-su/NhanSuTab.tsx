import React, { useEffect } from "react";
import {
  NhanSuHandlerProvider,
  useNhanSuHandler,
} from "./NhanSuHandlerContext";
import { NhanSuTable } from "./NhanSuTable";

const NhanSuTabInner: React.FC<{ nam: number }> = ({ nam }) => {
  const handler = useNhanSuHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam]);

  return <NhanSuTable />;
};

export const NhanSuTab: React.FC<{ nam: number }> = ({ nam }) => (
  <NhanSuHandlerProvider>
    <NhanSuTabInner nam={nam} />
  </NhanSuHandlerProvider>
);
