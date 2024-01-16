import cn from "@/lib/cn";
import { GridProvider } from "@/lib/providers/grid";
import React, { forwardRef } from "react";

type Props = {
  title?: string;
  name: string;
  dimension: { name: string; width: number; height: number }[];
  children?: React.ReactNode;
};

const DragWrapper = forwardRef<
  HTMLDivElement,
  React.PropsWithoutRef<Props> & React.ComponentPropsWithoutRef<"div">
>(({ title, name, dimension, children, className, ...props }, ref) => {
  return (
    <div
      className={cn(
        className,
        "overflow-hidden rounded-md border bg-background"
      )}
      ref={ref}
      {...props}
    >
      <div className="draggable min-h-[38px] w-full cursor-grab select-none border-b py-2 pl-3 text-sm active:cursor-grabbing">
        {title}
      </div>
      <GridProvider
        callbackDimensions={dimension.filter((dim) => dim.name === name)[0]}
        gridRef={ref as React.MutableRefObject<HTMLDivElement>}
      >
        {children}
      </GridProvider>
    </div>
  );
});

DragWrapper.displayName = "DragWrapper";

export default DragWrapper;
