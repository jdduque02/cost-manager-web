import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";

import { HIDE_AMOUNTS_KEY } from "@/lib/format";

interface VisibilityState {
  /** true = los montos se muestran enmascarados (solo visual, no es cifrado). */
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

const VisibilityContext = createContext<VisibilityState | null>(null);

export function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const [hidden, setHiddenState] = useState(false);

  // Se lee tras montar para no desajustar la hidratación SSR.
  useEffect(() => {
    try {
      if (window.localStorage.getItem(HIDE_AMOUNTS_KEY) === "1") setHiddenState(true);
    } catch {
      // sin storage: queda en memoria
    }
  }, []);

  const setHidden = useCallback((value: boolean) => {
    setHiddenState(value);
    try {
      window.localStorage.setItem(HIDE_AMOUNTS_KEY, value ? "1" : "0");
    } catch {
      // ignore
    }
  }, []);

  const contextValue = useMemo(() => ({ hidden, setHidden }), [hidden, setHidden]);

  return <VisibilityContext.Provider value={contextValue}>{children}</VisibilityContext.Provider>;
}

export function useVisibility() {
  const ctx = useContext(VisibilityContext);
  if (!ctx) throw new Error("useVisibility must be used within VisibilityProvider");
  return ctx;
}
