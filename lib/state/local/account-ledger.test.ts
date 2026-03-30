import { describe, expect, it, beforeEach } from "vitest";
import { createTwilightStore } from "../store";
import { createLocalStorageStub } from "@/lib/__test__/localStorage";
import { AccountLedgerEntry } from "@/lib/types";

function makeEntry(overrides: Partial<AccountLedgerEntry> = {}): AccountLedgerEntry {
  const now = new Date("2026-03-30T11:12:19.475Z");
  return {
    id: "entry-1",
    type: "trade-open",
    from_acc: "from-Coin",
    to_acc: "to-Memo",
    amount_sats: 2500,
    fund_bal: 240246,
    trade_bal: 7500,
    t_positions_bal: 2500,
    l_deposits_bal: 0,
    order_id: "order-1",
    tx_hash: null,
    timestamp: new Date("2026-03-30T11:13:37.755Z"),
    remarks: "[trade] PENDING (LIMIT)",
    fund_bal_before: 240246,
    fund_bal_after: 240246,
    trade_bal_before: 7500,
    trade_bal_after: 7500,
    t_positions_bal_before: 2500,
    t_positions_bal_after: 2500,
    l_deposits_bal_before: 0,
    l_deposits_bal_after: 0,
    idempotency_key: "relayer|trade|order-1|PENDING|REQID-1",
    created_at: now,
    updated_at: now,
    status: "pending",
    ...overrides,
  };
}

describe("AccountLedgerSlice", () => {
  let store: ReturnType<typeof createTwilightStore>;

  beforeEach(() => {
    globalThis.localStorage = createLocalStorageStub() as any;
    store = createTwilightStore("test-account-ledger-");
  });

  it("upserts by idempotency_key and only patches metadata when duplicate arrives", () => {
    const pending = makeEntry({
      tx_hash: null,
      order_id: null,
      remarks: null,
      status: "pending",
    });
    store.getState().account_ledger.addEntry(pending);

    const duplicateTerminal = makeEntry({
      tx_hash: "EF1288462636CB7A15C432134AEBA973F895311507F7DC673AB7DFEC16A5620C",
      order_id: "b6376001-8712-4490-9ba7-7b2b93a44d89",
      remarks: "[trade] FILLED (MARKET)",
      status: "confirmed",
      // Intentionally different snapshot numbers: must NOT overwrite.
      trade_bal_before: 1,
      trade_bal_after: 2,
      fund_bal_before: 3,
      fund_bal_after: 4,
    });

    store.getState().account_ledger.addEntry(duplicateTerminal);

    const entries = store.getState().account_ledger.entries;
    expect(entries).toHaveLength(1);
    const row = entries[0];

    expect(row.status).toBe("confirmed");
    expect(row.tx_hash).toBe(
      "EF1288462636CB7A15C432134AEBA973F895311507F7DC673AB7DFEC16A5620C"
    );
    expect(row.order_id).toBe("b6376001-8712-4490-9ba7-7b2b93a44d89");
    expect(row.remarks).toBe("[trade] FILLED (MARKET)");

    // Snapshot fields are immutable for duplicate events.
    expect(row.trade_bal_before).toBe(7500);
    expect(row.trade_bal_after).toBe(7500);
    expect(row.fund_bal_before).toBe(240246);
    expect(row.fund_bal_after).toBe(240246);
  });
});
