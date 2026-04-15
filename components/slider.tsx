"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import cn from "@/lib/cn";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  disabled,
  trackClassName,
  rangeClassName,
  thumbClassName,
  markers,
  markerCount,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  trackClassName?: string;
  rangeClassName?: string;
  thumbClassName?: string;
  /** Explicit marker positions in the slider's own unit (not percentages) */
  markers?: number[];
  /** Auto-generate this many evenly-spaced markers between min and max */
  markerCount?: number;
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  );

  // Resolve markers: explicit array beats auto-count
  const resolvedMarkers = React.useMemo(() => {
    if (markers && markers.length > 0) return markers;
    if (markerCount && markerCount >= 2) {
      return Array.from(
        { length: markerCount },
        (_, i) => min + (i / (markerCount - 1)) * (max - min)
      );
    }
    return undefined;
  }, [markers, markerCount, min, max]);

  return (
    <div className={cn("relative w-full", disabled && "opacity-50", className)}>
      <SliderPrimitive.Root
        data-slot="slider"
        defaultValue={defaultValue}
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        className="data-[orientation=vertical]:min-h-44 relative flex w-full touch-none select-none items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col"
        {...props}
      >
        {/* 1. Track — rendered first, sits behind everything */}
        <SliderPrimitive.Track
          data-slot="slider-track"
          className={cn(
            "relative grow overflow-hidden rounded-full bg-outline data-[orientation=horizontal]:h-[2px] data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-[2px]",
            trackClassName
          )}
        >
          <SliderPrimitive.Range
            data-slot="slider-range"
            className={cn(
              "absolute bg-theme opacity-80 data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
              rangeClassName
            )}
          />
        </SliderPrimitive.Track>

        {/* 2. Tick marks — rendered after Track but before Thumbs.
            They paint on top of the track line and below the thumb.
            The container spans the full Root bounds; each tick is
            vertically centered so it protrudes equally above and below
            the 2px track line. */}
        {resolvedMarkers && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 inset-y-0 flex items-center"
          >
            {resolvedMarkers.map((mark) => {
              const pct = ((mark - min) / (max - min)) * 100;
              return (
                <div
                  key={mark}
                  className="absolute h-2.5 w-px -translate-x-1/2 rounded-full bg-primary/30"
                  style={{ left: `${pct}%` }}
                />
              );
            })}
          </div>
        )}

        {/* 3. Thumb — rendered last, paints on top of track and ticks */}
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className={cn(
              "block h-3.5 w-3.5 shrink-0 rounded-full border-primary bg-primary shadow-sm transition-[color,box-shadow] disabled:pointer-events-none",
              thumbClassName
            )}
          />
        ))}
      </SliderPrimitive.Root>
    </div>
  );
}

export { Slider };
