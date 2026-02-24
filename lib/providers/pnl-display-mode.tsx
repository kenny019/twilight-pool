"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "twilight-pnl-display-mode";

export type PnlDisplayMode = "btc" | "usd";

type PnlDisplayModeContextValue = {
  pnlDisplayMode: PnlDisplayMode;
  togglePnlDisplayMode: () => void;
};

const defaultContext: PnlDisplayModeContextValue = {
  pnlDisplayMode: "btc",
  togglePnlDisplayMode: () => {},
};

const pnlDisplayModeContext =
  createContext<PnlDisplayModeContextValue | undefined>(undefined);

export const usePnlDisplayMode = () =>
  useContext(pnlDisplayModeContext) ?? defaultContext;

function getStoredMode(): PnlDisplayMode {
  if (typeof window === "undefined") return "btc";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "btc" || stored === "usd") return stored;
  return "btc";
}

export function PnlDisplayModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pnlDisplayMode, setPnlDisplayMode] = useState<PnlDisplayMode>("btc");

  useEffect(() => {
    setPnlDisplayMode(getStoredMode());
  }, []);

  const togglePnlDisplayMode = useCallback(() => {
    setPnlDisplayMode((prev) => {
      const next = prev === "btc" ? "usd" : "btc";
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, next);
      }
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ pnlDisplayMode, togglePnlDisplayMode }),
    [pnlDisplayMode, togglePnlDisplayMode]
  );

  return (
    <pnlDisplayModeContext.Provider value={value}>
      {children}
    </pnlDisplayModeContext.Provider>
  );
}
