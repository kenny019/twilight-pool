import cn from "@/lib/cn";
import useWindow from "@/lib/hooks/useWindow";
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
  const { width: windowWidth } = useWindow();

  // react-resizable injects a DraggableCore component as a child for resize handles;
  // separate it so it renders outside the scroll wrapper (needed for positioning)
  const childArray = React.Children.toArray(children);
  const resizeHandles = childArray.filter(
    (child) =>
      React.isValidElement(child) &&
      "onDrag" in child.props &&
      "onStop" in child.props
  );
  const content = childArray.filter((child) => !resizeHandles.includes(child));

  return (
    <div
      className={cn(
        className,
        "flex h-full w-full flex-col overflow-hidden rounded-md border bg-background"
      )}
      ref={ref}
      {...props}
    >
      <div
        className={cn(
          "min-h-[38px] w-full cursor-grab select-none border-b py-2 pl-3 text-sm active:cursor-grabbing",
          windowWidth < 500 ? "" : "draggable"
        )}
      >
        {title}
      </div>
      <div
        className="flex min-h-0 flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        <GridProvider
          callbackDimensions={dimension.filter((dim) => dim.name === name)[0]}
          gridRef={ref as React.MutableRefObject<HTMLDivElement>}
        >
          {content}
        </GridProvider>
      </div>
      {resizeHandles}
    </div>
  );
});

DragWrapper.displayName = "DragWrapper";

export default DragWrapper;
