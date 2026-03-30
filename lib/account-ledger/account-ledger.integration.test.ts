import { describe, expect, it } from "vitest";
import { TransactionHash } from "@/lib/api/rest";
import { createTwilightStore } from "@/lib/state/store";
import { createLocalStorageStub } from "@/lib/__test__/localStorage";
import {
  buildLendLedgerEntryFromRelayerEvent,
  buildTradeLedgerEntryFromRelayerEvent,
} from "./from-relayer";
import { AccountLedgerEntry, TradeOrder, TransactionHistory, ZkAccount } from "@/lib/types";

function makeZkAccount(
  address: string,
  tag: string,
  type: "Coin" | "Memo" | "CoinSettled",
  value: number
): ZkAccount {
  return {
    address,
    tag,
    type,
    value,
    scalar: "0".repeat(64),
    isOnChain: true,
  };
}

function makeTrade(overrides: Partial<TradeOrder> = {}): TradeOrder {
  return {
    accountAddress:
      "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
    value: 2500,
    uuid: "b6376001-8712-4490-9ba7-7b2b93a44d89",
    orderStatus: "FILLED",
    orderType: "MARKET",
    output: "",
    tx_hash: "EF1288462636CB7A15C432134AEBA973F895311507F7DC673AB7DFEC16A5620C",
    positionType: "LONG",
    entryPrice: 67563,
    leverage: 5,
    date: new Date("2026-03-30T11:13:21.347Z"),
    isOpen: true,
    availableMargin: 2495,
    feeFilled: 5,
    feeSettled: 0,
    bankruptcyPrice: 56302.5,
    bankruptcyValue: 15000,
    entryNonce: 0,
    entrySequence: 1854,
    executionPrice: 0,
    initialMargin: 2500,
    liquidationPrice: 56513.48,
    maintenanceMargin: 56,
    positionSize: 844537500,
    settlementPrice: 0,
    settleLimit: null,
    fundingApplied: null,
    ...overrides,
  };
}

function makeTx(overrides: Partial<TransactionHistory>): TransactionHistory {
  return {
    from: "",
    to: "",
    fromTag: "",
    toTag: "",
    tx_hash: "",
    value: 0,
    date: new Date("2026-03-30T11:12:00.000Z"),
    type: "Transfer",
    ...overrides,
  };
}

function baselineEntry(): AccountLedgerEntry {
  const now = new Date("2026-03-30T11:12:19.475Z");
  return {
    id: "baseline-credit",
    type: "credit",
    from_acc: "bootstrap-System",
    to_acc: "twilight1k9mu3452mzzhr76pwqqngypl3j5s9smcp8htvk-Funding",
    amount_sats: 250246,
    fund_bal: 250246,
    trade_bal: 0,
    t_positions_bal: 0,
    l_deposits_bal: 0,
    order_id: null,
    tx_hash: null,
    timestamp: now,
    remarks: "Initial funding baseline on first wallet session load",
    fund_bal_before: 0,
    fund_bal_after: 250246,
    trade_bal_before: 0,
    trade_bal_after: 0,
    t_positions_bal_before: 0,
    t_positions_bal_after: 0,
    l_deposits_bal_before: 0,
    l_deposits_bal_after: 0,
    idempotency_key: "bootstrap|twilight1k9mu3452mzzhr76pwqqngypl3j5s9smcp8htvk",
    created_at: now,
    updated_at: now,
    status: "confirmed",
  };
}

describe("Account ledger integration flow", () => {
  it("replays mint -> transfers -> trade-open -> lend-deposit -> lend-withdraw -> burn", () => {
    globalThis.localStorage = createLocalStorageStub() as any;
    const store = createTwilightStore("test-account-ledger-integration-");
    const state = () => store.getState();

    const fundingAddress = "twilight1k9mu3452mzzhr76pwqqngypl3j5s9smcp8htvk";
    const mainAddr =
      "0c1aff01b685d7268306394719f35f947e5f49b08fc14b706c8aefd2f16a59441c367bd4bd1489292fe38cba6001cb51359499bc2bace111f9d45f0616a414b90d9b7cde5c";
    const tradeAddr =
      "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a";
    const lendAddr =
      "0cee690f057f1c3fa2a3b8b83266c2e93ba424074a279bb12daca2067b3dc6ba65ce344495914b5fd72112216d2b88cad9c36dd37f4f0351fcc56d161d32b6e9465b65e904";
    const lendCoinAddr =
      "0cb2a139f7f9f70f44078cb8dd0a84067f008ed9d25c208eacaaead9e2c4ee45780ccae87fb826ebd40ae04c5157b9900659521ba2ef87d6d87d5379a34547b14d9be7014e";

    const mainCoin0 = makeZkAccount(mainAddr, "main", "Coin", 0);
    state().zk.addZkAccount(mainCoin0);
    state().account_ledger.addEntry(baselineEntry());

    // 1) Mint: funding -> trading main
    state().zk.addZkAccount(makeZkAccount(mainAddr, "main", "Coin", 10000));
    state().history.addTransaction(
      makeTx({
        date: new Date("2026-03-30T11:12:53.996Z"),
        from: fundingAddress,
        fromTag: "Funding",
        to: mainAddr,
        toTag: "Trading Account",
        tx_hash: "770B711BD895BC27C9B85677670DBC23A99A1168EE9BDFD7667C0A25DF09B60B",
        type: "Transfer",
        value: 10000,
        funding_sats_snapshot: 250246,
      })
    );

    // 2) Transfer: trading main -> trade subaccount (Coin)
    state().zk.addZkAccount(makeZkAccount(mainAddr, "main", "Coin", 7500));
    state().zk.addZkAccount(makeZkAccount(tradeAddr, "BTC buy 0c2cbd", "Coin", 2500));
    state().history.addTransaction(
      makeTx({
        date: new Date("2026-03-30T11:13:20.810Z"),
        from: mainAddr,
        fromTag: "Trading Account",
        to: tradeAddr,
        toTag: "BTC buy 0c2cbd",
        tx_hash: "03DD41ABABE117FCB7152846C9BD9CF0B513E28C8DF90B29A156FB2A0D0E6E82",
        type: "Transfer",
        value: 2500,
      })
    );

    // 3) Trade-open FILLED (relayer)
    state().zk.addZkAccount(makeZkAccount(tradeAddr, "BTC buy 0c2cbd", "Memo", 2500));
    const trade = makeTrade();
    state().trade.addTrade(trade);
    const tradeTx: TransactionHash = {
      account_id: tradeAddr,
      datetime: "2026-03-30T11:13:21.851Z",
      id: 1,
      order_id: trade.uuid,
      order_status: "FILLED",
      order_type: "MARKET",
      output: null,
      reason: null,
      old_price: null,
      new_price: null,
      request_id:
        "REQIDAFBE9FC3EAFBAA698B3848252ADF3C8D02F79F9BABD804F1D106B99F11F849DE",
      tx_hash: "EF1288462636CB7A15C432134AEBA973F895311507F7DC673AB7DFEC16A5620C",
    };
    const tradeLedger = buildTradeLedgerEntryFromRelayerEvent(state(), trade, tradeTx);
    state().account_ledger.addEntry(tradeLedger);
    // duplicate must upsert (no additional row)
    state().account_ledger.addEntry(
      buildTradeLedgerEntryFromRelayerEvent(state(), trade, tradeTx)
    );

    // 4) Mint for lend account
    state().zk.addZkAccount(makeZkAccount(lendAddr, "BTC lend 3", "Coin", 40000));
    state().history.addTransaction(
      makeTx({
        date: new Date("2026-03-30T11:14:56.485Z"),
        from: fundingAddress,
        fromTag: "Funding",
        to: lendAddr,
        toTag: "BTC lend 3",
        tx_hash: "71F030EEA390F904AB57CBA6347192060DDADF38C5E081685A0059813ED456B5",
        type: "Transfer",
        value: 40000,
        funding_sats_snapshot: 240246,
      })
    );

    // 5) Lend-deposit FILLED (relayer)
    const lendDepositTx: TransactionHash = {
      account_id: lendAddr,
      datetime: "2026-03-30T11:14:58.047Z",
      id: 2,
      order_id: "9e8eadb4-e02f-40b7-b0e9-399e804e0e8c",
      order_status: "FILLED",
      order_type: "LEND",
      output: null,
      reason: null,
      old_price: null,
      new_price: null,
      request_id:
        "REQID85012BB9383FAD3B43B89995505112719047BCBB0526C91B835BC7D6036B85EA",
      tx_hash: "EDCF7D6D8B379D54BA894E87A2CF54237CD8FCE9CF9F557127CDC5BB518A28EA",
    };
    state().account_ledger.addEntry(
      buildLendLedgerEntryFromRelayerEvent(state(), lendDepositTx, {
        accountAddress: lendAddr,
        accountTag: "BTC lend 3",
        amountSats: 40000,
        fundingAddress,
        operation: "deposit",
      })
    );

    // Post-deposit state for withdraw path
    state().zk.addZkAccount(makeZkAccount(lendAddr, "BTC lend 3", "Memo", 40000));
    state().lend.addLend({
      accountAddress: lendAddr,
      value: 40000,
      uuid: "9e8eadb4-e02f-40b7-b0e9-399e804e0e8c",
      order_id: "9e8eadb4-e02f-40b7-b0e9-399e804e0e8c",
      request_id:
        "REQID85012BB9383FAD3B43B89995505112719047BCBB0526C91B835BC7D6036B85EA",
      orderStatus: "LENDED",
      timestamp: new Date("2026-03-30T11:15:04.193Z"),
      tx_hash: "EDCF7D6D8B379D54BA894E87A2CF54237CD8FCE9CF9F557127CDC5BB518A28EA",
    });

    // 6) Lend-withdraw SETTLED (relayer)
    const lendWithdrawTx: TransactionHash = {
      ...lendDepositTx,
      datetime: "2026-03-30T11:15:12.022Z",
      order_status: "SETTLED",
      request_id:
        "REQID4BA8642260EE76206673951BE34036FAF0A28804C7C69D188C3D1FBE1A3FBF4F",
      tx_hash: "0D4AE02D5A133F994ED858233ED16F7EFB9CEE85B182A9DCB7555752826AF314",
    };
    state().account_ledger.addEntry(
      buildLendLedgerEntryFromRelayerEvent(state(), lendWithdrawTx, {
        accountAddress: lendAddr,
        accountTag: "BTC lend 3",
        amountSats: 40000,
        fundingAddress,
        operation: "withdraw",
      })
    );

    // Post-withdraw cleanup transfer CoinSettled -> Coin
    state().lend.removeLend({
      accountAddress: lendAddr,
      value: 40000,
      uuid: "9e8eadb4-e02f-40b7-b0e9-399e804e0e8c",
      orderStatus: "LENDED",
      timestamp: new Date("2026-03-30T11:15:04.193Z"),
    });
    state().zk.removeZkAccount(makeZkAccount(lendAddr, "BTC lend 3", "Memo", 40000));
    state().zk.addZkAccount(makeZkAccount(lendCoinAddr, "BTC lend 3", "Coin", 40000));
    state().history.addTransaction(
      makeTx({
        date: new Date("2026-03-30T11:15:20.625Z"),
        from: lendAddr,
        fromTag: "BTC lend 3",
        fromType: "CoinSettled",
        to: lendCoinAddr,
        toTag: "BTC lend 3",
        toType: "Coin",
        tx_hash: "751A84B31D8770D2879377C4EA0C027814A3AB89C4AC960D3A1EBD10FF8A50C4",
        type: "Transfer",
        value: 40000,
        funding_sats_snapshot: 200246,
      })
    );

    // 7) Burn: Coin -> funding
    state().history.addTransaction(
      makeTx({
        date: new Date("2026-03-30T11:15:28.004Z"),
        from: lendCoinAddr,
        fromTag: "BTC lend 3",
        to: fundingAddress,
        toTag: "Funding",
        tx_hash: "4BC7D348F9B40C1653411D831556AC552652389CA0DBBB83F76E84584F34FC16",
        type: "Burn",
        value: 40000,
        funding_sats_snapshot: 200246,
      })
    );

    const entries = state().account_ledger.entries;
    expect(entries).toHaveLength(9);
    expect(entries.map((e) => e.type)).toEqual([
      "burn",
      "transfer",
      "lend-withdraw",
      "lend-deposit",
      "mint",
      "trade-open",
      "transfer",
      "mint",
      "credit",
    ]);

    const burn = entries[0];
    expect(burn.trade_bal_before).toBe(47500);
    expect(burn.trade_bal_after).toBe(7500);
    expect(burn.fund_bal_before).toBe(200246);
    expect(burn.fund_bal_after).toBe(240246);

    const lendWithdraw = entries.find((e) => e.type === "lend-withdraw");
    expect(lendWithdraw?.order_id).toBe("9e8eadb4-e02f-40b7-b0e9-399e804e0e8c");
    expect(lendWithdraw?.trade_bal_before).toBe(7500);
    expect(lendWithdraw?.trade_bal_after).toBe(47500);
    expect(lendWithdraw?.l_deposits_bal_before).toBe(40000);
    expect(lendWithdraw?.l_deposits_bal_after).toBe(0);
  });
});

