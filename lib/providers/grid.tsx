import { createContext, useContext, useEffect, useMemo, useState } from "react";
import useWindow from "../hooks/useWindow";

interface UseGridProps {
  width: number;
  height: number;
  setDimensions?: React.Dispatch<{ width: number; height: number }>;
}

interface GridProviderProps {
  callbackDimensions: { width: number; height: number };
  gridRef: React.MutableRefObject<HTMLDivElement>;
  children: React.ReactNode;
}

const defaultContext: UseGridProps = {
  width: 600,
  height: 300,
};

const gridContext = createContext<UseGridProps | undefined>(undefined);

export const useGrid = () => useContext(gridContext) ?? defaultContext;

export const GridProvider: React.FC<GridProviderProps> = ({
  callbackDimensions,
  gridRef,
  children,
}) => {
  // todo: add constant default dimensions
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });

  const { height: windowHeight, width: windowWidth } = useWindow();

  function useUpdateCallbackDimensions() {
    useEffect(() => {
      if (!callbackDimensions) return;

      setDimensions({
        width: callbackDimensions.width,
        height: callbackDimensions.height,
      });
    }, [
      callbackDimensions,
      callbackDimensions?.width,
      callbackDimensions?.height,
    ]);
  }

  function useUpdateGridDimensions() {
    useEffect(() => {
      if (!gridRef.current) return;

      const { clientHeight, clientWidth } = gridRef.current;

      setDimensions({
        width: clientWidth,
        height: clientHeight,
      });
    }, [
      gridRef.current,
      gridRef.current?.clientHeight,
      gridRef.current?.clientWidth,
      windowHeight,
      windowWidth,
    ]);
  }

  useUpdateGridDimensions();
  useUpdateCallbackDimensions();

  const value = useMemo(() => {
    return {
      width: dimensions.width,
      height: dimensions.height,
      setDimensions,
    };
  }, [dimensions.width, dimensions.height]);

  return <gridContext.Provider value={value}>{children}</gridContext.Provider>;
};
