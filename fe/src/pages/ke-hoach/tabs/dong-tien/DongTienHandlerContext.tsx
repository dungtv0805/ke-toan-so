import { createContext, useContext, useState, ReactNode } from "react";
import { DongTienHandler, DongTienStates } from "./handler/dong-tien.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const DongTienHandlerContext = createContext<DongTienHandler | null>(null);

export function DongTienHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new DongTienHandler());

  return (
    <DongTienHandlerContext.Provider value={handler}>
      {children}
    </DongTienHandlerContext.Provider>
  );
}

export function useDongTienHandler() {
  const handler = useContext(DongTienHandlerContext);
  if (!handler) {
    throw new Error(
      "useDongTienHandler phải dùng bên trong DongTienHandlerProvider",
    );
  }
  return handler;
}

export function useDongTienState<K extends StateKey<DongTienStates>>(
  key: K,
  initialValue?: StateValue<DongTienStates, K>,
) {
  const handler = useDongTienHandler();
  return useChandlerState<DongTienStates, K>(key, handler, initialValue);
}
