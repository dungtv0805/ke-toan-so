import { createContext, useContext, useState, ReactNode } from "react";
import { BanHangHandler, BanHangStates } from "./handler/ban-hang.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const BanHangHandlerContext = createContext<BanHangHandler | null>(null);

export function BanHangHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new BanHangHandler());

  return (
    <BanHangHandlerContext.Provider value={handler}>
      {children}
    </BanHangHandlerContext.Provider>
  );
}

export function useBanHangHandler() {
  const handler = useContext(BanHangHandlerContext);
  if (!handler) {
    throw new Error(
      "useBanHangHandler phải dùng bên trong BanHangHandlerProvider",
    );
  }
  return handler;
}

export function useBanHangState<K extends StateKey<BanHangStates>>(
  key: K,
  initialValue?: StateValue<BanHangStates, K>,
) {
  const handler = useBanHangHandler();
  return useChandlerState<BanHangStates, K>(key, handler, initialValue);
}
