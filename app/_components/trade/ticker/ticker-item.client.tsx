import { Separator } from "@/components/seperator";
import cn from "@/lib/cn";
import React from "react";

type Props = {
  className?: string;
  title: React.ReactNode;
  children: React.ReactNode;
  border?: boolean;
  itemClassName?: string;
  titleClassName?: string;
  separatorClassName?: string;
};

const TickerItem = ({
  className,
  title,
  border = true,
  children,
  itemClassName,
  titleClassName,
  separatorClassName,
}: Props) => {
  return (
    <div className={cn("flex min-w-0 flex-row items-center", itemClassName)}>
      <div className="flex min-w-0 flex-col justify-center px-1.5 xl:px-2 2xl:px-3 3xl:px-3.5">
        <p
          className={cn(
            "truncate text-[10px] font-medium leading-none text-primary/50 xl:text-[11px] 2xl:text-[11px] 3xl:text-[12px]",
            titleClassName
          )}
        >
          <small>{title}</small>
        </p>
        <div
          className={cn(
            "text-primary/92 mt-1.5 whitespace-nowrap text-[13px] font-medium tabular-nums leading-none xl:text-[14px] 2xl:text-[15px] 3xl:text-[15px]",
            className
          )}
        >
          {children}
        </div>
      </div>
      {border && (
        <Separator
          className={cn(
            "h-[82%] shrink-0 self-center bg-outline opacity-70 xl:h-[85%]",
            separatorClassName
          )}
          orientation="vertical"
        />
      )}
    </div>
  );
};

export default TickerItem;
