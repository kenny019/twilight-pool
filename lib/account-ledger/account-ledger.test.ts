import { describe, expect, it } from "vitest";
import { TransactionHash } from "@/lib/api/rest";
import {
  buildLendLedgerEntryFromRelayerEvent,
  buildTradeLedgerEntryFromRelayerEvent,
  shouldInsertTradeLedgerEvent,
} from "./from-relayer";
import { buildLedgerEntryFromTransaction } from "./from-transaction";
import { TradeOrder, TransactionHistory } from "@/lib/types";

type TxState = Parameters<typeof buildLedgerEntryFromTransaction>[0];
type RelayerState = Parameters<typeof buildTradeLedgerEntryFromRelayerEvent>[0];

function makeTrade(overrides: Partial<TradeOrder> = {}): TradeOrder {
  return {
    accountAddress:
      "0cd833f3ca20ec03f5ee3239c59f6475fd9a4c2fb81fc5c9e1a65cd25f755dfd585af70f69639e0b717694bd445b71c95960630c4f440e95fe9fb450fa0947973ca5ab8119",
    value: 3750,
    uuid: "5ff9aa2a-b116-41c6-b9c5-3c969915af5e",
    orderStatus: "PENDING",
    orderType: "LIMIT",
    output: undefined,
    tx_hash: "",
    positionType: "LONG",
    entryPrice: 65535.65,
    leverage: 5,
    date: new Date("2026-03-30T11:13:37.755Z"),
    isOpen: true,
    availableMargin: 3750,
    feeFilled: 0,
    feeSettled: 0,
    bankruptcyPrice: 54613.04,
    bankruptcyValue: 22500,
    entryNonce: 0,
    entrySequence: 1855,
    executionPrice: 65535.65,
    initialMargin: 3750,
    liquidationPrice: 54806.69,
    maintenanceMargin: 79.5,
    positionSize: 1228793437.5,
    settlementPrice: 0,
    settleLimit: null,
    fundingApplied: null,
    ...overrides,
  };
}

describe("Account ledger regressions", () => {
  it("transfer entry keeps previous trade_bal_before and current live trade_bal_after", () => {
    const state: TxState = {
      zk: {
        zkAccounts: [
          {
            address:
              "0c1aff01b685d7268306394719f35f947e5f49b08fc14b706c8aefd2f16a59441c367bd4bd1489292fe38cba6001cb51359499bc2bace111f9d45f0616a414b90d9b7cde5c",
            tag: "main",
            type: "Coin",
            value: 3750,
          },
          {
            address:
              "0c2893481d8e09704ad472ed9c533d2c7f507ec81bca4983d09e0b8c21a62ce33696e1dee35e129bcd00d6c5858d83a4f7b434f8ca49c3a9044cd5e6721309c835facdcade",
            tag: "BTC sell 0c2893",
            type: "Coin",
            value: 1875,
          },
          {
            address:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            tag: "BTC buy 0c2cbd",
            type: "Memo",
            value: 2500,
          },
          {
            address:
              "0cd833f3ca20ec03f5ee3239c59f6475fd9a4c2fb81fc5c9e1a65cd25f755dfd585af70f69639e0b717694bd445b71c95960630c4f440e95fe9fb450fa0947973ca5ab8119",
            tag: "BTC buy 0cd833",
            type: "Coin",
            value: 3750,
          },
        ],
      },
      trade: {
        trades: [
          {
            accountAddress:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            isOpen: true,
          },
        ],
      },
      lend: { lends: [] },
      account_ledger: {
        entries: [{ fund_bal_after: 240246, trade_bal_after: 7500 }],
      },
    };

    const tx: TransactionHistory = {
      date: new Date("2026-03-30T11:14:41.653Z"),
      from:
        "0c2893481d8e09704ad472ed9c533d2c7f507ec81bca4983d09e0b8c21a62ce33696e1dee35e129bcd00d6c5858d83a4f7b434f8ca49c3a9044cd5e6721309c835facdcade",
      fromTag: "BTC sell 0c2893",
      to: "0c1aff01b685d7268306394719f35f947e5f49b08fc14b706c8aefd2f16a59441c367bd4bd1489292fe38cba6001cb51359499bc2bace111f9d45f0616a414b90d9b7cde5c",
      toTag: "Trading Account",
      tx_hash: "B196E631D6069113EEC8A6A10BF4CFCDA837DC1D56C8194E4E2A5751B9FED7B3",
      type: "Transfer",
      value: 1875,
    };

    const entry = buildLedgerEntryFromTransaction(state, tx);
    expect(entry.type).toBe("transfer");
    expect(entry.trade_bal_before).toBe(7500);
    expect(entry.trade_bal_after).toBe(9375);
    expect(entry.fund_bal_before).toBe(240246);
    expect(entry.fund_bal_after).toBe(240246);
  });

  it("burn entry derives trade balances from previous snapshot", () => {
    const state: TxState = {
      zk: {
        zkAccounts: [
          {
            address:
              "0c1aff01b685d7268306394719f35f947e5f49b08fc14b706c8aefd2f16a59441c367bd4bd1489292fe38cba6001cb51359499bc2bace111f9d45f0616a414b90d9b7cde5c",
            tag: "main",
            type: "Coin",
            value: 7500,
          },
          {
            address:
              "0cb2a139f7f9f70f44078cb8dd0a84067f008ed9d25c208eacaaead9e2c4ee45780ccae87fb826ebd40ae04c5157b9900659521ba2ef87d6d87d5379a34547b14d9be7014e",
            tag: "BTC lend 3",
            type: "Coin",
            value: 40000,
          },
          {
            address:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            tag: "BTC buy 0c2cbd",
            type: "Memo",
            value: 2500,
          },
        ],
      },
      trade: {
        trades: [
          {
            accountAddress:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            isOpen: true,
          },
        ],
      },
      lend: { lends: [] },
      account_ledger: {
        entries: [{ fund_bal_after: 200246, trade_bal_after: 47500 }],
      },
    };

    const tx: TransactionHistory = {
      date: new Date("2026-03-30T11:15:28.004Z"),
      from:
        "0cb2a139f7f9f70f44078cb8dd0a84067f008ed9d25c208eacaaead9e2c4ee45780ccae87fb826ebd40ae04c5157b9900659521ba2ef87d6d87d5379a34547b14d9be7014e",
      fromTag: "BTC lend 3",
      to: "twilight1k9mu3452mzzhr76pwqqngypl3j5s9smcp8htvk",
      toTag: "Funding",
      tx_hash: "4BC7D348F9B40C1653411D831556AC552652389CA0DBBB83F76E84584F34FC16",
      type: "Burn",
      value: 40000,
      funding_sats_snapshot: 200246,
    };

    const entry = buildLedgerEntryFromTransaction(state, tx);
    expect(entry.type).toBe("burn");
    expect(entry.trade_bal_before).toBe(47500);
    expect(entry.trade_bal_after).toBe(7500);
    expect(entry.fund_bal_before).toBe(200246);
    expect(entry.fund_bal_after).toBe(240246);
  });

  it("trade ledger gate only allows lifecycle statuses", () => {
    expect(shouldInsertTradeLedgerEvent("PENDING")).toBe(true);
    expect(shouldInsertTradeLedgerEvent("filled")).toBe(true);
    expect(shouldInsertTradeLedgerEvent("SETTLED")).toBe(true);
    expect(shouldInsertTradeLedgerEvent("LIQUIDATE")).toBe(true);

    expect(shouldInsertTradeLedgerEvent("CANCELLED")).toBe(false);
    expect(shouldInsertTradeLedgerEvent("LimitPriceAdded")).toBe(false);
    expect(shouldInsertTradeLedgerEvent("CancelledStopLoss")).toBe(false);
  });

  it("pending trade event creates pending trade-open ledger row without balance mutation", () => {
    const state: RelayerState = {
      zk: {
        zkAccounts: [
          {
            address:
              "0c1aff01b685d7268306394719f35f947e5f49b08fc14b706c8aefd2f16a59441c367bd4bd1489292fe38cba6001cb51359499bc2bace111f9d45f0616a414b90d9b7cde5c",
            tag: "main",
            type: "Coin",
            value: 3750,
          },
          {
            address:
              "0cd833f3ca20ec03f5ee3239c59f6475fd9a4c2fb81fc5c9e1a65cd25f755dfd585af70f69639e0b717694bd445b71c95960630c4f440e95fe9fb450fa0947973ca5ab8119",
            tag: "BTC buy 0cd833",
            type: "Coin",
            value: 3750,
          },
          {
            address:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            tag: "BTC buy 0c2cbd",
            type: "Memo",
            value: 2500,
          },
        ],
      },
      trade: {
        trades: [
          {
            accountAddress:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            isOpen: true,
          },
          {
            accountAddress:
              "0cd833f3ca20ec03f5ee3239c59f6475fd9a4c2fb81fc5c9e1a65cd25f755dfd585af70f69639e0b717694bd445b71c95960630c4f440e95fe9fb450fa0947973ca5ab8119",
            isOpen: true,
          },
        ],
      },
      lend: { lends: [] },
      account_ledger: { entries: [{ fund_bal_after: 240246 }] },
    };

    const trade = makeTrade();
    const txHash: TransactionHash = {
      account_id: "acc",
      datetime: "2026-03-30T11:13:37.755Z",
      id: 1,
      order_id: trade.uuid,
      order_status: "PENDING",
      order_type: "LIMIT",
      output: null,
      reason: null,
      old_price: null,
      new_price: 65535.65,
      request_id:
        "REQID2E2BF61DCC3EF509470CB3C4E160F77E30C70C98560B14F23E233E7100B9FD0C",
      tx_hash: "",
    };

    const entry = buildTradeLedgerEntryFromRelayerEvent(state, trade, txHash);
    expect(entry.type).toBe("trade-open");
    expect(entry.status).toBe("pending");
    expect(entry.trade_bal_before).toBe(7500);
    expect(entry.trade_bal_after).toBe(7500);
    expect(entry.t_positions_bal_before).toBe(2500);
    expect(entry.t_positions_bal_after).toBe(2500);
    expect(entry.tx_hash).toBeNull();
  });

  it("lend deposit and withdraw relayer rows mirror snapshot transitions", () => {
    const baseFund = 200246;
    const lendAddress =
      "0cee690f057f1c3fa2a3b8b83266c2e93ba424074a279bb12daca2067b3dc6ba65ce344495914b5fd72112216d2b88cad9c36dd37f4f0351fcc56d161d32b6e9465b65e904";

    const depositState: RelayerState = {
      zk: {
        zkAccounts: [
          {
            address:
              "0c1aff01b685d7268306394719f35f947e5f49b08fc14b706c8aefd2f16a59441c367bd4bd1489292fe38cba6001cb51359499bc2bace111f9d45f0616a414b90d9b7cde5c",
            tag: "main",
            type: "Coin",
            value: 7500,
          },
          { address: lendAddress, tag: "BTC lend 3", type: "Coin", value: 40000 },
          {
            address:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            tag: "BTC buy 0c2cbd",
            type: "Memo",
            value: 2500,
          },
        ],
      },
      trade: {
        trades: [
          {
            accountAddress:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            isOpen: true,
          },
        ],
      },
      lend: { lends: [] },
      account_ledger: { entries: [{ fund_bal_after: baseFund }] },
    };

    const depositTx: TransactionHash = {
      account_id: "acc",
      datetime: "2026-03-30T11:14:58.047Z",
      id: 1,
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

    const depositEntry = buildLendLedgerEntryFromRelayerEvent(
      depositState,
      depositTx,
      {
        accountAddress: lendAddress,
        accountTag: "BTC lend 3",
        amountSats: 40000,
        fundingAddress: "twilight1k9mu3452mzzhr76pwqqngypl3j5s9smcp8htvk",
        operation: "deposit",
      }
    );

    expect(depositEntry.type).toBe("lend-deposit");
    expect(depositEntry.status).toBe("confirmed");
    expect(depositEntry.trade_bal_before).toBe(47500);
    expect(depositEntry.trade_bal_after).toBe(7500);
    expect(depositEntry.l_deposits_bal_before).toBe(0);
    expect(depositEntry.l_deposits_bal_after).toBe(40000);
    expect(depositEntry.order_id).toBe("9e8eadb4-e02f-40b7-b0e9-399e804e0e8c");

    const withdrawState: RelayerState = {
      ...depositState,
      zk: {
        zkAccounts: [
          {
            address:
              "0c1aff01b685d7268306394719f35f947e5f49b08fc14b706c8aefd2f16a59441c367bd4bd1489292fe38cba6001cb51359499bc2bace111f9d45f0616a414b90d9b7cde5c",
            tag: "main",
            type: "Coin",
            value: 7500,
          },
          { address: lendAddress, tag: "BTC lend 3", type: "Memo", value: 40000 },
          {
            address:
              "0c2cbd3c9a11f4f9747aea2bfd88c8e0c09a57dd7dd1f083f670db8c086cad521ba44077ed93e3947f115584429298b1e351cccea97529220fe2c7ee5dba06c8204daf0d9a",
            tag: "BTC buy 0c2cbd",
            type: "Memo",
            value: 2500,
          },
        ],
      },
      lend: {
        lends: [{ accountAddress: lendAddress, orderStatus: "LENDED", value: 40000 }],
      },
    };

    const withdrawTx: TransactionHash = {
      ...depositTx,
      datetime: "2026-03-30T11:15:12.022Z",
      order_status: "SETTLED",
      request_id:
        "REQID4BA8642260EE76206673951BE34036FAF0A28804C7C69D188C3D1FBE1A3FBF4F",
      tx_hash: "0D4AE02D5A133F994ED858233ED16F7EFB9CEE85B182A9DCB7555752826AF314",
    };

    const withdrawEntry = buildLendLedgerEntryFromRelayerEvent(
      withdrawState,
      withdrawTx,
      {
        accountAddress: lendAddress,
        accountTag: "BTC lend 3",
        amountSats: 40000,
        fundingAddress: "twilight1k9mu3452mzzhr76pwqqngypl3j5s9smcp8htvk",
        operation: "withdraw",
      }
    );

    expect(withdrawEntry.type).toBe("lend-withdraw");
    expect(withdrawEntry.status).toBe("confirmed");
    expect(withdrawEntry.trade_bal_before).toBe(7500);
    expect(withdrawEntry.trade_bal_after).toBe(47500);
    expect(withdrawEntry.l_deposits_bal_before).toBe(40000);
    expect(withdrawEntry.l_deposits_bal_after).toBe(0);
    expect(withdrawEntry.order_id).toBe("9e8eadb4-e02f-40b7-b0e9-399e804e0e8c");
  });
});
