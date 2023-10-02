import cn from "@/lib/cn";
import React from "react";

type Props = {
  className?: string;
  title: string;
  children: React.ReactNode;
};

const TickerItem = ({ className, title, children }: Props) => {
  return (
    <div className="flex flex-col">
      <p className="text-sm opacity-50">
        <small>{title}</small>
      </p>
      <div className={cn(className)}>{children}</div>
    </div>
  );
};

export default TickerItem;
