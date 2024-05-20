import { DisplayLimitOrderData, LimitOrderData } from "@/lib/types";
import { useEffect, useState } from "react";
import { OrderBookDataTable } from "./data-table";
import { orderbookColumns } from "./columns";
import { getOpenLimitOrders } from "@/lib/api/rest";
import { useInterval } from "@/lib/hooks/useInterval";

type Props = {
  layouts: "split" | "asks" | "bids";
};

function convertDisplayLimitData(
  limitData: LimitOrderData
): DisplayLimitOrderData {
  return {
    price: limitData.price,
    size: limitData.positionsize,
  };
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
          data={bidsData}
          type="bids"
          header
        />
      );
    }
  }
}
