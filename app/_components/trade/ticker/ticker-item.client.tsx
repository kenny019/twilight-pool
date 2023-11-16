import { Separator } from "@/components/seperator";
import cn from "@/lib/cn";
import React from "react";

type Props = {
  className?: string;
  title: string;
  children: React.ReactNode;
  border?: boolean;
};

const TickerItem = ({ className, title, border = true, children }: Props) => {
  return (
    <div className="flex flex-row items-center">
      <div className="flex flex-col px-4">
        <p className="text-sm opacity-50">
          <small>{title}</small>
        </p>
        <div className={cn("opacity-90", className)}>{children}</div>
      </div>
      {border && (
        <Separator className="h-[calc(100%-8px)]" orientation="vertical" />
      )}
    </div>
  );
};

export default TickerItem;
