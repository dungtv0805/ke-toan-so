import { createContext, useContext, useState, ReactNode } from 'react';
import { KhoaSoHandler, KhoaSoStates } from './khoaSoHandler';
import { useChandlerState } from '@/common/c-handler/hooks/use-chandler-state';
import { StateKey, StateValue } from '@/common/c-handler/core/actions/c-state.action';

const KhoaSoHandlerContext = createContext<KhoaSoHandler | null>(null);

export function KhoaSoHandlerProvider({ children }: { children: ReactNode }) {
  const [handler] = useState(() => new KhoaSoHandler());
  return (
    <KhoaSoHandlerContext.Provider value={handler}>
      {children}
    </KhoaSoHandlerContext.Provider>
  );
}

export function useKhoaSoHandler() {
  const handler = useContext(KhoaSoHandlerContext);
  if (!handler) throw new Error('useKhoaSoHandler must be used within KhoaSoHandlerProvider');
  return handler;
}

export function useKhoaSoState<K extends StateKey<KhoaSoStates>>(
  key: K,
  initialValue?: StateValue<KhoaSoStates, K>
) {
  const handler = useKhoaSoHandler();
  return useChandlerState<KhoaSoStates, K>(key, handler, initialValue);
}
