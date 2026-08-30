import React, { useEffect } from "react";
import {
  Pnl3LopHandlerProvider,
  usePnl3LopHandler,
} from "./Pnl3LopHandlerContext";
import { Pnl3LopTable } from "./Pnl3LopTable";

interface Props {
  nam: number;
  phienBan?: string;
}

const Pnl3LopTabInner: React.FC<Props> = ({ nam, phienBan }) => {
  const handler = usePnl3LopHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, phienBan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, phienBan]);

  return <Pnl3LopTable />;
};

/**
 * P&L ba lớp KẾ HOẠCH – DỰ BÁO – THỰC HIỆN.
 *
 * Không nhận `loaiKeHoach`: bảng này LUÔN hiện cả ba lớp, dù mở từ trang Kế
 * hoạch hay trang Dự báo.
 */
export const Pnl3LopTab: React.FC<Props> = (props) => (
  <Pnl3LopHandlerProvider>
    <Pnl3LopTabInner {...props} />
  </Pnl3LopHandlerProvider>
);
