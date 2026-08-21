import React, { useEffect } from "react";
import { KqkdHandlerProvider, useKqkdHandler } from "./KqkdHandlerContext";
import { KqkdTable } from "./KqkdTable";

interface Props {
  nam: number;
  phienBan?: string;
}

const KqkdTabInner: React.FC<Props> = ({ nam, phienBan }) => {
  const handler = useKqkdHandler();

  useEffect(() => {
    handler.executeEvent("init", { nam, phienBan });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nam, phienBan]);

  return <KqkdTable />;
};

export const KqkdTab: React.FC<Props> = (props) => (
  <KqkdHandlerProvider>
    <KqkdTabInner {...props} />
  </KqkdHandlerProvider>
);
