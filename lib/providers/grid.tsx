import { createContext, useContext, useEffect, useRef, useState } from "react";

interface UseGridProps {
  width: number;
  height: number;
}

interface GridProviderProps {
  gridRef: React.MutableRefObject<HTMLDivElement>;
  children: React.ReactNode;
}

const defaultContext: UseGridProps = {
  width: 0,
  height: 0,
};

const gridContext = createContext<UseGridProps | undefined>(undefined);

export const useGrid = () => useContext(gridContext) ?? defaultContext;

export const GridProvider: React.FC<GridProviderProps> = ({
  gridRef,
  children,
}) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!gridRef || !gridRef.current) return;
    const { clientHeight, clientWidth } = gridRef.current;
    setDimensions({ width: clientWidth, height: clientHeight });
  }, [gridRef.current?.clientHeight, gridRef.current?.clientWidth]);

  return (
    <gridContext.Provider
      value={{ height: dimensions.height, width: dimensions.width }}
    >
      {children}
    </gridContext.Provider>
  );
};
