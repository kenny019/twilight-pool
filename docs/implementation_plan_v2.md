# Wallet v2 Implementation Plan

---

## 1. Current Implementation Audit

### Route Entry

`app/(main)/wallet/page.tsx` (859 lines) — single client component, owns all logic inline.

### Child Components

| Component | File | Purpose |
|---|---|---|
| AccountSummaryDataTable | app/(main)/wallet/account-summary/data-table.tsx | Desktop table + mobile card list for ZK accounts |
| accountSummaryColumns | app/(main)/wallet/account-summary/columns.tsx | Column defs: Created, Address, Balance, Type, Status, Label, TxHash, Actions |
| status.ts | app/(main)/wallet/account-summary/status.ts | Status derivation: Available, Locked in Position, Locked in Lending, Action Required |
| TransactionHistoryDataTable | app/(main)/wallet/transaction-history/data-table.tsx | Desktop table + mobile cards for internal transfers |
| transactionHistoryColumns | app/(main)/wallet/transaction-history/columns.tsx | Column defs: Date, Amount, Type, From, To, TxHash |
| AccountLedgerDataTable | app/(main)/wallet/account-ledger/data-table.tsx | Desktop table + mobile cards for ledger entries |
| accountLedgerColumns | app/(main)/wallet/account-ledger/columns.tsx | Column defs for ledger |
| FundingTradeButton | components/fund-trade-button.tsx | Bidirectional Fund↔Trade transfer dialog (icon variant used) |
| TransferDialog | app/_components/wallet/transfer-dialog.client.tsx | Imported but not rendered in current page (imported at line 2) |
| Tooltip | @/components/tooltip | Used on Funding and Allocated labels |

### Hooks / State Sources

| Data | Source | File:Line |
|---|---|---|
| Funding balance | useGetTwilightBTCBalance() → twilightSats | page.tsx:125 |
| Trading balance | zkAccounts.find(a => a.tag === "main")?.value | page.tsx:141-143 |
| Lending balance | lends.reduce((acc, l) => acc + l.value, 0) — raw deposit sats, NOT mark-to-value | page.tsx:172-175 |
| Allocated/locked | zkAccounts.filter(a.tag !== "main" && a.type === "Memo").reduce(value) | page.tsx:154-156 |
| Pending/recovery | Not read. masterAccountBlocked / pendingMasterAccount exist in lib/state/local/accounts.ts but wallet page does not subscribe | N/A |
| Lend withdrawPending | Not read. withdrawPending on LendOrder exists but wallet doesn't check | N/A |
| BTC withdrawals | Not read. withdraw.withdrawals slice exists but wallet doesn't show | N/A |
| Wallet activity | state.history.transactions (TransactionHistory[]) | page.tsx:110-112 |
| Account ledger | state.account_ledger.entries | page.tsx:113-115 |
| Twilight address | mainWallet?.getChainWallet("nyks")?.address | page.tsx:131 |
| NYKS balance | useGetNyksBalance() → nyksBalance | page.tsx:127 |
| Trade PnL | Recomputed via calculateUpnl() over activeTrades | page.tsx:193-205 |
| Volume | Recomputed from trades + tradeHistory | page.tsx:207-216 |
| Lend yield | Recomputed from activeLends × poolSharePrice | page.tsx:226-233 |
| Lend PnL | Recomputed from lendHistory.payment | page.tsx:235-237 |
| Live BTC price | usePriceFeed() + useSyncExternalStore | page.tsx:117-123 |
| Private key | useSessionStore(state.privateKey) | page.tsx:66 |
| Pool info | state.lend.poolInfo (for pool_share price) | page.tsx:74 |

### Transfer / Deposit / Withdraw Entry Points

| Action | Current Surface | Component |
|---|---|---|
| Fund→Trade | Icon button (⇄) in My Accounts grid, Funding row | FundingTradeButton type="icon" defaultTransferType="fund" at page.tsx:714 |
| Trade→Fund | Icon button (⇄) in My Accounts grid, Trading row | FundingTradeButton type="icon" defaultTransferType="trade" at page.tsx:743 |
| Subaccount→Funding | "Transfer to Funding" button in Active Accounts table | subaccountTransfer() at page.tsx:272-500 |
| Deposit | Not on wallet page. Header nav link to /deposit | nav-links.ts (mainnet only) |
| Withdraw | Not on wallet page. Header nav link to /withdrawal | nav-links.ts (mainnet only) |
| Lending row | Empty `<div>` — no action (line 771) | Dead row |
| Allocated row | Empty `<div />` — no action (line 805) | Dead row |

### Mobile-Specific Rendering

Wallet page has no explicit mobile handling in the page itself. Responsive behavior comes from:
- Top cards: flex-col stacking below `md:` via `md:grid md:grid-cols-12`
- My Accounts: `grid-cols-1 sm:grid-cols-3` per row
- Tabs: `max-md:min-h-[44px]`, shorter labels on `md:hidden`
- Child data tables: each has own `md:hidden` / `hidden md:block` split

---

## 2. Spec Mapping Table

Spec Section: 5.1 Capital Summary — Total BTC + USD, Available to Trade, Locked Capital
Current File/Component: page.tsx:531-562 (Asset Overview card) — shows total BTC + USD but NOT "Available to Trade" or "Locked Capital"
Status: Must be adapted. Remove Asset Overview card, replace with Capital Summary. Add Available to Trade (= trading account balance) and Locked Capital (= overlapping summary/state metric for capital in use — see Phase 0).
────────────────────────────────────────
Spec Section: 5.2 Quick Actions — Deposit, Withdraw, Transfer buttons with text labels
Current File/Component: Does not exist. Deposit/Withdraw are separate pages with no wallet buttons. Transfer is icon-only.
Status: Must be created. Add button row: Deposit (→ /deposit), Withdraw (→ /withdrawal), Transfer (→ TransferDialog — canonical transfer surface per Phase 0).
────────────────────────────────────────
Spec Section: 5.3 Capital Allocation — Allocation bar + rows with Funding/Trading/Lending, each with BTC/USD/% and action
Current File/Component: page.tsx:676-807 (My Accounts card) — has Funding/Trading/Lending/Allocated rows but: no allocation bar, no %, no USD on all rows, Lending shows deposit sats not mark-to-value, Allocated has no action, icon-only transfers
Status: Must be adapted. Replace My Accounts card with Capital Allocation component. Add allocation bar (desktop, 3-segment). Add % of total. Fix Lending to show mark-to-value. Add row actions per spec. Locked is not a separate allocation row (Phase 0 lock).
────────────────────────────────────────
Spec Section: 5.3 Row Actions — Funding: Deposit/Withdraw/Move. Trading: Trade/Transfer. Lending: Lend.
Current File/Component: Only Funding and Trading have icon transfer buttons. Lending row has empty `<div/>`. Allocated has `<div/>`.
Status: Must be adapted. Add proper labeled actions to each row.
────────────────────────────────────────
Spec Section: 5.4 Pending Operations — Conditional: withdrawal pending, account recovery, lend withdrawal pending
Current File/Component: Does not exist on wallet. State sources exist: masterAccountBlocked in ZK slice, withdrawPending on LendOrder, withdraw.withdrawals in withdraw slice
Status: Must be created. New conditional section reading pending state from raw store slices. No first-class deposit-in-progress in first pass (no durable source).
────────────────────────────────────────
Spec Section: 5.5 Accounts / Operations — Label-first, balance, status, action; technical data behind expand
Current File/Component: account-summary/data-table.tsx + columns.tsx + status.ts — Desktop shows raw columns (address first). Mobile shows hash first. Status logic exists.
Status: Must be adapted. Reorder to label-first. Prefer label-first presentation and secondary placement of address/txHash. Full desktop hide-behind-expand can be deferred if it requires a larger table rewrite. (not just mobile). Keep status.ts logic.
────────────────────────────────────────
Spec Section: 5.6 Activity Tabs — Wallet Activity + Account Ledger (2 tabs, no trade/lend history)
Current File/Component: page.tsx:810-854 — 3 tabs: Active Accounts, Transaction History, Account Ledger
Status: Must be adapted. Remove "Active Accounts" tab (moved to Accounts section above tabs). Rename "Transaction History" → "Wallet Activity". Keep "Account Ledger".
────────────────────────────────────────
Spec Section: 5.7 Utility Row — Twilight address (truncated + copy), NYKS balance
Current File/Component: page.tsx:564-603 — inside Asset Overview card as two separator-divided sections
Status: Must be relocated. Extract from hero card into a compact utility footer row below activity tabs.
────────────────────────────────────────
Spec Section: Trades card — Trade PnL, Volume
Current File/Component: page.tsx:605-637 (Trades section in middle card)
Status: Must be removed. Spec §8: "Wallet MUST NOT include Trade performance panels (PnL breakdown, volume)."
────────────────────────────────────────
Spec Section: Lend card — Accrued Yield, Lend PnL
Current File/Component: page.tsx:642-674 (Lend section in middle card)
Status: Must be removed. Spec §8: "Wallet MUST NOT include Lend performance panels (APY, yield detail)."

---

## 3. Data Mapping Table

Wallet v2 Field: Total Balance
Current Source: page.tsx:253: Big(twilightSats).plus(totalZkSatsBalance)
Notes / Issues: Current implementation is not spec-correct for Wallet v2 because it uses raw total ZK sats and does not incorporate authoritative lending mark-to-value from `my-investment.client.tsx`. Wallet v2 total must be recomputed from the validated capital model.
────────────────────────────────────────
Wallet v2 Field: Available to Trade
Current Source: page.tsx:143: tradingAccount?.value || 0
Notes / Issues: Exists as tradingAccountBalance. Just needs to be surfaced with this label. Note: this is the full ZK main account balance, which equals free margin only when no positions exist. When positions exist, margin is in separate Memo accounts, not deducted from main. So this IS correct per spec §3.2.
────────────────────────────────────────
Wallet v2 Field: Locked Capital
Current Source: Currently: zkAccounts.filter(tag !== "main" && type === "Memo").reduce(.value) (lines 154-156). This captures margin in positions, and overlaps with deployed lending usage at the product semantics level.
Notes / Issues: **Locked is overlapping, not additive.** It should be treated as a summary/state metric for capital currently in use, not as a disjoint allocation bucket. It must not be used as a separate row in allocation percentages or total/allocation math.
────────────────────────────────────────
Wallet v2 Field: Funding
Current Source: page.tsx:125: twilightSats from useGetTwilightBTCBalance()
Notes / Issues: Correct. On-chain sats balance.
────────────────────────────────────────
Wallet v2 Field: Trading
Current Source: page.tsx:143: tradingAccountBalance from zkAccounts.find(tag === "main")?.value
Notes / Issues: Correct. ZK main account.
────────────────────────────────────────
Wallet v2 Field: Lending mark-to-value
Current Source: Does not exist cleanly on the current wallet page. Authoritative path lives in `my-investment.client.tsx`, where active lends are filtered by `orderStatus === "LENDED"`, `poolInfo.pool_share` is used as the share price input, and unrealized value is derived from `poolShareValue * (order.npoolshare / POOL_SHARE_DECIMALS_SCALE) - order.value`, with positive dust `< 100 sats` zeroed and negatives kept.
Notes / Issues: Wallet v2 must reuse the same mark-to-value logic as `my-investment.client.tsx`. Lending value for wallet summary/allocation should be treated as `activePrincipalSats + pendingRewardsSats`, then converted to USD using BTC price.
────────────────────────────────────────
Wallet v2 Field: Pending operations
Current Source: Not currently read. Canonical raw-slice sources are: (1) `zk.masterAccountBlocked` + `zk.masterAccountBlockReason` + `zk.pendingMasterAccount` for recovery state, (2) `withdraw.withdrawals` for BTC withdrawal requests, and (3) `lend.lends.filter(l => l.withdrawPending)` for lend withdrawals in flight. `account_ledger.entries` is supporting audit context only.
Notes / Issues: Must be created from raw slices first. There is **no durable wallet-level deposit pending source** today, so first-pass Wallet v2 should not promise a first-class `Deposit in progress` item.
────────────────────────────────────────
Wallet v2 Field: Recoverable state
Current Source: state.zk.masterAccountBlocked = true when master account recovery needed. canTransferActiveAccount() in status.ts identifies "Action Required" accounts.
Notes / Issues: Both exist and are usable. Neither is surfaced in wallet's pending section currently.
────────────────────────────────────────
Wallet v2 Field: Wallet Activity
Current Source: state.history.transactions (TransactionHistory[])
Notes / Issues: Exists and works. Currently shown as "Transaction History" tab. Rename only.
────────────────────────────────────────
Wallet v2 Field: Account Ledger
Current Source: state.account_ledger.entries
Notes / Issues: Exists and works. Keep as-is.
────────────────────────────────────────
Wallet v2 Field: Twilight address
Current Source: mainWallet?.getChainWallet("nyks")?.address at page.tsx:131
Notes / Issues: Exists. Relocate to utility row.
────────────────────────────────────────
Wallet v2 Field: NYKS balance
Current Source: useGetNyksBalance() at page.tsx:127
Notes / Issues: Exists. Relocate to utility row.

---

## Phase 0: Validation Findings (Locked Before Implementation)

This section resolves the four repo-truth questions that must be locked before any Wallet v2 implementation begins.

---

### 0.1 Locked Capital Semantics

**Locked / Allocated is an overlapping state, not a disjoint allocation bucket.**

Repo-truth / product-truth:
- `Lending` = deployed lend capital
- `Allocated / Locked` = capital sitting in utilized Memo accounts
- These are **not disjoint buckets**
- `Locked` overlaps with `Lending`

#### Spec lock
- Treat **Locked Capital** as an **overlapping summary/state metric**
- Do **not** treat `Locked` as an additive allocation bucket alongside `Funding / Trading / Lending`
- If shown in the Wallet summary, it must be read as:
  - **Capital currently in use**
  - not a value that sums cleanly with the allocation buckets

#### Implementation consequence
- **Capital Allocation rows should default to:**
  - Funding
  - Trading
  - Lending
- **Capital Summary should include:**
  - Total Balance
  - Available to Trade
  - Locked Capital
- `Locked` should **not** be used in allocation percentages or the allocation bar unless a future repo change makes it non-overlapping.

---

### 0.2 Lending Mark-to-Value — Authoritative Path

**The authoritative existing mark-to-value logic lives in `my-investment.client.tsx`, not in the current wallet page.**

Repo truth:
- Current wallet page uses principal only
- Authoritative lend mark-to-value path:
  - active lends = `lendOrders.filter(orderStatus === "LENDED")`
  - pool share input = `poolInfo.pool_share`
  - per-order unrealized value path:
    - `rewards = poolShareValue * (order.npoolshare / POOL_SHARE_DECIMALS_SCALE) - order.value`
  - positive dust `< 100 sats` is zeroed, negatives are kept

#### Spec lock
- Wallet v2 lending value must reuse the **same logic as `my-investment.client.tsx`**
- Lending mark-to-value should be treated as:
  - `activePrincipalSats + pendingRewardsSats`
- This is authoritative for Wallet v2 until/unless the repo introduces a shared selector/helper

#### Implementation consequence
- Do **not** invent a second wallet-specific valuation path
- Extract or reuse the same computation path from `my-investment.client.tsx`
- USD conversion should happen only after sats value is derived, using BTC price

---

### 0.3 Pending Operations — Canonical Sources

**Pending operations are fragmented across raw store slices, and those raw slices are more canonical than the ledger/history tables.**

Canonical sources by operation:

#### Master-account / recovery pending
- `zk.masterAccountBlocked`
- `zk.masterAccountBlockReason`
- `zk.pendingMasterAccount`

#### Withdrawal pending
- `withdraw.withdrawals`

#### Lend withdrawal pending
- `lend.lends[].withdrawPending`

#### Ledger pending (supporting only)
- `account_ledger.entries[].status`

Important nuance:
- `account_ledger.entries` is a **durable audit trail**
- It is **not** the best primary control-plane source for pending ops
- The ledger explicitly merges pending → terminal states

Also locked from repo truth:
- There is **no durable wallet-level `deposit pending` slice** in the current repo

#### Spec lock
- Canonical pending sources for Wallet v2 are the raw slices:
  - `zk.pendingMasterAccount / zk.masterAccountBlocked`
  - `withdraw.withdrawals`
  - `lend.lends[].withdrawPending`
- Use `account_ledger.entries` only as supporting audit context, not as the primary pending source
- Do **not** promise a first-class `deposit pending` item in Wallet v2 unless a durable source is introduced

#### Implementation consequence
- Pending Operations must be modeled from raw slices first
- Deposit-in-progress should remain out of scope for the first Wallet v2 implementation pass unless a durable source is added

---

### 0.4 Canonical Wallet Transfer Surface

There are two different concepts in the repo and they must be separated clearly.

#### Current wallet UI shortcut surface
- `FundingTradeButton`
- handles only Funding ↔ Primary Trading Account
- currently icon-first on wallet
- narrow shortcut surface

#### Canonical transfer implementation in repo
- `transfer-dialog.client.tsx`

Why this is the canonical transfer model:
- supports Funding / Trading transfer directions
- supports selecting trading subaccounts
- supports creating a new account
- models a broader account-to-account transfer flow than `FundingTradeButton`

Current status:
- `TransferDialog` is imported in `page.tsx`
- it is **not actually rendered** anywhere today

#### Spec lock
- Wallet v2 should treat **`TransferDialog` as the canonical wallet transfer surface**
- `FundingTradeButton` should be treated as the narrower shortcut surface
- Wallet v2 top-level `Transfer` action should be wired to `TransferDialog`, not to the icon-first `FundingTradeButton`

---

### 0.5 Phase 0 Final Locks

The following are now locked before implementation:

1. **Locked is overlapping in repo truth**
   - It is a summary/state metric, not a clean allocation bucket

2. **Lending mark-to-value must come from `my-investment.client.tsx` logic**
   - not from the current wallet principal-only row

3. **Pending Operations must come from raw store slices**
   - with ledger used only as supporting audit context

4. **Wallet v2 should treat `TransferDialog` as canonical**
   - even though the current wallet page still uses `FundingTradeButton`

---

## 4. Structural Refactor Plan

### Phase 1: Implement Phase 0 Locks in the Refactor Model

Objective: Align the implementation plan with the validated repo-truth decisions from Phase 0.

Files touched:
- `app/(main)/wallet/use-wallet-data.ts` (new, later phase)
- `app/(main)/wallet/page.tsx`
- `app/_components/wallet/transfer-dialog.client.tsx`
- Any shared helper extracted from `my-investment.client.tsx`

What changes:
- Treat `Locked Capital` as a summary metric, not an allocation bucket by default
- Restrict initial allocation model to:
  - Funding
  - Trading
  - Lending
- Reuse the authoritative lending mark-to-value path from `my-investment.client.tsx`
- Model Pending Operations from raw slices, not ledger-first
- Make `TransferDialog` the canonical wallet transfer surface for the new top-level Transfer action

Why isolated:
- This phase prevents semantic drift before UI changes begin
- It ensures later phases build on locked definitions instead of assumptions

Dependencies:
- Phase 0 validation findings

Regression risks:
- Low, because this phase is about plan/data-model alignment before view implementation

---

### Phase 2: Remove Trade/Lend Analytics (Spec Section 8)

Objective: Strip content the spec explicitly excludes.

Files touched:
- app/(main)/wallet/page.tsx

What changes:
- Delete the entire Trades/Lend card (lines 605-675) and all its supporting state:
  - Remove tradeHistory selector (line 71)
  - Remove lendHistory selector (line 73)
  - Remove poolInfo selector (line 74) — wait, needed for mark-to-value in Phase 4. Keep.
  - Remove activeTrades memo (lines 186-191)
  - Remove totalPnl memo (lines 193-205)
  - Remove totalVolume memo (lines 207-216)
  - Remove activeLends memo (lines 219-222) — wait, needed for locked capital. Keep but rename.
  - Remove lendUnrealizedRewards memo (lines 226-233)
  - Remove lendPnl memo (lines 235-237)
  - Remove pnlColor helper (lines 239-241)
  - Remove totalPnlBTC, totalVolumeBTC, lendUnrealizedRewardsBTC, lendPnlBTC derivations (lines 242-249)
  - Remove calculateUpnl import (line 46)
  - Remove POOL_SHARE_DECIMALS_SCALE import (line 47) — keep if used for mark-to-value

Why isolated: Pure removal. No new code. Desktop grid goes from 3 cards (4+3+5 cols) to 2 cards. No behavioral changes.

Dependencies: None.

Regression risks: None — removed content has no consumers.

---

### Phase 3: Restructure Top Section — Capital Summary + Quick Actions

Objective: Replace Asset Overview card with Capital Summary (spec 5.1) + Quick Actions (spec 5.2). Move Twilight address and NYKS balance to Utility Row (spec 5.7).

Files touched:
- app/(main)/wallet/page.tsx

What changes:

Capital Summary (replaces Asset Overview card):
- Keep: Total BTC balance, USD equivalent
- Add: "Available to Trade" line showing tradingAccountBalance formatted as BTC + USD
- Add: "Locked Capital" line showing lockedCapital (new memo, see Data Mapping)
- Remove from card: Twilight address section (lines 566-583), NYKS balance section (lines 588-603), explanatory text (line 558-560)
- Remove: `<Separator />` dividers between card sections

Quick Actions (new row below Capital Summary):
- Three labeled buttons: "Deposit" (link to /deposit), "Withdraw" (link to /withdrawal), "Transfer" (opens TransferDialog — canonical transfer surface per Phase 0)
- Text labels mandatory per spec — no icon-only

Utility Row (new, bottom of page):
- Twilight address (truncated with copy-on-click) + NYKS balance
- Moved from Asset Overview card

New computations needed:
- lockedCapital = overlapping summary metric for capital currently in use; do not treat as a disjoint allocation bucket
- availableToTrade = tradingAccountBalance (already exists at line 143)

Desktop layout: Single full-width card for Capital Summary, Quick Actions as a button row below.

Mobile layout: Same section order as spec 4.2. Sticky Capital Summary is optional for the first pass and can be deferred if it adds layout risk.

Why isolated: Restructures the left card content. Does not touch My Accounts card, tabs, or data tables.

Dependencies: Phase 2 (Trades/Lend card removed, so grid layout changes).

Regression risks: Twilight address copy-on-click must be preserved. NYKS balance display must remain.

---

### Phase 4: Rebuild Capital Allocation (My Accounts → Allocation Rows)

Objective: Transform the current "My Accounts" card into the spec's Capital Allocation component (spec 5.3).

Files touched:
- app/(main)/wallet/page.tsx

What changes:

Allocation Bar (desktop only):
- New horizontal stacked bar showing Funding / Trading / Lending proportions
- Each segment colored distinctly; Locked is excluded because it is an overlapping state metric
- Percentages derived from each value / total

Allocation Rows (replace current My Accounts grid rows):
- Each row: Label | BTC value | USD value | % of total | Action button(s)
- Funding row: Keep balance. Add USD. Add %. Actions: "Deposit" (→/deposit), "Withdraw" (→/withdrawal), "Move to Trading" (→ opens TransferDialog)
- Trading row: Keep balance. Add USD. Add %. Actions: "Trade" (→/), "Transfer" (→ opens TransferDialog)
- Lending row: Change balance from deposit value to mark-to-value (reuse `my-investment.client.tsx` logic per Phase 0 §0.2). Add USD. Add %. Action: "Lend" (→/lend). Fix: no longer an empty action div.
- Locked Capital remains in the Capital Summary as an overlapping usage metric and is not rendered as an allocation row in the first implementation pass.
- Note: percentages are derived against Wallet v2 total balance model, not raw ZK totals.

Lending mark-to-value computation (new memo):

```ts
// Filter active lends by orderStatus === "LENDED" (per my-investment.client.tsx authoritative path)
const activeLends = lends.filter(l => l.orderStatus === "LENDED");
const poolSharePrice = poolInfo?.pool_share ?? 0;
const lendingMarkToValueSats = activeLends.reduce((acc, lend) => {
  const currentValue = poolSharePrice * ((lend.npoolshare || 0) / POOL_SHARE_DECIMALS_SCALE);
  const rewards = currentValue - lend.value;
  // Zero positive dust < 100 sats, keep negatives
  const adjustedRewards = rewards > 0 && rewards < 100 ? 0 : rewards;
  return acc + lend.value + adjustedRewards;
}, 0);
```

Implementation note: prefer extracting this into a shared helper reused by both Wallet v2 and `my-investment.client.tsx` rather than duplicating the computation inline.

Total balance adjustment:
- Total must use authoritative lending mark-to-value from `my-investment.client.tsx` logic
- Locked Capital is not additive in the total/allocation model and must not be used as a separate allocation bucket

Formatting rules (spec section 7):
- 0 → 0 BTC
- < 0.001 BTC → show in sats
- ≥ 0.001 BTC → trim trailing zeros
- USD for all non-zero values

Why isolated: Only touches the My Accounts card layout. Does not change account-summary table, tabs, or data sources.

Dependencies: Phase 3 (Capital Summary must exist for row % calculation against total). Requires poolInfo selector to remain.

Regression risks: Mark-to-value for lending may differ from raw ZK balance. Must not break TransferDialog wiring on Funding/Trading rows. Must not break subaccountTransfer flow.

---

### Phase 5: Add Pending Operations Section

Objective: Surface pending/recovery states (spec 5.4).

Files touched:
- app/(main)/wallet/page.tsx

What changes:

New selectors on page / in wallet data hook:
- `masterAccountBlocked` from `useTwilightStore(state => state.zk.masterAccountBlocked)`
- `masterAccountBlockReason` from `useTwilightStore(state => state.zk.masterAccountBlockReason)`
- `pendingMasterAccount` from `useTwilightStore(state => state.zk.pendingMasterAccount)`
- `pendingWithdrawals` from `useTwilightStore(state => state.withdraw.withdrawals)`
- `pendingLendWithdrawals` from lends filtered by `withdrawPending === true`

New conditional section (rendered only when any pending state is non-empty):
- Recovery required: render from raw zk recovery state (`masterAccountBlocked`, `masterAccountBlockReason`, `pendingMasterAccount`)
      - Withdrawal pending: "BTC withdrawal pending" with count; if withdrawal status granularity is insufficient in the current slice, first-pass Wallet v2 may render a generic pending state with count only
- Lend withdrawal pending: "Lending withdrawal in progress" with count
- Do not include a first-class "Deposit in progress" row in the first pass; no durable wallet-level source exists today
- Each item shows: type, status description, action (if applicable)

Why isolated: Additive — new section between Capital Allocation and Accounts. No existing code modified.

Dependencies: None (store selectors already exist, just not read).

Regression risks: None — pure addition. Renders nothing when no pending state.

---

### Phase 6: Restructure Accounts Section + Activity Tabs

Objective: Move Active Accounts from tab to inline section (spec 5.5). Reduce tabs from 3 to 2 (spec 5.6).

Files touched:
- app/(main)/wallet/page.tsx
- app/(main)/wallet/account-summary/data-table.tsx (mobile card order)

What changes:

Accounts section (above tabs):
- Render AccountSummaryDataTable directly in page body, not inside tab switcher
- Remove account-summary from TabType union
- Default tab becomes "wallet-activity" (renamed from "transaction-history")

Tab changes:
- Remove "Active Accounts" / "Accounts" tab
- Rename "Transaction History" / "Transactions" → "Wallet Activity"
- Keep "Account Ledger" / "Ledger" as-is
- Tab type becomes: `"wallet-activity" | "account-ledger"`

Mobile accounts card reorder (account-summary/data-table.tsx):
- Lead with label (account tag) instead of truncated address
- Address moves to secondary line or expand section
- Already partially done — mobile cards show tag at line 196-198, but address is primary at line 186-188

Why isolated: Moves content between two positions on the same page. No data source changes.

Dependencies: Phases 3-4 (page structure must be established).

Regression risks: subaccountTransfer and "Transfer to Funding" actions must remain wired. Tab state persistence in localStorage (if any) may need migration — verify.

---

### Phase 7: Number Formatting + Polish

Objective: Apply spec section 7 formatting rules across all wallet values.

Files touched:
- app/(main)/wallet/page.tsx (all balance displays)
- Potentially: create a shared `formatBtcBalance(sats: number): string` utility if one doesn't exist

What changes:
- 0 → "0 BTC" (not "0.00000000 BTC")
- < 100,000 sats (< 0.001 BTC) → show as "X,XXX sats"
- ≥ 100,000 sats → show as BTC with trailing zeros trimmed: "0.981249 BTC"
- Add USD equivalent (≈ $X.XX) for every non-zero balance
- Ensure tabular-nums on all numeric displays

Why isolated: Pure display changes. No data or structure changes.

Dependencies: Phase 4 (allocation rows must exist to format).

Regression risks: None — cosmetic only.

---

## 5. Removal / Relocation List

### Must Be Removed

| Item | Location | Why |
|---|---|---|
| Trades card (entire) | page.tsx:605-675 | Spec section 8: "Wallet MUST NOT include trade performance panels" |
| Trade PnL computation | page.tsx:193-205 (totalPnl memo) | Spec section 8 |
| Trade volume computation | page.tsx:207-216 (totalVolume memo) | Spec section 8 |
| Lend PnL computation | page.tsx:235-237 (lendPnl memo) | Spec section 8 |
| Lend unrealized rewards computation | page.tsx:226-233 (lendUnrealizedRewards memo) | Spec section 8: belongs to Lend page |
| calculateUpnl import | page.tsx:46 | No longer needed |
| tradeHistory selector | page.tsx:71 | Only used for volume (removed) |
| lendHistory selector | page.tsx:73 | Only used for lend PnL (removed) |
| pnlColor helper | page.tsx:239-241 | No PnL display on wallet |
| BTC string derivations for PnL/volume/yield | page.tsx:242-249 | Dead code after removal |

### Must Be Renamed

| Item | Current | New | Location |
|---|---|---|---|
| "My Accounts" card heading | "My Accounts" | "Capital Allocation" | page.tsx:681 |
| Transaction History tab | "Transaction History" / "Transactions" | "Wallet Activity" | page.tsx:828-835 |
| Tab type value | "transaction-history" | "wallet-activity" | page.tsx:51, 64, 829 |

### Must Be Relocated

| Item | From | To | Notes |
|---|---|---|---|
| Twilight address | Asset Overview card (line 566-583) | Utility Row (bottom of page) | Truncate + copy-on-click |
| NYKS balance | Asset Overview card (line 588-603) | Utility Row (bottom of page) | Inline with address |
| Active Accounts table | Tab content (first tab) | Standalone section above tabs | Remove from tab switcher |

### Must Be Preserved As-Is

| Item | Location | Why |
|---|---|---|
| subaccountTransfer() function | page.tsx:272-500 | Core wallet functionality — ZK burn + cosmos msg flow |
| activeAccounts memo | page.tsx:76-108 | Derives account list from zkAccounts + trades + lends |
| AccountSummaryDataTable component | account-summary/data-table.tsx | Desktop table + mobile cards, well-structured |
| TransactionHistoryDataTable | transaction-history/data-table.tsx | Stays as tab content |
| AccountLedgerDataTable | account-ledger/data-table.tsx | Stays as tab content |
| Account status system | account-summary/status.ts | Status derivation + classes, correct |
| FundingTradeButton | components/fund-trade-button.tsx | Preserve only as a narrower shortcut surface where needed; Wallet v2 canonical transfer entry should move to TransferDialog |

### Dead / Misleading Rows to Fix

| Item | Issue | Fix |
|---|---|---|
| Lending row empty action div | page.tsx:771 — `<div className="flex flex-row justify-end space-x-2"></div>` | Add "Lend" action button → /lend |

---

## 6. Open Code Questions

Only unresolved questions remain below. Phase 0 repo-truth decisions have already locked locked-capital semantics, authoritative lending valuation, pending-operations source precedence, and the canonical wallet transfer surface.

**Q1: Do pending BTC withdrawals in withdraw.withdrawals have a status field?**

The WithdrawSlice stores `WithdrawOrder[]` but the `WithdrawOrder` type has not been fully inspected. The pending operations section needs to distinguish: pending (submitted, awaiting batch), processing (in batch), completed. Question: does `WithdrawOrder` carry status/progress fields, or is it just a flat record of the request?

**Q2: Deposit-in-progress state source**

There is no durable wallet-level deposit-in-progress state in the current repo. Deposit status is tracked on-chain via the BTC bridge sweep cycle and only surfaced on the `/deposit` page via `useGetRegisteredBTCAddress` polling. A first-class "Deposit in progress" item is **not required in the first Wallet v2 pass** because no durable wallet-level source exists today. If needed in a future pass, the options are: (a) call the same hook on wallet page (adds a network query), or (b) persist deposit state in a new store slice when user initiates deposit.

**Q3: Should the subaccountTransfer function (lines 272-500) remain inline in page.tsx for the first Wallet v2 pass?**

It's 230 lines of ZK burn/transfer logic embedded directly in the page component. Phase 3 sets up the data computation layer, but this is an action, not data. Question: should it be extracted to a separate hook (`use-subaccount-transfer.ts`) in Phase 3, or left inline and extracted later? This extraction is not required for the first Wallet v2 pass and should only be done if the page restructure becomes too noisy without it.
