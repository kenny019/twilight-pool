import ConnectWallet from "@/app/_components/layout/connect-wallet.client";
import cn from "@/lib/cn";
import React from "react";

const PositionsWrapper = () => {
  return (
    <div className="col-span-7 h-[400px] gap-x-4 border-x border-b">
      <div
        className={cn(
          "flex h-full flex-col",
          false ? "items-start" : "items-center"
        )}
      >
        {false ? (
          <></>
        ) : (
          <div className="my-auto">
            <ConnectWallet />
          </div>
        )}
      </div>
    </div>
  );
};

export default PositionsWrapper;
