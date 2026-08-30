import { createContext, useContext, useState, ReactNode } from "react";
import { Pnl3LopHandler, Pnl3LopStates } from "./handler/pnl-3-lop.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const Pnl3LopHandlerContext = createContext<Pnl3LopHandler | null>(null);

export function Pnl3LopHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new Pnl3LopHandler());

  return (
    <Pnl3LopHandlerContext.Provider value={handler}>
      {children}
    </Pnl3LopHandlerContext.Provider>
  );
}

export function usePnl3LopHandler() {
  const handler = useContext(Pnl3LopHandlerContext);
  if (!handler) {
    throw new Error("usePnl3LopHandler phải dùng bên trong Pnl3LopHandlerProvider");
  }
  return handler;
}

export function usePnl3LopState<K extends StateKey<Pnl3LopStates>>(
  key: K,
  initialValue?: StateValue<Pnl3LopStates, K>,
) {
  const handler = usePnl3LopHandler();
  return useChandlerState<Pnl3LopStates, K>(key, handler, initialValue);
}
