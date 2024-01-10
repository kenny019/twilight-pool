import { z } from "zod";
import wfetch from "../http";

function formatCurrency(input: unknown) {
  const value = Number(input);

  if (isNaN(value)) {
    return "";
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

const historicalPriceDataSchema = z.object({
  jsonrpc: z.string(),
  result: z.array(
    z.object({
      id: z.number(),
      price: z.string(),
      timestamp: z.string(),
    })
  ),
  id: z.number(),
});

type historicalPriceData = z.infer<typeof historicalPriceDataSchema>;

async function getHistoricalPrice(date: string, limit: number, offset: number) {
  const apiURL = process.env.NEXT_PUBLIC_TWILIGHT_PRICE_REST as string;

  const currentDate = new Date();

  const body = {
    jsonrpc: "2.0",
    method: "historical_price",
    id: 1,
    params: {
      from: date,
      to: currentDate.toISOString(),
      limit: limit,
      offset: offset,
    },
  };

  const { data, error, success } = await wfetch(apiURL)
    .post({
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_TWILIGHT_PRICE_REST_TOKEN}`,
      },
      body: JSON.stringify(body),
    })
    .json<historicalPriceData>();

  if (!success) {
    console.error(error);
    return [];
  }

  return data.result;
}

export { formatCurrency, getHistoricalPrice };
