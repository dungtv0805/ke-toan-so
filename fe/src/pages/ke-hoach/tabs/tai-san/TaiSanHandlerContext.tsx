import { createContext, useContext, useState, ReactNode } from "react";
import { TaiSanHandler, TaiSanStates } from "./handler/tai-san.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const TaiSanHandlerContext = createContext<TaiSanHandler | null>(null);

export function TaiSanHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new TaiSanHandler());

  return (
    <TaiSanHandlerContext.Provider value={handler}>
      {children}
    </TaiSanHandlerContext.Provider>
  );
}

export function useTaiSanHandler() {
  const handler = useContext(TaiSanHandlerContext);
  if (!handler) {
    throw new Error(
      "useTaiSanHandler phải dùng bên trong TaiSanHandlerProvider",
    );
  }
  return handler;
}

export function useTaiSanState<K extends StateKey<TaiSanStates>>(
  key: K,
  initialValue?: StateValue<TaiSanStates, K>,
) {
  const handler = useTaiSanHandler();
  return useChandlerState<TaiSanStates, K>(key, handler, initialValue);
}
