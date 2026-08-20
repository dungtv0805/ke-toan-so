import { createContext, useContext, useState, ReactNode } from "react";
import { NhanSuHandler, NhanSuStates } from "./handler/nhan-su.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const NhanSuHandlerContext = createContext<NhanSuHandler | null>(null);

export function NhanSuHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new NhanSuHandler());

  return (
    <NhanSuHandlerContext.Provider value={handler}>
      {children}
    </NhanSuHandlerContext.Provider>
  );
}

export function useNhanSuHandler() {
  const handler = useContext(NhanSuHandlerContext);
  if (!handler) {
    throw new Error(
      "useNhanSuHandler phải dùng bên trong NhanSuHandlerProvider",
    );
  }
  return handler;
}

export function useNhanSuState<K extends StateKey<NhanSuStates>>(
  key: K,
  initialValue?: StateValue<NhanSuStates, K>,
) {
  const handler = useNhanSuHandler();
  return useChandlerState<NhanSuStates, K>(key, handler, initialValue);
}
