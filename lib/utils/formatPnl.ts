import { formatCurrency } from "@/lib/twilight/ticker";
import Big from "big.js";

/**
 * Converts PnL in satoshis to USD using the given BTC price.
 * @param pnlSats - PnL value in satoshis
 * @param btcPriceUsd - Current BTC price in USD
 * @returns Formatted USD string (e.g. "$1,234.56")
 */
export function formatPnlWithUsd(pnlSats: number, btcPriceUsd: number): string {
  if (btcPriceUsd <= 0) return formatCurrency(0);
  const btcValue = new Big(pnlSats).div(100_000_000);
  const usdValue = btcValue.mul(btcPriceUsd).toNumber();
  return formatCurrency(usdValue);
}
