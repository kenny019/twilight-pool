# Wallet v2 File-by-File Implementation Plan

Produced from `docs/implementation_plan_v2.md`. All Phase 0 locks are respected. No spec redesign.

---

## 1. File-by-file implementation map

### New files

| File | Purpose | Change type |
|---|---|---|
| `app/(main)/wallet/use-wallet-data.ts` | Custom hook — single source of all Wallet v2 derived data (summary, allocation, pending, accounts) | create |
| `lib/lend/lend-mark-to-value.ts` | Shared helper extracting the authoritative lending mark-to-value computation from `my-investment.client.tsx` | create |

### Modified files

| File | Purpose in Wallet v2 | Change type | Summary of changes |
|---|---|---|---|
| `app/(main)/wallet/page.tsx` | Route component — rewires JSX to consume `useWalletData()`, restructures layout to spec 7-section model | edit (major) | Remove Trade/Lend analytics card + dead memos/imports. Replace Asset Overview with Capital Summary. Replace My Accounts with Capital Allocation. Add Quick Actions row. Add Pending Operations section. Move Active Accounts out of tabs into standalone section. Reduce tabs from 3 to 2 (rename "Transaction History" → "Wallet Activity"). Add Utility Row at bottom. Wire Transfer button to `TransferDialog`. Apply `formatSatsCompact` formatting. |
| `app/(main)/wallet/account-summary/data-table.tsx` | Desktop table + mobile cards for ZK accounts | edit (minor) | Mobile cards: reorder to label-first (currently address-first at line 187). Move truncated address to a secondary line or expandable detail area. Prefer label-first presentation and secondary placement of address/txHash. Full desktop hide-behind-expand can be deferred in the first pass if it requires a larger table rewrite. |
| `app/(main)/wallet/account-summary/columns.tsx` | Column definitions for account-summary table | no change | Column order remains as-is on desktop for first pass. No edits needed. |
| `app/(main)/wallet/account-summary/status.ts` | Status derivation and helpers | no change | Logic is correct and preserved. |
| `app/(main)/wallet/transaction-history/data-table.tsx` | Desktop table + mobile cards for wallet activity | no change | Content stays; tab label changes happen in page.tsx. |
| `app/(main)/wallet/transaction-history/columns.tsx` | Column definitions for transaction history | no change | No modifications required. |
| `app/(main)/wallet/account-ledger/data-table.tsx` | Desktop table + mobile cards for ledger | no change | Stays as-is. Already feature-rich (683 lines with column config, display units, pagination). |
| `app/(main)/wallet/account-ledger/columns.tsx` | Column definitions for ledger | no change | No modifications required. |
| `app/_components/wallet/transfer-dialog.client.tsx` | Canonical wallet transfer surface | move usage only | Currently imported but never rendered in page.tsx. First-pass: render it as the target of the top-level "Transfer" Quick Action button. No internal changes to TransferDialog itself. |
| `components/fund-trade-button.tsx` | Narrower Fund↔Trade shortcut | no change | Remains in repo. Removed from wallet page allocation rows (replaced by row-level labeled actions that deep-link or open TransferDialog). Not deleted — still used elsewhere in the app. |
| `app/_components/lend/my-investment.client.tsx` | Source of authoritative lending mark-to-value logic | edit (minor) | Extract the `useMemo` computation (lines 27-95 data derivation) into the shared `lend-mark-to-value.ts` helper. `my-investment.client.tsx` then imports and calls the helper instead of computing inline. Zero behavior change. |

### Files explicitly NOT touched

| File | Reason |
|---|---|
| `app/(main)/wallet/account-summary/columns.tsx` | Desktop column order preserved in first pass |
| `app/(main)/wallet/account-summary/status.ts` | Logic correct as-is |
| `app/(main)/wallet/transaction-history/*` | No changes — tab rename is in page.tsx |
| `app/(main)/wallet/account-ledger/*` | No changes needed |
| `components/fund-trade-button.tsx` | Preserved as narrow shortcut; not modified or deleted |
| `lib/state/local/accounts.ts` | Read-only — selectors already expose `masterAccountBlocked`, `masterAccountBlockReason`, `pendingMasterAccount` |
| `lib/state/local/withdraw.ts` | Read-only — `withdrawals: WithdrawOrder[]` already available with `status: "queued" | "completed"` |
| `lib/state/local/lend.ts` | Read-only — `lends[].withdrawPending` already available |

---

## 2. Final phased implementation sequence

### Phase 1: Extract shared lending mark-to-value helper

**Objective:** Create a shared pure function so both Wallet v2 and `my-investment.client.tsx` use the same computation.

**Files touched:**
- Create: `lib/lend/lend-mark-to-value.ts`
- Edit: `app/_components/lend/my-investment.client.tsx` (import helper, remove inline computation)

**Exact change scope:**
- New file exports `computeLendingMarkToValue(lends: LendOrder[], poolSharePrice: number): { activePrincipalSats: number; pendingRewardsSats: number; markToValueSats: number }`. Filters `orderStatus === "LENDED"`, applies `poolSharePrice * (npoolshare / POOL_SHARE_DECIMALS_SCALE) - value` per order, zeroes positive dust < 100 sats, keeps negatives.
- `my-investment.client.tsx`: replace inline `useMemo` data derivation (lines ~27-65) with a call to the shared helper. APR calculation and display-specific fields remain inline in that component.

**Dependencies:** None.

**Regression risk:** Low. Pure refactor of existing computation into shared helper. Verify `my-investment.client.tsx` renders identically.

**Rollback:** Delete new file, revert `my-investment.client.tsx` import.

---

### Phase 2: Remove Trade/Lend analytics (spec §8)

**Objective:** Strip content the spec explicitly excludes from wallet.

**Files touched:**
- `app/(main)/wallet/page.tsx`

**Exact change scope:**
- Delete JSX: entire Trades/Lend card (lines 605-675)
- Delete memos: `activeTrades` (186-191), `totalPnl` (193-205), `totalVolume` (207-216), `lendUnrealizedRewards` (226-233), `lendPnl` (235-237), `pnlColor` (239-241), BTC string derivations for PnL/volume/yield (242-249)
- Delete imports: `calculateUpnl` (line 46)
- Delete store selectors: `tradeHistory` (line 71), `lendHistory` (line 73)
- Keep: `poolInfo` selector (needed for mark-to-value), `activeLends` memo (needed for locked capital), `POOL_SHARE_DECIMALS_SCALE` import (needed for mark-to-value)
- Desktop grid: temporarily shows 2 cards instead of 3 (full restructure in Phase 4)

**Dependencies:** None.

**Regression risk:** None. All removed code is presentation-only with no consumers outside this page.

**Rollback:** `git revert` the single commit.

---

### Phase 3: Create `useWalletData` hook

**Objective:** Centralize all Wallet v2 data derivation into a single hook so Phase 4+ consumes clean data.

**Files touched:**
- Create: `app/(main)/wallet/use-wallet-data.ts`
- Edit: `app/(main)/wallet/page.tsx` (consume hook, remove inline computations)

**Exact change scope:**
- New hook (see section 3 below for full shape) handles: summary metrics, allocation rows, pending operations, active accounts, utility data, price
- `page.tsx`: replace inline balance computations (lines 125-270) with `const walletData = useWalletData()`. Move `activeAccounts` memo (lines 76-108) into hook. Keep `subaccountTransfer` inline (it's an action, not data). Keep `Tab` state and `renderTableContent` inline.
- Import the shared `computeLendingMarkToValue` from Phase 1

**Dependencies:** Phase 1 (shared helper), Phase 2 (removed dead code)

**Regression risk:** Low. All values derived from the same store selectors. Can be verified by asserting identical rendered values before/after. UI structure remains the same at this phase; the main change is centralizing derivation into the hook instead of computing values inline in page.tsx.

**Rollback:** Delete hook file, restore inline computations.

---

### Phase 4: Restructure page layout

**Objective:** Replace 3-card + 3-tab layout with spec's 7-section model.

**Files touched:**
- `app/(main)/wallet/page.tsx` (major JSX rewrite)
- `app/(main)/wallet/account-summary/data-table.tsx` (mobile card reorder)

**Exact change scope in `page.tsx`:**

```
Current layout:                    New layout:
─────────────────                  ─────────────────
[Asset Overview][Trades][Accounts] [Capital Summary        ]
[Tabs: Accounts|History|Ledger  ]  [Quick Actions           ]
                                   [Capital Allocation      ]
                                   [Pending Operations (if) ]
                                   [Accounts                ]
                                   [Activity Tabs (2)       ]
                                   [Utility Row             ]
```

Sub-changes:

1. **Capital Summary** (replaces Asset Overview card):
   - Shows: `totalBalanceSats` (BTC + USD), `availableToTradeSats` (BTC + USD), `lockedCapitalSats` (BTC + USD)
   - Source: `walletData.summary.*`
   - Remove: Twilight address, NYKS balance, explanatory text from this card

2. **Quick Actions** (new row):
   - "Deposit" → `<Link href="/deposit">`
   - "Withdraw" → `<Link href="/withdrawal">`
   - "Transfer" → `<TransferDialog defaultAccount="funding"><Button>Transfer</Button></TransferDialog>`
   - All text-labeled buttons, no icon-only

3. **Capital Allocation** (replaces My Accounts card):
   - 3-segment allocation bar (desktop only, `hidden md:flex`): Funding / Trading / Lending
   - 3 allocation rows with: label, BTC value (`formatSatsCompact`), USD, %, action button(s); percentages must be derived against the Wallet v2 total balance model, not raw ZK totals
   - Funding actions: "Deposit" link, "Withdraw" link, "Move to Trading" opens TransferDialog
   - Trading actions: "Trade" link to `/`, "Transfer" opens TransferDialog
   - Lending action: "Lend" link to `/lend`
   - No Locked row (overlapping metric, shown only in Capital Summary)
   - Remove icon-only `FundingTradeButton` instances (lines 714, 743)

4. **Pending Operations** (new, conditional):
   - Renders only when `walletData.pending.hasAny === true`
   - Source: `walletData.pending.items[]`
   - See section 5 below for per-type detail

5. **Accounts** (moved out of tabs):
   - Render `<AccountSummaryDataTable>` directly in page body
   - Remove from `TabType` union

6. **Activity Tabs** (2 tabs):
   - `TabType = "wallet-activity" | "account-ledger"`
   - Rename "Transaction History" / "Transactions" → "Wallet Activity"
   - Keep "Account Ledger"
   - Default tab: `"wallet-activity"`

7. **Utility Row** (relocated):
   - Twilight address (truncated + copy-on-click) + NYKS balance
   - Compact single-line layout at bottom of page

**Exact change scope in `account-summary/data-table.tsx`:**
- Mobile card list (lines 167-303): swap primary line from truncated address to account label/tag
- Move truncated address to a secondary line or expandable detail area; full desktop hide-behind-expand can be deferred in the first pass if it requires a larger table rewrite
- No desktop table column reorder

**Dependencies:** Phase 3 (data hook must exist)

**Regression risk:** Medium. Largest change. Must verify: all wallet data visible, all actions functional (TransferDialog, subaccountTransfer), mobile stacks correctly, desktop maintains density.

**Rollback:** `git revert` — single commit covers both files.

---

### Phase 5: Add Pending Operations section

**Objective:** Surface pending/recovery states per spec §5.4.

**Files touched:**
- `app/(main)/wallet/page.tsx` (new JSX section, data already in hook)

**Exact change scope:**
- New conditional section between Capital Allocation and Accounts
- Renders `walletData.pending.items.map(...)` — each item as a status row with icon, label, description, optional action
- See section 5 below for per-item rendering

**Dependencies:** Phase 3 (data), Phase 4 (layout position exists)

**Regression risk:** None. Pure addition. Renders nothing when no pending state.

**Rollback:** Remove JSX block.

---

### Phase 6: Number formatting

**Objective:** Apply spec §7 formatting rules across all wallet values.

**Files touched:**
- `app/(main)/wallet/page.tsx` (all balance displays)

**Exact change scope:**
- Replace `.toFixed(8)` and manual BTC formatting with `formatSatsCompact()` from `lib/helpers.ts`
- `formatSatsCompact` already implements the spec's tiered rules: 0 → "0 BTC", < 100K sats → sats, 100K-1M → mBTC, ≥ 1M → BTC with trailing zeros trimmed
- Add USD equivalent (≈ $X.XX) alongside every non-zero BTC value
- Ensure `font-variant-numeric: tabular-nums` on all numeric displays

**Dependencies:** Phase 4 (layout must be final)

**Regression risk:** None — cosmetic only.

**Rollback:** Revert formatting calls.

---

## 3. Data derivation plan

### `useWalletData()` hook — `app/(main)/wallet/use-wallet-data.ts`

```ts
interface WalletData {
  summary: {
    totalBalanceSats: number;
    availableToTradeSats: number;
    lockedCapitalSats: number;
    totalBalanceUsd: number;
    availableToTradeUsd: number;
    lockedCapitalUsd: number;
  };

  allocation: {
    fundingSats: number;
    tradingSats: number;
    lendingMarkToValueSats: number;
    fundingUsd: number;
    tradingUsd: number;
    lendingMarkToValueUsd: number;
    fundingPct: number;
    tradingPct: number;
    lendingPct: number;
  };

  pending: {
    hasAny: boolean;
    items: PendingItem[];
  };

  accounts: {
    activeAccounts: ActiveAccount[];
  };

  utility: {
    twilightAddress: string;
    nyksBalance: number;
    nyksLoading: boolean;
    fundingLoading: boolean;
  };

  price: {
    btcPriceUsd: number;
  };

  // Raw store pass-throughs — not transformed by the hook.
  // Kept in the hook so page.tsx has a single data dependency.
  activity: {
    transactionHistory: TransactionHistory[];
    accountLedgerEntries: AccountLedgerEntry[];
  };
}

interface PendingItem {
  type: "recovery" | "btc-withdrawal" | "lend-withdrawal";
  label: string;
  description: string;
  count?: number;
  action?: { label: string; href?: string; onClick?: () => void };
}
```

### Derivation rules

**Summary:**

```
fundingSats          = twilightSats (from useGetTwilightBTCBalance)
tradingSats          = zkAccounts.find(a.tag === "main")?.value ?? 0
lendingMTV           = computeLendingMarkToValue(lends, poolInfo?.pool_share ?? 0)
lendingMarkToValueSats = lendingMTV.markToValueSats

totalBalanceSats     = fundingSats + tradingSats + lendingMarkToValueSats
availableToTradeSats = tradingSats
lockedCapitalSats    = zkAccounts
                         .filter(a.tag !== "main" && a.type === "Memo")
                         .reduce((sum, a) => sum + (a.value ?? 0), 0)

*Usd = *Sats / 100_000_000 * btcPriceUsd
```

**Locked Capital is NOT added to totalBalanceSats.** It is an overlapping state metric — the underlying capital is already counted within Trading (via Memo accounts) and Lending. It appears only in the Capital Summary as "capital currently in use."

**Allocation percentages:**

```
allocationTotal = fundingSats + tradingSats + lendingMarkToValueSats
fundingPct  = allocationTotal > 0 ? fundingSats / allocationTotal * 100 : 0
tradingPct  = allocationTotal > 0 ? tradingSats / allocationTotal * 100 : 0
lendingPct  = allocationTotal > 0 ? lendingMarkToValueSats / allocationTotal * 100 : 0
```

Three buckets only. Locked excluded from allocation (Phase 0 lock).

**Lending mark-to-value** (via shared helper from Phase 1):

```ts
import { computeLendingMarkToValue } from "@/lib/lend/lend-mark-to-value";

const lendingMTV = computeLendingMarkToValue(lends, poolInfo?.pool_share ?? 0);
// lendingMTV.activePrincipalSats — sum of active lend order .value
// lendingMTV.pendingRewardsSats  — unrealized yield (can be negative)
// lendingMTV.markToValueSats     — activePrincipalSats + pendingRewardsSats
```

The helper replicates the exact logic from `my-investment.client.tsx`:
- Filters `orderStatus === "LENDED"`
- Per order: `rewards = poolSharePrice * (npoolshare / 10_000) - value`
- Positive dust < 100 sats → zeroed; negatives kept
- Returns `{ activePrincipalSats, pendingRewardsSats, markToValueSats }`

**Pending operations** (from raw store slices):

```ts
const masterAccountBlocked = useTwilightStore(s => s.zk.masterAccountBlocked);
const masterAccountBlockReason = useTwilightStore(s => s.zk.masterAccountBlockReason);
const pendingMasterAccount = useTwilightStore(s => s.zk.pendingMasterAccount);
const withdrawals = useTwilightStore(s => s.withdraw.withdrawals);
const pendingLendWithdrawals = lends.filter(l => l.withdrawPending === true);
const pendingBtcWithdrawals = withdrawals.filter(w => w.status === "queued");
```

**Active accounts** — existing `activeAccounts` memo (page.tsx lines 76-108) moved verbatim into hook.

**Utility** — `twilightAddress` from `mainWallet?.getChainWallet("nyks")?.address`, `nyksBalance` from `useGetNyksBalance()`.

**Price** — `btcPriceUsd` from `useSyncExternalStore(priceFeed.subscribe, priceFeed.getSnapshot)` falling back to `useSessionStore(s => s.price.btcPrice)`.

### Store selectors consumed by useWalletData

| Selector | Slice |
|---|---|
| `state.zk.zkAccounts` | accounts |
| `state.zk.masterAccountBlocked` | accounts |
| `state.zk.masterAccountBlockReason` | accounts |
| `state.zk.pendingMasterAccount` | accounts |
| `state.lend.lends` | lend |
| `state.lend.poolInfo` | lend |
| `state.withdraw.withdrawals` | withdraw |
| `state.trade.trades` | trade (for `activeAccounts` derivation only) |
| `state.history.transactions` | history (passed through, not transformed) |
| `state.account_ledger.entries` | account_ledger (passed through) |

---

## 4. Transfer integration plan

### Quick Actions wiringok no

| Button | Target | Implementation |
|---|---|---|
| **Deposit** | `/deposit` page | `<Link href="/deposit"><Button>Deposit</Button></Link>` — plain navigation |
| **Withdraw** | `/withdrawal` page | `<Link href="/withdrawal"><Button>Withdraw</Button></Link>` — plain navigation |
| **Transfer** | `TransferDialog` | `<TransferDialog defaultAccount="funding"><Button>Transfer</Button></TransferDialog>` — renders TransferDialog in-place, triggered by the button child |

### TransferDialog integration

**Where state lives:** Inside `TransferDialog` itself. The component is self-contained — it manages its own `fromAccountValue`, `toAccountValue`, `selectedTradingAccount*`, `depositAmount`, `isSubmitLoading` state. No external state coordination needed.

**Props to pass:**
```tsx
<TransferDialog defaultAccount="funding">
  <Button variant="outline">Transfer</Button>
</TransferDialog>
```

`defaultAccount="funding"` sets the initial "From" to Funding, which is the most common wallet transfer direction. The user can toggle inside the dialog.

**No changes to TransferDialog internals** in first pass. It already supports:
- Funding → Trading (cosmos tx)
- Trading → Trading (ZK-to-ZK)
- Trading → Funding (ZK burn → cosmos)
- Subaccount selection
- New account creation

### Allocation row actions

| Row | Actions | Implementation |
|---|---|---|
| **Funding** | Deposit, Withdraw, Move to Trading | "Deposit" → `<Link href="/deposit">`, "Withdraw" → `<Link href="/withdrawal">`, "Move to Trading" → `<TransferDialog defaultAccount="funding">` |
| **Trading** | Trade, Transfer | "Trade" → `<Link href="/">`, "Transfer" → `<TransferDialog defaultAccount="trading">` |
| **Lending** | Lend | "Lend" → `<Link href="/lend">` |

### FundingTradeButton in first pass

**Removed from wallet page entirely.** The two icon-only `FundingTradeButton type="icon"` instances on the Funding row (line 714) and Trading row (line 743) are replaced by:
- Labeled "Move to Trading" / "Transfer" buttons that open `TransferDialog`

`FundingTradeButton` is NOT deleted from the repo — it remains in `components/fund-trade-button.tsx` for use by other surfaces (trade page header, etc). It is simply no longer rendered on the wallet page.

### subaccountTransfer

Remains inline in `page.tsx` for first pass. It is passed to `<AccountSummaryDataTable>` via `subaccountTransfer` prop exactly as today. The "Transfer to Funding" action in the accounts table continues to use this function (not TransferDialog), because it handles the specific ZK burn flow for non-main accounts.

---

## 5. Pending Operations plan

### Per-item breakdown

#### 1. Master account recovery

| Field | Value |
|---|---|
| **Source selector** | `state.zk.masterAccountBlocked` (boolean), `state.zk.masterAccountBlockReason` (string \| null), `state.zk.pendingMasterAccount` (PendingMasterAccountRecovery \| null) |
| **Display condition** | `masterAccountBlocked === true` |
| **Display label** | "Account Recovery Required" |
| **Status logic** | If `pendingMasterAccount !== null`: show "Recovery in progress" with `pendingMasterAccount.value` sats and `pendingMasterAccount.createdAt` timestamp. If `masterAccountBlocked && !pendingMasterAccount`: show "Action required" with `masterAccountBlockReason`. |
| **Action** | First pass: informational only (the recovery flow is triggered automatically by the transfer dialog when it encounters a blocked master account). Future pass: explicit "Retry Recovery" button. |
| **Pass** | First pass |

#### 2. BTC withdrawal pending

| Field | Value |
|---|---|
| **Source selector** | `state.withdraw.withdrawals` filtered by `status === "queued"` |
| **Display condition** | `pendingBtcWithdrawals.length > 0` |
| **Display label** | "BTC Withdrawal Pending" |
| **Status logic** | Show count: `"{n} withdrawal(s) pending"`. `WithdrawOrder` has `status: "queued" | "completed"` — display only `"queued"` entries. Each entry has `amount` (sats) and `created_at` (timestamp). |
| **Action** | First pass: informational with count and total amount. No cancel action (withdrawals are on-chain). |
| **Pass** | First pass |

#### 3. Lend withdrawal pending

| Field | Value |
|---|---|
| **Source selector** | `state.lend.lends` filtered by `withdrawPending === true` |
| **Display condition** | `pendingLendWithdrawals.length > 0` |
| **Display label** | "Lending Withdrawal in Progress" |
| **Status logic** | Show count: `"{n} lend withdrawal(s) in progress"`. Each `LendOrder` with `withdrawPending: true` has `value` (sats) and `uuid`. |
| **Action** | First pass: informational with count. No cancel action (withdrawal is in-flight with relayer). |
| **Pass** | First pass |

#### 4. Deposit in progress

| Field | Value |
|---|---|
| **Source selector** | None available — no durable wallet-level deposit state in repo |
| **Display condition** | N/A |
| **Display label** | N/A |
| **Status logic** | N/A |
| **Action** | N/A |
| **Pass** | **NOT first pass.** No durable wallet-level source exists today. Deposit tracking lives on `/deposit` page via `useGetRegisteredBTCAddress` polling. Adding it to wallet would require either (a) calling the same hook (extra network query) or (b) new store slice. Deferred to future pass. |

### Confirmation

**No first-class "Deposit in progress" item in first pass.** This is explicitly locked in Phase 0 §0.3.

### PendingItem construction in useWalletData

```ts
const items: PendingItem[] = [];

if (masterAccountBlocked) {
  items.push({
    type: "recovery",
    label: "Account Recovery Required",
    description: pendingMasterAccount
      ? `Recovery in progress — ${formatSatsCompact(pendingMasterAccount.value)} at risk`
      : masterAccountBlockReason ?? "Trading account requires recovery",
  });
}

if (pendingBtcWithdrawals.length > 0) {
  const totalSats = pendingBtcWithdrawals.reduce((s, w) => s + w.amount, 0);
  items.push({
    type: "btc-withdrawal",
    label: "BTC Withdrawal Pending",
    description: `${pendingBtcWithdrawals.length} withdrawal${pendingBtcWithdrawals.length > 1 ? "s" : ""} pending (${formatSatsCompact(totalSats)})`,
    count: pendingBtcWithdrawals.length,
  });
}

if (pendingLendWithdrawals.length > 0) {
  const totalSats = pendingLendWithdrawals.reduce((s, l) => s + l.value, 0);
  items.push({
    type: "lend-withdrawal",
    label: "Lending Withdrawal in Progress",
    description: `${pendingLendWithdrawals.length} lend withdrawal${pendingLendWithdrawals.length > 1 ? "s" : ""} in progress (${formatSatsCompact(totalSats)})`,
    count: pendingLendWithdrawals.length,
  });
}

const hasAny = items.length > 0;
```

---

## 6. Minimal blocking questions

### Resolved (no longer blocking)

These are already locked by Phase 0 and repo inspection:

| Question | Resolution |
|---|---|
| Locked Capital semantics | Overlapping state metric, not allocation bucket (Phase 0 §0.1) |
| Lending mark-to-value source | Authoritative path in `my-investment.client.tsx` (Phase 0 §0.2) |
| Pending ops source precedence | Raw store slices first; ledger is supporting only (Phase 0 §0.3) |
| Canonical transfer surface | TransferDialog (Phase 0 §0.4) |
| WithdrawOrder status field | Confirmed: `status: "queued" \| "completed"` — sufficient for first pass |
| Deposit-in-progress | Deferred — no durable source (Phase 0 §0.3) |
| formatSatsCompact existence | Already exists in `lib/helpers.ts` with correct tiered rules |

### Remaining questions (non-blocking but worth confirming before implementation)

None. No blocking or non-blocking implementation questions remain after repo inspection and Phase 0 locks.

### Final assessment

**None.** No blocking questions remain. Implementation can proceed from this plan as written.
