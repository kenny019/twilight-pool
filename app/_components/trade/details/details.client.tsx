import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useState } from "react";
import { TradeHistoryDataTable } from "./trade-history/data-table";
import { tradeHistoryColumns } from "./trade-history/columns";
import { useSessionStore } from "@/lib/providers/session";

const DetailsPanel = () => {
  const [currentTab, setCurrentTab] = useState<"history">("history");

  const trade = useSessionStore((state) => state.trade.trades);

  console.log("tradeData", trade);

  return (
    <div className="flex h-full w-full flex-col space-y-2 overflow-auto py-2">
      <div className="flex w-full items-center border-b pl-3">
        <Tabs defaultValue={currentTab}>
          <TabsList className="flex w-full border-b-0" variant="underline">
            <TabsTrigger
              onClick={() => setCurrentTab("history")}
              value={"history"}
              variant="underline"
            >
              Trade History
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <TradeHistoryDataTable columns={tradeHistoryColumns} data={trade} />
    </div>
  );
};

export default DetailsPanel;
