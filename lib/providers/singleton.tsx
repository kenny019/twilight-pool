import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useLocalStorage } from "../hooks";

interface UseTwilightProps {
  hasInit: string;
  setHasInit: (val: string) => void;
  colorTheme: string;
  setColorTheme: (val: string) => void;
}

interface TwilightProviderProps {
  hasInit?: string;
  children: React.ReactNode;
}

const defaultContext: UseTwilightProps = {
  hasInit: "",
  setHasInit: () => {},
  colorTheme: "pink",
  setColorTheme: () => {},
};

const twilightContext = createContext<UseTwilightProps | undefined>(undefined);

export const useTwilight = () => useContext(twilightContext) ?? defaultContext;

export const TwilightProvider: React.FC<TwilightProviderProps> = (props) => {
  return <Twilight {...props} />;
};

export const ThemeColors = ["pink", "purple", "orange"] as const;

const Twilight: React.FC<TwilightProviderProps> = ({ children }) => {
  const [hasInit, setHasInit] = useLocalStorage("init");
  const [storedColorTheme, setColorTheme] = useLocalStorage("color-theme");

  const colorTheme = storedColorTheme || "pink";

  function useUpdateColorTheme() {
    useEffect(() => {
      const root = window.document.documentElement;

      root.classList.remove(...ThemeColors);

      root.classList.add(colorTheme);
    }, [colorTheme]);
  }

  useUpdateColorTheme();

  const providerValue = useMemo(
    () => ({
      hasInit,
      setHasInit,
      colorTheme: colorTheme || "pink",
      setColorTheme,
    }),
    [hasInit, setHasInit, colorTheme, setColorTheme]
  );

  return (
    <twilightContext.Provider value={providerValue}>
      {children}
    </twilightContext.Provider>
  );
};