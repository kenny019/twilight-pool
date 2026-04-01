import { TradeOrder } from "@/lib/types";
import BTC from "@/lib/twilight/denoms";
import Big from "big.js";

export const ORDER_HISTORY_LIFECYCLE_VALUES = [
  "PENDING",
  "FILLED",
  "SETTLED",
  "CANCELLED",
  "LIQUIDATE",
] as const;

export const ORDER_HISTORY_LIFECYCLE_STATUSES = new Set<string>(
  ORDER_HISTORY_LIFECYCLE_VALUES
);

export const ORDER_HISTORY_ERROR_STATUSES = new Set([
  "RejectedByRiskEngine",
  "RejectedByExchange",
  "RejectedByRelayer",
  "Error",
]);

const ORDER_HISTORY_PRIMARY_ORDER_TYPE_VALUES = [
  "LIMIT",
  "MARKET",
  "DARK",
] as const;

const ORDER_HISTORY_PRIMARY_ORDER_TYPES = new Set<string>(
  ORDER_HISTORY_PRIMARY_ORDER_TYPE_VALUES
);

export const PRICE_KIND_LABELS: Record<string, string> = {
  LIMIT_CLOSE: "Limit Price",
  STOP_LOSS: "Stop Loss",
  TAKE_PROFIT: "Take Profit",
};

const LIFECYCLE_LABELS: Record<string, string> = {
  PENDING: "Open",
  FILLED: "Filled",
  SETTLED: "Settled",
  CANCELLED: "Cancelled",
  LIQUIDATE: "Liquidated",
};

export type OrderHistoryGroup = {
  uuid: string;
  rows: TradeOrder[];
  oldestRow: TradeOrder;
  latestRow: TradeOrder;
  lifecycleRow?: TradeOrder;
  latestEventRow: TradeOrder;
  terminalRow?: TradeOrder;
  pnlRow?: TradeOrder;
  parentType: string;
  parentSide: string;
  parentEntryPrice: number;
  parentLeverage: number;
  latestDate: Date;
  lifecycleValue: string;
  lifecycleLabel: string;
  latestEventValue: string;
  latestEventLabel: string;
  closeOrTriggerValue: number | null;
  closeOrTriggerLabel: string | null;
};

function toTimeValue(value: Date): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function sortRowsAscending(rows: TradeOrder[]): TradeOrder[] {
  return [...rows].sort((a, b) => toTimeValue(a.date) - toTimeValue(b.date));
}

export function isOrderHistoryLifecycleStatus(status: string): boolean {
  return ORDER_HISTORY_LIFECYCLE_STATUSES.has(status);
}

export function isOrderHistoryErrorStatus(status: string): boolean {
  return ORDER_HISTORY_ERROR_STATUSES.has(status);
}

export function formatOrderHistoryRawLabel(value: string): string {
  if (!value) return "—";

  if (/^[A-Z_]+$/.test(value)) {
    return value
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  return value.replace(/([a-z])([A-Z])/g, "$1 $2");
}

export function getOrderHistoryLifecycleLabel(value: string): string {
  return LIFECYCLE_LABELS[value] ?? formatOrderHistoryRawLabel(value);
}

export function getOrderHistoryRawEventValue(trade: TradeOrder): string | null {
  const value = trade.eventStatus?.trim();
  return value ? value : null;
}

export function getOrderHistoryPrimaryEventValue(trade: TradeOrder): string {
  return getOrderHistoryRawEventValue(trade) ?? trade.orderStatus;
}

function isOrderHistoryPrimaryOrderType(orderType: string): boolean {
  return ORDER_HISTORY_PRIMARY_ORDER_TYPES.has(orderType);
}

function getOrderHistoryParentTypeRow(rowsAsc: TradeOrder[]): TradeOrder {
  return (
    rowsAsc.find((row) => isOrderHistoryPrimaryOrderType(row.orderType)) ??
    rowsAsc[0]
  );
}

export function getOrderHistoryPnl(trade?: TradeOrder): number | null {
  if (!trade) return null;

  if (trade.orderStatus === "LIQUIDATE") {
    return -trade.initialMargin;
  }

  return trade.realizedPnl ?? trade.unrealizedPnl ?? 0;
}

export function getOrderHistoryFunding(trade: TradeOrder): number | null {
  const status = trade.orderStatus;
  if (
    status !== "FILLED" &&
    status !== "SETTLED" &&
    status !== "LIQUIDATE"
  ) {
    return null;
  }

  const pnl = getOrderHistoryPnl(trade) ?? 0;
  return trade.fundingApplied != null
    ? Number(trade.fundingApplied)
    : Math.round(
        trade.initialMargin -
          trade.availableMargin -
          trade.feeFilled -
          trade.feeSettled +
          pnl
      );
}

export function getOrderHistoryFee(trade: TradeOrder): number | null {
  if (
    trade.orderStatus === "CANCELLED" ||
    trade.orderStatus === "LIQUIDATE" ||
    trade.orderStatus === "PENDING"
  ) {
    return null;
  }

  return trade.orderStatus === "FILLED" ? trade.feeFilled : trade.feeSettled;
}

export function getOrderHistoryPositionValueSats(
  trade: TradeOrder
): number | null {
  const markPrice = trade.settlementPrice || trade.entryPrice;
  if (!markPrice) return null;

  return Math.round(Math.abs(trade.positionSize / markPrice));
}

export function getOrderHistoryNotionalLabel(trade: TradeOrder): string {
  const positionSize = new BTC("sats", Big(trade.positionSize))
    .convert("BTC")
    .toFixed(2);

  return `$${positionSize}`;
}

export function getOrderHistoryPriceChange(trade: TradeOrder): {
  before: number | null;
  after: number | null;
} | null {
  if (trade.old_price == null && trade.new_price == null) {
    return null;
  }

  return {
    before: trade.old_price ?? null,
    after: trade.new_price ?? null,
  };
}

export function buildOrderHistoryGroups(
  rows: TradeOrder[]
): OrderHistoryGroup[] {
  const rowsByUuid = new Map<string, TradeOrder[]>();

  for (const row of rows) {
    const existing = rowsByUuid.get(row.uuid);
    if (existing) {
      existing.push(row);
    } else {
      rowsByUuid.set(row.uuid, [row]);
    }
  }

  return Array.from(rowsByUuid.entries())
    .map(([uuid, groupRows]) => {
      const rowsAsc = sortRowsAscending(groupRows);
      const rowsDesc = [...rowsAsc].reverse();

      const oldestRow = rowsAsc[0];
      const latestRow = rowsDesc[0];
      const lifecycleRow = rowsDesc.find((row) =>
        isOrderHistoryLifecycleStatus(row.orderStatus)
      );

      const latestPreferredEventRow = rowsDesc.find((row) => {
        const rawEventValue = getOrderHistoryPrimaryEventValue(row);
        return (
          !isOrderHistoryErrorStatus(rawEventValue) &&
          !isOrderHistoryLifecycleStatus(rawEventValue)
        );
      });
      const latestNonLifecycleEventRow = rowsDesc.find((row) => {
        const rawValue = getOrderHistoryPrimaryEventValue(row);
        return !isOrderHistoryLifecycleStatus(rawValue);
      });
      const latestEventRow =
        latestPreferredEventRow ?? latestNonLifecycleEventRow ?? latestRow;
      const terminalRow = rowsDesc.find(
        (row) =>
          row.orderStatus === "SETTLED" || row.orderStatus === "LIQUIDATE"
      );
      const pnlRow =
        terminalRow ?? rowsDesc.find((row) => row.orderStatus === "FILLED");
      const parentTypeRow = getOrderHistoryParentTypeRow(rowsAsc);

      const lifecycleValue = lifecycleRow?.orderStatus ?? latestRow.orderStatus;
      const latestEventValue =
        (latestPreferredEventRow &&
          getOrderHistoryPrimaryEventValue(latestPreferredEventRow)) ||
        (latestNonLifecycleEventRow &&
          getOrderHistoryPrimaryEventValue(latestNonLifecycleEventRow)) ||
        getOrderHistoryPrimaryEventValue(latestRow);
      const closeOrTriggerValue =
        terminalRow?.settlementPrice ??
        (latestEventRow.displayPrice != null &&
        latestEventRow.priceKind &&
        latestEventRow.priceKind !== "NONE"
          ? latestEventRow.displayPrice
          : null);
      const closeOrTriggerLabel = terminalRow
        ? "Close"
        : latestEventRow.displayPrice != null &&
            latestEventRow.priceKind &&
            latestEventRow.priceKind !== "NONE"
          ? PRICE_KIND_LABELS[latestEventRow.priceKind] ?? "Trigger"
          : null;

      return {
        uuid,
        rows: rowsAsc,
        oldestRow,
        latestRow,
        lifecycleRow,
        latestEventRow,
        terminalRow,
        pnlRow,
        parentType: parentTypeRow.orderType,
        parentSide: oldestRow.positionType,
        parentEntryPrice: oldestRow.entryPrice,
        parentLeverage: oldestRow.leverage,
        latestDate: latestRow.date,
        lifecycleValue,
        lifecycleLabel: getOrderHistoryLifecycleLabel(lifecycleValue),
        latestEventValue,
        latestEventLabel: formatOrderHistoryRawLabel(latestEventValue),
        closeOrTriggerValue,
        closeOrTriggerLabel,
      };
    })
    .sort((a, b) => toTimeValue(b.latestDate) - toTimeValue(a.latestDate));
}
