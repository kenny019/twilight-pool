"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/tabs";
import React, { useEffect, useState } from "react";
import { OrderBookDataTable } from "./data-table";
import { orderbookColumns } from "./columns";
import OrderbookSplitIcon from "@/components/icons/orderbook-split";
import OrderbookBidsIcon from "@/components/icons/orderbook-bids";
import OrderbookAsksIcon from "@/components/icons/orderbook-asks";
import {
  DropdownContent,
  DropdownGroup,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@/components/dropdown";
import { ChevronDown } from "lucide-react";
import cn from "@/lib/cn";
import OrderMyTrades from "./my-trades.client";
import { getOpenLimitOrders } from "@/lib/api/rest";
import { DisplayLimitOrderData, LimitOrderData } from "@/lib/types";
import Big from "big.js";
import BTC from "@/lib/twilight/denoms";

type OrderbookTabs = "market" | "trades";
type OrderbookLayout = "split" | "asks" | "bids";

function convertDisplayLimitData(
  limitData: LimitOrderData
): DisplayLimitOrderData {
  const size = Big(limitData.positionsize).div(Big(limitData.price)).toNumber();
  const total = new BTC("sats", Big(size))
    .convert("BTC")
    .mul(Big(limitData.price))
    .toNumber();
  return {
    price: limitData.price,
    total,
    size,
  };
}

const Orderbook = () => {
  const [currentTab, setCurrentTab] = useState<OrderbookTabs>("market");
  const [orderbookLayout, setOrderbookLayout] =
    useState<OrderbookLayout>("split");

  const [currentOrderbookPage, setCurrentOrderbookPage] = useState(1);
  const [asksData, setAsksData] = useState<DisplayLimitOrderData[]>([]);
  const [bidsData, setBidsData] = useState<DisplayLimitOrderData[]>([]);

  function useGetOrderbookData() {
    useEffect(() => {
      async function getOrderbookData() {
        const result = await getOpenLimitOrders();

        if (!result.success) {
          console.error(result.error);
          return;
        }

        setBidsData(
          result.data.result.bid.map((limitData) =>
            convertDisplayLimitData(limitData)
          )
        );
        setAsksData(
          result.data.result.ask.map((limitData) =>
            convertDisplayLimitData(limitData)
          )
        );
      }

      getOrderbookData();
    }, []);
  }

  function OrderbookLayouts() {
    switch (orderbookLayout) {
      case "split": {
        return (
          <>
            <OrderBookDataTable
              columns={orderbookColumns}
              data={asksData}
              type="asks"
              header
            />
            <OrderBookDataTable
              columns={orderbookColumns}
              data={bidsData}
              type="bids"
            />
          </>
        );
      }
      case "asks": {
        return (
          <OrderBookDataTable
            columns={orderbookColumns}
            data={asksData}
            type="asks"
            header
          />
        );
      }
      case "bids": {
        return (
          <OrderBookDataTable
            columns={orderbookColumns}
            data={bidsData}
            type="bids"
            header
          />
        );
      }
    }
  }

  function OrderbookViews() {
    switch (currentTab) {
      case "market": {
        return (
          <>
            <div className="flex w-full justify-between border-b px-3 pb-2">
              <div className="flex space-x-1">
                <OrderbookSplitIcon
                  data-state={orderbookLayout === "split" && "selected"}
                  onClick={() => setOrderbookLayout("split")}
                />
                <OrderbookBidsIcon
                  data-state={orderbookLayout === "bids" && "selected"}
                  onClick={() => setOrderbookLayout("bids")}
                />
                <OrderbookAsksIcon
                  data-state={orderbookLayout === "asks" && "selected"}
                  onClick={() => setOrderbookLayout("asks")}
                />
              </div>
              <DropdownMenu>
                <DropdownTrigger asChild>
                  <button className="group ml-4 flex items-center gap-1 text-sm">
                    {currentOrderbookPage}
                    <ChevronDown className="h-3 w-3 transition-all group-data-[state=open]:-rotate-180" />
                  </button>
                </DropdownTrigger>
                <DropdownContent className="mt-2 min-w-[48px] before:mt-[7px]">
                  <DropdownGroup>
                    {Array(1)
                      .fill(0)
                      .map((_, index) => (
                        <DropdownItem
                          key={index}
                          className={cn(
                            index + 1 === currentOrderbookPage && "text-theme",
                            "flex justify-center hover:bg-primary hover:text-button-secondary"
                          )}
                          onClick={() => setCurrentOrderbookPage(index + 1)}
                        >
                          {index + 1}
                        </DropdownItem>
                      ))}
                  </DropdownGroup>
                </DropdownContent>
              </DropdownMenu>
            </div>
            <div>
              <OrderbookLayouts />
            </div>
          </>
        );
      }
      case "trades": {
        return <OrderMyTrades />;
      }
    }
  }

  useGetOrderbookData();

  return (
    <div className="flex h-full w-full flex-col space-y-2 overflow-auto py-2">
      <div className="flex w-full items-center border-b pl-3">
        <Tabs defaultValue={currentTab}>
          <TabsList className="flex w-full border-b-0" variant="underline">
            <TabsTrigger
              onClick={() => setCurrentTab("market")}
              value={"market"}
              variant="underline"
            >
              Market
            </TabsTrigger>
            <TabsTrigger
              onClick={() => setCurrentTab("trades")}
              value={"mine"}
              variant="underline"
            >
              My Trades
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <OrderbookViews />
    </div>
  );
};

export default Orderbook;
