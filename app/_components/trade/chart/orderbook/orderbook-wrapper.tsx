import ConnectWallet from "@/app/_components/layout/connect-wallet.client";
import cn from "@/lib/cn";
import React from "react";

const OrderBookWrapper = () => {
  return (
    <div className={"col-span-5 h-[400px] gap-x-4 border-b border-r"}>
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

export default OrderBookWrapper;
