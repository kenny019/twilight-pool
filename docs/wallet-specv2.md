

# Twilight Wallet v2 — Capital Control Center Spec

## 0. Purpose

Define the Wallet page as the **Capital Control Center** for Twilight.

The Wallet must:
- Reflect **true capital state** across Funding (on-chain) and ZK layers
- Expose **all capital movement actions** clearly
- Provide a **coherent capital flow mental model**
- Avoid duplication with Trade and Lend pages

---

## 1. Product Operating Model (LOCKED)

### 1.1 Capital Layers

```
External BTC
    ↓
Funding (Public BTC, on-chain / NYKS state)
    ↓ (transfer)
Trading (ZK main account)
    ↓ (execution)
Positions (margin locked in Memo accounts)

Funding → Lending (ZK pool participation)
    ↓
Yield accrual → settle → back to Funding
```

---

### 1.2 Capital States

| State | Definition |
|------|------------|
| Funding | On-chain BTC, not yet deployed |
| Trading | ZK account balance, immediately tradable |
| Lending | Active capital deployed in pool (mark-to-value) |
| Locked (In Use) | Capital locked in open positions + active lends |
| Pending | In-flight operations (deposit, withdrawal, recovery) |

---

## 2. Page Responsibility

### Wallet MUST own
- Total capital state
- Capital allocation (Funding / Trading / Lending / Locked)
- Capital movement (Deposit / Withdraw / Transfer)
- Account state (abstracted ZK accounts)
- Wallet Activity + Account Ledger
- Pending operations / recovery state

### Wallet MUST NOT own
- Trade execution logic
- Trade performance analytics (PnL breakdowns, volume)
- Lend performance analytics (APY, yield breakdown)
- Per-position risk management

---

## 3. Core Metrics Definitions (CRITICAL)

### 3.1 Total Balance

```
Total = Funding + Trading + Lending (mark-to-value)
```

---

### 3.2 Available to Trade

```
Available to Trade = Trading Balance
```

- This matches execution behavior in Trade page
- Funding is NOT immediately tradable (requires transfer)

---

### 3.3 Locked Capital

```
Locked = Margin in open positions + active lend capital
```

Displayed as: **Locked Capital** (user-facing term)

---

### 3.4 Lending Value

```
Lending = current mark-to-value of active lends
```

- Includes unrealized yield (can be +ve / -ve)
- Settled value is returned to Funding and no longer shown here

---

### 3.5 Deployable Capital (Optional future)

```
Deployable = Funding + Trading
```

---

## 4. Information Architecture

### 4.1 Desktop Layout

```
[ Capital Summary ]

[ Quick Actions ]

[ Capital Allocation (PRIMARY) ]

[ Pending Operations (conditional) ]

[ Accounts / Operations ]

[ Activity Tabs ]

[ Utility Row ]
```

---

### 4.2 Mobile Layout

```
[ Sticky Capital Summary ]

[ Actions ]

[ Allocation (collapsed list) ]

[ Pending Operations ]

[ Accounts ]

[ Tabs ]

[ Utility Row ]
```

---

## 5. Component Specifications

---

### 5.1 Capital Summary

Displays:
- Total BTC balance
- USD equivalent
- Available to Trade
- Locked Capital
- (Optional) BTC price reference

Rules:
- No trade/lend analytics
- No PnL breakdown panels
- Minimal, high-signal information only

---

### 5.2 Quick Actions

Buttons:
- Deposit → `/deposit`
- Withdraw → `/withdrawal`
- Transfer → internal transfer dialog

Rules:
- Always visible
- Text labels mandatory (no icon-only primary actions)

---

### 5.3 Capital Allocation (PRIMARY COMPONENT)

#### Visual Allocation Bar (Desktop only)

Represents proportion of:
- Funding
- Trading
- Lending
- Locked

---

#### Allocation Rows

Each row includes:

| Field | Description |
|------|------------|
| Label | Funding / Trading / Lending / Locked |
| BTC value | Formatted |
| USD value | If > 0 |
| % of total | Required |
| Status | Optional |
| Primary action | Required |

---

#### Row Actions

| Row | Actions |
|-----|--------|
| Funding | Deposit, Withdraw, Move to Trading |
| Trading | Trade, Transfer |
| Lending | Lend |
| Locked | View Positions |

---

### 5.4 Pending Operations

Shown only when non-zero.

Examples:
- Deposit in progress
- Withdrawal pending
- Account recovery required

Rules:
- Must be persistent (not toast-only)
- Must indicate actionable state

---

### 5.5 Accounts / Operations

Default View:
- Account label (human-readable)
- Balance
- Status (Available / In Use / Pending / Action Required)
- Primary action

Expandable Details:
- Address
- TxHash
- Account type (ZK / Memo / etc)

Rules:
- Subaccounts abstracted by default
- Technical data hidden unless expanded

---

### 5.6 Activity Tabs

Tabs:
- Wallet Activity
- Account Ledger

Rules:
- No mixing with Trade or Lend histories
- Clear labeling (avoid generic “History”)

---

### 5.7 Utility Row

Contains:
- Twilight address (truncated + copy)
- NYKS balance
- (Optional) network / sync state

---

## 6. Interaction Patterns

---

### 6.1 Capital Movement Model

```
External BTC ↔ Funding ↔ Trading ↔ Lending
```

Rules:
- Wallet is the canonical mental model surface
- Trade and Lend can provide shortcuts but not redefine flows

---

### 6.2 Action Rules

- Every balance must have a corresponding action
- No “dead rows” (e.g., current Allocated issue)
- No icon-only primary controls

---

### 6.3 Empty States

Must explicitly communicate:
- No active positions
- No active lends
- No pending operations

---

## 7. Data Formatting Rules

- 0 → show `0 BTC`
- < 0.001 BTC → show sats
- ≥ 0.001 BTC → BTC (trim trailing zeros)
- Always show USD for non-zero values
- Use tabular numbers consistently

---

## 8. Explicit Exclusions

Wallet MUST NOT include:
- Trade performance panels (PnL breakdown, volume)
- Lend performance panels (APY, yield detail)
- Order history
- Risk dashboard
- Equity curve

These belong to Trade / Lend / future Portfolio page

---

## 9. Future Extensions (Not in v2)

- Portfolio analytics page
- Risk dashboard (margin health, liquidation risk)
- PnL attribution (realized vs unrealized vs funding vs yield)
- Notifications / alerts system

---

## 10. Implementation Notes

- Wallet becomes the **single source of capital truth**
- Trade and Lend must reference Wallet definitions (not recompute)
- Avoid recomputing PnL inside Wallet
- Reuse allocation + formatting patterns across app

---

## 11. Key Product Principles

1. **Capital-first, not data-first**
2. **Actionable UI over passive dashboard**
3. **Abstract complexity, reveal on demand**
4. **No duplication across pages**
5. **System mental model must be visible**