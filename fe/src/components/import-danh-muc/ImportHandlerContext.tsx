import { createContext, useContext, useState, ReactNode } from "react";
import { ImportDanhMucHandler } from "./import.handler";
import { ImportDanhMucStates } from "./import.state";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import {
  StateKey,
  StateValue,
} from "@/common/c-handler/core/actions/c-state.action";

const Ctx = createContext<ImportDanhMucHandler | null>(null);

export function ImportHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new ImportDanhMucHandler());
  return <Ctx.Provider value={handler}>{children}</Ctx.Provider>;
}

export function useImportHandler(): ImportDanhMucHandler {
  const handler = useContext(Ctx);
  if (!handler) {
    throw new Error("useImportHandler phải nằm trong ImportHandlerProvider");
  }
  return handler;
}

export function useImportState<K extends StateKey<ImportDanhMucStates>>(
  key: K,
  initialValue?: StateValue<ImportDanhMucStates, K>,
) {
  const handler = useImportHandler();
  return useChandlerState<ImportDanhMucStates, K>(key, handler, initialValue);
}
