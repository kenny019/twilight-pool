import cn from "@/lib/cn";
import useWindow from "@/lib/hooks/useWindow";
import { GridProvider } from "@/lib/providers/grid";
import React, { forwardRef } from "react";

type Props = {
  title?: React.ReactNode;
  name: string;
  dimension: { name: string; width: number; height: number }[];
  children?: React.ReactNode;
  /** Below 996px trade layout; shell only — same GridProvider, ref, and callbackDimensions as desktop */
  isMobile?: boolean;
  /** Mobile outer shell only; use for panel-specific sizing (e.g. chart height). Desktop uses `className`. */
  mobileClassName?: string;
};

type WrapperDivProps = Omit<React.ComponentPropsWithoutRef<"div">, "title">;

const DragWrapper = forwardRef<
  HTMLDivElement,
  React.PropsWithoutRef<Props> & WrapperDivProps
>(
  (
    {
      title,
      name,
      dimension,
      children,
      className,
      isMobile = false,
      mobileClassName,
      ...props
    },
    ref
  ) => {
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

    const callbackDimensions = dimension.filter((dim) => dim.name === name)[0];
    const gridRef = ref as React.MutableRefObject<HTMLDivElement>;

    const providerTree = (
      <GridProvider
        callbackDimensions={callbackDimensions}
        gridRef={gridRef}
      >
        {content}
      </GridProvider>
    );

    if (isMobile) {
      return (
        <div
          className={cn(
            "w-full rounded-md border bg-background",
            mobileClassName
          )}
          ref={ref}
          {...props}
        >
          {providerTree}
        </div>
      );
    }

    return (
      <div
        className={cn(
          className,
          "flex h-full w-full flex-col overflow-hidden rounded-md border border-border/60 bg-background"
        )}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            "min-h-[30px] w-full cursor-grab select-none border-b border-border/60 py-1.5 pl-3 text-xs font-medium text-muted-foreground active:cursor-grabbing",
            windowWidth < 500 ? "" : "draggable"
          )}
        >
          <div className="flex items-center justify-between gap-2 pr-3">
            <div className="min-w-0">{title}</div>
          </div>
        </div>
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: "none" }}
        >
          {providerTree}
        </div>
        {resizeHandles}
      </div>
    );
  }
);

DragWrapper.displayName = "DragWrapper";

export default DragWrapper;
