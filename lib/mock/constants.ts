import type { registeredBtcAddressStruct } from "../types";
import type { BtcReserveStruct } from "../api/rest";
import type {
  IndexerDeposit,
  IndexerWithdrawal,
  IndexerAccount,
  BridgeAnalytics,
} from "../api/indexer";

export const IS_MOCK = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

export const MOCK_TWILIGHT_ADDRESS =
  "twilight1mock0address0for0dev0testing0only0xyz";

export const MOCK_BTC_DEPOSIT_ADDRESS =
  "bc1qrp33g0q5dn0gf5y63qnvaex6s0yvpe6xtq4cyd";

export const MOCK_TX_HASH =
  "A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2";

export const MOCK_SATS_BALANCE = 500_000;
export const MOCK_NYKS_BALANCE = 100;

export const MOCK_BTC_RESERVES: BtcReserveStruct[] = [
  {
    ReserveId: "1",
    ReserveAddress: "bc1qreserve0address0one0for0testing0000tq4aaa",
    JudgeAddress: "twilight1judge0address0one0000000000000xyz",
    BtcRelayCapacityValue: "10000000",
    TotalValue: "5000000",
    PrivatePoolValue: "2000000",
    PublicValue: "3000000",
    FeePool: "50000",
    UnlockHeight: "9999999",
    RoundId: "1",
  },
  {
    ReserveId: "2",
    ReserveAddress: "bc1qreserve0address0two0for0testing0000tq4aaa",
    JudgeAddress: "twilight1judge0address0two0000000000000xyz",
    BtcRelayCapacityValue: "8000000",
    TotalValue: "4000000",
    PrivatePoolValue: "1500000",
    PublicValue: "2500000",
    FeePool: "40000",
    UnlockHeight: "9999999",
    RoundId: "2",
  },
];

export const MOCK_BITCOIN_INFO = {
  blockHeight: 840_000,
  feeEstimate: { satPerVbyte: 15, btcPerKb: 0.00015, targetBlocks: 6 },
};

export const MOCK_REGISTERED_ADDRESSES: registeredBtcAddressStruct[] = [
  {
    btcDepositAddress: MOCK_BTC_DEPOSIT_ADDRESS,
    btcSatoshiTestAmount: String(MOCK_SATS_BALANCE),
    twilightStakingAmount: "10000",
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    isConfirmed: true,
    CreationTwilightBlockHeight: "100",
  },
];

export const MOCK_INDEXER_DEPOSITS: IndexerDeposit[] = [
  {
    id: "dep-001",
    btcDepositAddress: MOCK_BTC_DEPOSIT_ADDRESS,
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    amount: 250_000,
    confirmed: true,
    blockHeight: 839_990,
    createdAt: "2025-12-01T10:30:00Z",
    txHash: "aabb" + "cc".repeat(30),
  },
];

export const MOCK_INDEXER_WITHDRAWALS: IndexerWithdrawal[] = [
  {
    id: "wdr-001",
    withdrawAddress: MOCK_BTC_DEPOSIT_ADDRESS,
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    amount: 50_000,
    reserveId: 1,
    confirmed: true,
    blockHeight: 839_995,
    createdAt: "2025-12-02T14:00:00Z",
    txHash: "ddee" + "ff".repeat(30),
  },
];

export const MOCK_ACCOUNT_DATA: IndexerAccount = {
  address: MOCK_TWILIGHT_ADDRESS,
  balances: [
    { denom: "sats", amount: String(MOCK_SATS_BALANCE) },
    { denom: "nyks", amount: String(MOCK_NYKS_BALANCE) },
  ],
  deposits: MOCK_INDEXER_DEPOSITS,
  withdrawals: MOCK_INDEXER_WITHDRAWALS,
};

export const MOCK_BRIDGE_ANALYTICS: BridgeAnalytics = {
  totalDeposits: 142,
  totalWithdrawals: 87,
  depositVolumeSats: 35_500_000,
  withdrawalVolumeSats: 12_750_000,
  avgDepositSats: 250_000,
  avgWithdrawalSats: 146_552,
};
