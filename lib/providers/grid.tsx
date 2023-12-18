import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  const [oldCallbackDimension, setOldCallbackDimension] = useState({
    width: 0,
    height: 0,
  });

  const value = useMemo(() => {
    if (!gridRef || !gridRef.current) return;
    const { clientHeight, clientWidth } = gridRef.current;

    if (
      dimensions.width !== clientWidth ||
      dimensions.height !== clientHeight
    ) {
      setDimensions({ width: clientWidth - 16, height: clientHeight - 62 }); // todo: fix this hack
    }

    return {
      width: dimensions.width,
      height: dimensions.height,
      setDimensions,
    };
  }, [gridRef.current?.clientHeight, gridRef.current?.clientWidth]);

  useEffect(() => {
    if (!callbackDimensions) return;

    console.log("callbackdim", callbackDimensions, oldCallbackDimension);

    setDimensions({
      width: callbackDimensions.width,
      height: callbackDimensions.height,
    });

    setOldCallbackDimension({
      width: callbackDimensions.width,
      height: callbackDimensions.height,
    });
  }, [
    callbackDimensions,
    callbackDimensions?.width,
    callbackDimensions?.height,
  ]);

  return <gridContext.Provider value={value}>{children}</gridContext.Provider>;
};
