import { createContext, useContext, useState, ReactNode } from "react";
import { ChoToiDuyetHandler, ChoToiDuyetStates } from "./choToiDuyetHandler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const Ctx = createContext<ChoToiDuyetHandler | null>(null);

export function ChoToiDuyetHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new ChoToiDuyetHandler());
  return <Ctx.Provider value={handler}>{children}</Ctx.Provider>;
}

export function useChoToiDuyetHandler() {
  const handler = useContext(Ctx);
  if (!handler) {
    throw new Error(
      "useChoToiDuyetHandler phải dùng bên trong ChoToiDuyetHandlerProvider",
    );
  }
  return handler;
}

export function useChoToiDuyetState<K extends StateKey<ChoToiDuyetStates>>(
  key: K,
  initialValue?: StateValue<ChoToiDuyetStates, K>,
) {
  const handler = useChoToiDuyetHandler();
  return useChandlerState<ChoToiDuyetStates, K>(key, handler, initialValue);
}
