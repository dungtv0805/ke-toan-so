import { createContext, useContext, useState, ReactNode } from "react";
import { KeHoachFormHandler, KeHoachFormStates } from "./form-handler/ke-hoach-form.handler";
import { useChandlerState } from "@/common/c-handler/hooks/use-chandler-state";
import { StateKey, StateValue } from "@/common/c-handler/core/actions/c-state.action";

const KeHoachFormHandlerContext = createContext<KeHoachFormHandler | null>(null);

export function KeHoachFormHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new KeHoachFormHandler());

  return (
    <KeHoachFormHandlerContext.Provider value={handler}>
      {children}
    </KeHoachFormHandlerContext.Provider>
  );
}

export function useKeHoachFormHandler() {
  const handler = useContext(KeHoachFormHandlerContext);
  if (!handler) {
    throw new Error("useKeHoachFormHandler phải dùng bên trong KeHoachFormHandlerProvider");
  }
  return handler;
}

export function useKeHoachFormState<K extends StateKey<KeHoachFormStates>>(
  key: K,
  initialValue?: StateValue<KeHoachFormStates, K>,
) {
  const handler = useKeHoachFormHandler();
  return useChandlerState<KeHoachFormStates, K>(key, handler, initialValue);
}
