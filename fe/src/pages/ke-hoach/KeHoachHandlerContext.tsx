import { createContext, useContext, useState, ReactNode } from "react";
import { KeHoachHandler, KeHoachStates } from "./handler/ke-hoach.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const KeHoachHandlerContext = createContext<KeHoachHandler | null>(null);

export function KeHoachHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new KeHoachHandler());

  return (
    <KeHoachHandlerContext.Provider value={handler}>
      {children}
    </KeHoachHandlerContext.Provider>
  );
}

export function useKeHoachHandler() {
  const handler = useContext(KeHoachHandlerContext);
  if (!handler) {
    throw new Error("useKeHoachHandler phải dùng bên trong KeHoachHandlerProvider");
  }
  return handler;
}

export function useKeHoachState<K extends StateKey<KeHoachStates>>(
  key: K,
  initialValue?: StateValue<KeHoachStates, K>,
) {
  const handler = useKeHoachHandler();
  return useChandlerState<KeHoachStates, K>(key, handler, initialValue);
}
