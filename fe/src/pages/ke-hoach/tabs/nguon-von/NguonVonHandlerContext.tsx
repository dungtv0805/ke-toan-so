import { createContext, useContext, useState, ReactNode } from "react";
import { NguonVonHandler, NguonVonStates } from "./handler/nguon-von.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const NguonVonHandlerContext = createContext<NguonVonHandler | null>(null);

export function NguonVonHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new NguonVonHandler());

  return (
    <NguonVonHandlerContext.Provider value={handler}>
      {children}
    </NguonVonHandlerContext.Provider>
  );
}

export function useNguonVonHandler() {
  const handler = useContext(NguonVonHandlerContext);
  if (!handler) {
    throw new Error(
      "useNguonVonHandler phải dùng bên trong NguonVonHandlerProvider",
    );
  }
  return handler;
}

export function useNguonVonState<K extends StateKey<NguonVonStates>>(
  key: K,
  initialValue?: StateValue<NguonVonStates, K>,
) {
  const handler = useNguonVonHandler();
  return useChandlerState<NguonVonStates, K>(key, handler, initialValue);
}
