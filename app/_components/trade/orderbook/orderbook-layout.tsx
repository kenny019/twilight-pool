import {
  DisplayLimitOrderData,
  LimitChange,
  LimitOrderData,
} from "@/lib/types";
import { useEffect, useState } from "react";
import { OrderBookDataTable } from "./data-table";
import { orderbookColumns } from "./columns";
import { getOpenLimitOrders } from "@/lib/api/rest";
import { useInterval } from "@/lib/hooks/useInterval";

type Props = {
  layouts: "split" | "asks" | "bids";
};

function convertDisplayLimitData(
  limitData: LimitOrderData[],
  currentData: DisplayLimitOrderData[],
  sort: boolean
): DisplayLimitOrderData[] {
  const sorted = limitData.sort((left, right) =>
    sort ? left.price - right.price : right.price - left.price
  );

  if (currentData.length < 1) {
    return sorted.map((order) => {
      return {
        price: order.price,
        size: order.positionsize,
        change: LimitChange.EQUAL,
      };
    });
  }

  return sorted.map((order, index) => {
    // current data should have same sorting
    const oldPrice = currentData[index]
      ? currentData[index].price
      : order.price;

    return {
      price: order.price,
      size: order.positionsize,
      change:
        oldPrice === order.price
          ? LimitChange.EQUAL
          : order.price > oldPrice
          ? LimitChange.INCREASE
          : LimitChange.DECREASE,
    };
  });
}

export function OrderbookLayouts({ layouts }: Props) {
  const [asksData, setAsksData] = useState<DisplayLimitOrderData[]>([]);
  const [bidsData, setBidsData] = useState<DisplayLimitOrderData[]>([]);

  async function getOrderbookData() {
    const result = await getOpenLimitOrders();

    if (!result.success) {
      console.error(result.error);
      return;
    }

    const bids = convertDisplayLimitData(
      result.data.result.bid,
      bidsData,
      true
    );
    const asks = convertDisplayLimitData(
      result.data.result.ask,
      asksData,
      false
    );

    setBidsData(bids);
    setAsksData(asks);
  }

  function useGetOrderbookData() {
    useEffect(() => {
      getOrderbookData();
    }, []);
  }

  useGetOrderbookData();

  useInterval(() => {
    getOrderbookData();
  }, 1000);

  switch (layouts) {
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
          data={bidsData.reverse()}
          type="bids"
          header
        />
      );
    }
  }
}
