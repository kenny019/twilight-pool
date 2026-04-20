import type { registeredBtcAddressStruct } from "../types";
import type { BtcReserveStruct, MsgProposeSweepAddressAmino } from "../api/rest";
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

// pushbytes-3 + LE height + OP_CLTV (0xb1). Prefix bytes are ignored by the decoder.
const makeMockBtcScript = (height: number): string => {
  const hex = height.toString(16).padStart(6, "0");
  const le = hex.match(/.{2}/g)!.reverse().join("");
  return `deadbeef03${le}b1`;
};

export const MOCK_PROPOSE_SWEEP_ADDRESSES: MsgProposeSweepAddressAmino[] = [
  // Reserve 1, round 2: three judges agree (quorum case).
  {
    reserveId: "1",
    roundId: "2",
    btcAddress: "bc1qmockpropose0reserve0one0round0two0sweep",
    btcScript: makeMockBtcScript(MOCK_BITCOIN_INFO.blockHeight + 100),
    judgeAddress: "twilight1judge0a0000000000000000000000000",
  },
  {
    reserveId: "1",
    roundId: "2",
    btcAddress: "bc1qmockpropose0reserve0one0round0two0sweep",
    btcScript: makeMockBtcScript(MOCK_BITCOIN_INFO.blockHeight + 100),
    judgeAddress: "twilight1judge0b0000000000000000000000000",
  },
  {
    reserveId: "1",
    roundId: "2",
    btcAddress: "bc1qmockpropose0reserve0one0round0two0sweep",
    btcScript: makeMockBtcScript(MOCK_BITCOIN_INFO.blockHeight + 100),
    judgeAddress: "twilight1judge0c0000000000000000000000000",
  },
  // Stale prior round for reserve 1 — should be filtered out by max-roundId selection.
  {
    reserveId: "1",
    roundId: "1",
    btcAddress: "bc1qstale0reserve0one0round0one0sweep00000",
    btcScript: makeMockBtcScript(MOCK_BITCOIN_INFO.blockHeight - 50),
    judgeAddress: "twilight1judge0a0000000000000000000000000",
  },
  // Reserve 2, round 5: single judge (common early-round case).
  {
    reserveId: "2",
    roundId: "5",
    btcAddress: "bc1qmockpropose0reserve0two0round0five0sweep",
    btcScript: makeMockBtcScript(MOCK_BITCOIN_INFO.blockHeight + 200),
    judgeAddress: "twilight1judge0a0000000000000000000000000",
  },
];

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
    id: 1,
    txHash: "aabb" + "cc".repeat(30),
    blockHeight: 839_990,
    reserveAddress: "bc1qreserve0address0one0for0testing0000tq4aaa",
    depositAmount: "250000",
    btcHeight: "840000",
    btcHash: "0000".repeat(16),
    twilightDepositAddress: MOCK_BTC_DEPOSIT_ADDRESS,
    oracleAddress: "twilight1oracle0mock0address00000000000",
    votes: 3,
    confirmed: true,
    createdAt: "2025-12-01T10:30:00Z",
  },
];

export const MOCK_INDEXER_WITHDRAWALS: IndexerWithdrawal[] = [
  {
    id: 1,
    withdrawIdentifier: "1",
    twilightAddress: MOCK_TWILIGHT_ADDRESS,
    withdrawAddress: MOCK_BTC_DEPOSIT_ADDRESS,
    withdrawReserveId: "1",
    blockHeight: 839_995,
    withdrawAmount: "50000",
    isConfirmed: true,
    createdAt: "2025-12-02T14:00:00Z",
  },
];

export const MOCK_TX = {
  hash: MOCK_TX_HASH,
  blockHeight: 839_990,
  blockTime: "2025-12-01T10:30:00Z",
  type: "MsgSend",
  messageTypes: ["MsgSend"],
  status: "success" as const,
  gasUsed: "80000",
  gasWanted: "100000",
  memo: null,
  programType: null,
};

export const MOCK_ACCOUNT_DATA: IndexerAccount = {
  account: {
    address: MOCK_TWILIGHT_ADDRESS,
    balance: String(MOCK_SATS_BALANCE),
    txCount: 2,
  },
  balances: [
    { denom: "sats", amount: String(MOCK_SATS_BALANCE) },
    { denom: "nyks", amount: String(MOCK_NYKS_BALANCE) },
  ],
  deposits: MOCK_INDEXER_DEPOSITS,
  withdrawals: MOCK_INDEXER_WITHDRAWALS,
  clearingAccount: null,
  zkosOperations: [],
  fragmentSigners: [],
};

export const MOCK_BRIDGE_ANALYTICS: BridgeAnalytics = {
  totalDeposits: 142,
  totalWithdrawals: 87,
  depositVolumeSats: 35_500_000,
  withdrawalVolumeSats: 12_750_000,
  avgDepositSats: 250_000,
  avgWithdrawalSats: 146_552,
};
