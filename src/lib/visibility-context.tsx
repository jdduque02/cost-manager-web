import React, { createContext, useContext, useState, useCallback, useRef, useMemo } from "react";
import { decryptNumber, maskValue } from "@/lib/encryption";

export type VisibilityMode = "visible" | "masked" | "encrypted";

interface VisibilityState {
  mode: VisibilityMode;
  setMasked: () => void;
  setEncrypted: (password: string) => void;
  setVisible: () => void;
  decryptNumber: (encrypted: string) => Promise<number>;
  /** Format a number: returns masked/encrypted/real based on current mode */
  formatAmount: (value: number, encrypted?: string) => string;
}

const VisibilityContext = createContext<VisibilityState | null>(null);

export function VisibilityProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<VisibilityMode>("visible");
  const passwordRef = useRef<string>("");
  // Cache decrypted values to avoid re-decrypting on every render
  const cacheRef = useRef<Map<string, number>>(new Map());

  const setMasked = useCallback(() => {
    setMode("masked");
    passwordRef.current = "";
    cacheRef.current.clear();
  }, []);

  const setEncrypted = useCallback((password: string) => {
    passwordRef.current = password;
    cacheRef.current.clear();
    setMode("encrypted");
  }, []);

  const setVisible = useCallback(() => {
    setMode("visible");
    passwordRef.current = "";
    cacheRef.current.clear();
  }, []);

  const decryptValue = useCallback(async (encrypted: string): Promise<number> => {
    if (cacheRef.current.has(encrypted)) {
      return cacheRef.current.get(encrypted)!;
    }
    if (!passwordRef.current) return 0;
    try {
      const val = await decryptNumber(encrypted, passwordRef.current);
      cacheRef.current.set(encrypted, val);
      return val;
    } catch {
      return 0;
    }
  }, []);

  const formatAmount = useCallback(
    (value: number, encryptedValue?: string): string => {
      if (mode === "visible") {
        return value.toLocaleString("es-CO");
      }
      if (mode === "masked") {
        return maskValue();
      }
      // encrypted mode — show masked, actual decryption happens on demand
      if (encryptedValue) {
        return maskValue();
      }
      return maskValue();
    },
    [mode],
  );

  const contextValue = useMemo(
    () => ({
      mode,
      setMasked,
      setEncrypted,
      setVisible,
      decryptNumber: decryptValue,
      formatAmount,
    }),
    [mode, setMasked, setEncrypted, setVisible, decryptValue, formatAmount],
  );

  return (
    <VisibilityContext.Provider value={contextValue}>
      {children}
    </VisibilityContext.Provider>
  );
}

export function useVisibility() {
  const ctx = useContext(VisibilityContext);
  if (!ctx) throw new Error("useVisibility must be used within VisibilityProvider");
  return ctx;
}
