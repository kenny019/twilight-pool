# Responsive Pattern Matrix

**Companion documents:** `docs/ui-pattern-extraction-and-modernization-audit.md` · `docs/ui-modernization-principles.md`

**Purpose of this document:** Translate the audit and principles into a per-pattern implementation reference. Each row specifies exact responsive behavior, field hierarchy, color coupling, interaction model, and component ownership. There is no ambiguity — if a decision is not listed here, apply the principles document.

**Do not modify this document without updating the audit classification table (Section 4) to match.**

---

## 1. Purpose

The audit records what the current UI is. The principles document defines the decision rules. This document answers the implementation question: *for each pattern, exactly what changes at which breakpoint, what stays, and what component does it.*

Every row is grounded in the existing codebase. No pattern in this document is invented.

---

## 2. Core System Rules

These are the non-negotiable decisions that apply across all patterns. They are not repeated from the principles — they are compressed into enforcement form for use during implementation.

| # | Rule | Enforcement |
|---|------|-------------|
| R1 | Table is canonical | Desktop always shows the table. Mobile shows a card or list derived from the same data source. |
| R2 | Trading data → cards on mobile | Position, order, and history data uses card format on mobile. |
| R3 | Transactional data → list rows on mobile | Wallet transaction history uses list rows, not cards. |
| R4 | No data removal | Every field visible on desktop is accessible on mobile — inline, expand, or one-interaction deep. |
| R5 | Same data source | Desktop table and mobile card/list consume the same store state or prop. No parallel fetching. |
| R6 | Dominant field drives color | The primary field in each card determines the color emphasis. It is not decorative. |
| R7 | Primary next action is always visible | The user’s next critical action must be obvious without interaction on any viewport. Critical sub-actions may sit behind one visible entry point such as Manage. |
| R8 | Secondary actions: one interaction max | Edit, SL/TP, funding history: one tap on mobile (Manage dialog or dropdown). |
| R9 | ExchangeResource gating is preserved | Any refactor of order form triggers must keep `ExchangeResource` as the outermost wrapper. |
| R10 | Dual-layout only for trading cards | Only `PositionsCards` has approved dual-layout (separate desktop/mobile DOM). All others use single responsive component. |
| R11 | PnlCell is the only PnL renderer | Do not build custom PnL displays. Select from: `stacked`, `inline`, `responsive`, `hero`. |
| R12 | showOrderbook at 996px is a behavioral constant | Do not change the JS threshold. Do not move it to CSS. |
| R13 | Overlay type is determined by task risk | High-risk → Modal. Parameter adjustment / contextual work → Sheet. Status / context → Popover. |
| R14 | Semantic colors are not decorative | `text-green-medium`, `text-red`, yellow are reserved for PnL, risk, and system status. |

---

## 3. Pattern Matrix

**Column key:**
- **Primary Field** — the field that visually dominates the card/row; determines color emphasis
- **Secondary Fields** — always visible without interaction
- **Expandable Fields** — accessible via expand/detail section (one interaction)
- **Color Driver** — what drives the color emphasis (per R6)
- **Dual Layout** — whether separate desktop/mobile DOM blocks are approved
- **Classification** — from audit Section 4 (Keep / Refine / Adapt / Replace)

> The table uses abbreviated cell content for readability. Full detail is in Section 4 (deep dives).

| Pattern Family | Use Case | Canonical Structure (Desktop) | Mobile Expression | Primary Field | Secondary Fields (Visible) | Expandable Fields | Color Driver | Interaction Model | Overlay Type | Dual Layout Allowed | Data Source Rule | Classification | Component References |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Positions** | Active open leveraged positions | TanStack table: side, entry, mark, notional, leverage, liq, PnL, funding, actions | `PositionsCards`: `grid-cols-1 xl:grid-cols-2`; approved dual desktop/mobile DOM per card | PnL (`PnlCell hero` on mobile, always visible including zero state) | Side pill, leverage pill, entry, mark, notional USD, BTC exposure | Avail margin, maint margin, fee, funding | PnL → `text-green-medium` / `text-red`; accent bar → `bg-green-medium/70` (LONG) / `bg-red/70` (SHORT) | Desktop: inline actions; mobile: visible `Close Market` + `Manage` entry; `Manage` opens action-hub sheet; data stays inline/expand; configuration flows use sheet steps; destructive remove actions require explicit confirmation | Modal (market close, destructive remove confirmations); Sheet (Manage hub, SL/TP, limit close management/editing) | **Yes** — PositionsCards only; `hidden md:block` / `block md:hidden` per card | `useTwilightStore` trade state; same prop passed to both layout blocks; instrument label must come from a shared canonical source (constant/config) rather than a local literal | **Refine** — extract shared card scaffold; resolve dual-layout per Section 9 guidance | `details/tables/positions/positions-cards.client.tsx`, `details.client.tsx`, `lib/components/pnl-display.tsx` |
| **Open Orders** | Pending conditional orders (SL, TP, Limit close, opening limit) with materially different operational states | TanStack table: type, status, side, price, notional, leverage, created time, cancel action | `OpenOrdersCards`: single responsive layout, `grid-cols-1 xl:grid-cols-2`; no dual desktop/mobile DOM split | Side + Price | Type, Status, Notional (USD), leverage, created time | BTC size, full hash (truncated inline), secondary metadata | Side → buy/sell color emphasis; Type and Status remain supporting semantics only | Cancel is a direct inline action with no pre-confirmation for unambiguous cancels. If cancel scope is ambiguous (for example, SL/TP dual-leg resolution), a scope-selection dialog may still be used. Edit is secondary and opens a sheet-based contextual editor. No Manage hub. | Sheet (edit/configure); no overlay for direct unambiguous cancel; scope-selection dialog allowed only when cancel target is ambiguous | **No** — single responsive implementation only | Same `useTwilightStore` orders prop; no parallel mobile data mapping | **Refine** — align card scaffold with shared structure, preserve direct-action model, and surface order state without diluting hierarchy | `details/tables/open-orders/open-orders-cards.client.tsx`, `details/tables/open-orders/columns.tsx`, `details.client.tsx`, `components/edit-order-dialog.tsx` |
| **Order History** | Grouped order-event timeline for each logical order UUID | Grouped/collapsible TanStack table: one parent row per `uuid`, expandable inline to reveal chronological child event rows | Grouped order cards (not flat cards, not list rows): one card per `uuid`, expandable to reveal full event timeline | Side + Lifecycle | Type, Latest Event, latest timestamp, Entry, Close / Trigger, PnL when terminal | Full timeline events, Order ID, request ID, tx hash, reason, price/trigger change, funding, fee, avail. margin, pos. value | Neutral shell; side color only on side pill, lifecycle color only on lifecycle pill, PnL color only via `PnlCell`; no row/card shell driven by raw `orderStatus` | Collapse/expand per order group; one interaction depth only; child rows/cards are read-only | None (inline grouped expand only) | **No** — desktop table and mobile grouped cards are different expressions of the same grouped source | Same `trade_history.trades`, grouped by `uuid`, same parent-summary derivation rules across desktop/mobile | **Refine** — treat as grouped order timeline, separate lifecycle from event semantics, preserve full raw event fidelity in expand | `details/tables/order-history/columns.tsx`, `details/tables/order-history/order-history-cards.client.tsx`, `details.client.tsx` |
| **Trader History** | Account-level **trade outcome** history (filled, settled, liquidated events) | TanStack table: side, status, entry, close/settlement, PnL, liq, margin/avail, funding, fee, date, hash (audit-level detail) | `TraderHistoryCards`: single layout, `grid-cols-1 xl:grid-cols-2`; outcome-driven dominant; lighter than Positions | Outcome amount (PnL if present; otherwise settlement/notional) with outcome context | Entry → Close, Notional, Leverage, Date/Time (render as grouped units; 2-column on narrow mobile widths if needed for readability) | Full hash (copy), funding detail, fee, liq, pos. value, avail/margin | Outcome semantics: positive → `text-green-medium`, negative → `text-red`, neutral → `text-primary/40` | Read-only surface; expand/collapse; copy hash; funding detail dialog | Popover or Modal (funding history) | **No** — single layout cards | Same `useTwilightStore` trade history prop (filtered: SETTLED/LIQUIDATE/FILLED) | **Refine** — outcome-centric hierarchy; lighter than Positions; preserve full data via expand | `details/tables/trader-history/trader-history-cards.client.tsx`, `details/tables/trader-history/columns.tsx`, `details.client.tsx` |
| **Order Form — Market** | Market order entry (BUY / SELL) | Dense form: collateral input (BTC/USD toggle), preset buttons (25/50/75/100%), leverage input + presets, liquidation prices, Buy/Sell buttons | Same component; `max-md:` overrides: h-12 soft-fill Buy/Sell with bg tint, section separators, stepper +/− controls for collateral | Buy / Sell action buttons | Collateral amount, leverage value, available balance | Liq Buy / Liq Sell prices (displayed below form) | Buy → `border-green-medium` / `bg-green-medium/10`; Sell → `border-red` / `bg-red/10` | Inline form submit; ExchangeResource gate intercepts if BTC not registered/verified | Modal (ExchangeResource redirect to registration/verification) | **No** — single component with `max-md:` variants | `useTwilightStore` zk accounts; `usePriceFeed` for live price | **Adapt** — extend soft-fill pattern consistently; ensure all `max-md:` overrides are present | `order/forms/market.client.tsx`, `components/exchange-resource.tsx`, `components/input.tsx`, `components/slider.tsx` |
| **Order Form — Limit** | Limit order entry at specified price | Dense form: price input (NumberInput with Mark button), collateral + leverage same as market | Same component; `max-md:` overrides match market form pattern | Buy / Sell action buttons | Price input, collateral amount, leverage | Liq prices | Same as market form | Inline form submit; ExchangeResource gate | Modal (ExchangeResource redirect) | **No** — single component with `max-md:` variants | Same as market form | **Adapt** — align with market form `max-md:` pattern | `order/forms/limit.client.tsx`, `components/exchange-resource.tsx`, `components/input.tsx` |
| **Wallet Balances** | Account balance overview and transfer actions | 3-column responsive grid: asset overview (BTC balance, Twilight address), trade/lend summaries (PnL, yield), My Accounts (funding/trading/lending/allocated balances + actions) | Stacked single column via `md:` grid collapse; same card structure, same data | BTC total balance (large text) | USD equivalent, per-account balances (funding/trading/lending) | N/A — all data visible inline | Balance PnL → `text-green-medium` / `text-red` for trade/lend summaries | Transfer buttons inline; FundTradeButton dialog | Modal (FundTradeButton transfer dialog) | **No** — responsive grid with `md:` breakpoint | `useTwilightStore` zk accounts + `useGetTwilightBTCBalance` | **Refine** — normalize gutters; verify touch targets on transfer buttons | `app/(main)/wallet/page.tsx`, `components/fund-trade-button.tsx` |
| **Active Accounts** | Current ZK account roster with balances, utilization context, and transfer eligibility | TanStack table: created, address, balance (BTC), type, status, label, tx hash (conditional), actions | List rows (not cards) at `max-md:`; structured rows with expand; no horizontal scroll | Address + BTC balance | Status, label, created date | Full address (copy), tx hash / explorer, additional metadata; `Action Required` explanation on mobile expand | Neutral base; subtle localized status tint only. `Available` → soft green, `Locked in Position` / `Locked in Lending` → soft amber/warm neutral, `Action Required` → soft blue | Expand/collapse row; Copy address; Transfer inline when eligible (same rules as desktop). Status explains condition of funds; CTA handles recovery action. | Desktop: tooltip/info affordance for `Action Required`; Mobile: inline explanation inside expand/details | **No** — single responsive implementation; separate desktop/mobile DOM allowed only with same shared table row model and behavior | Same TanStack/useReactTable row model and same store-derived data as desktop; no parallel mobile data mapping | **Refine** — validated wallet state-row pattern; truth-first identity (address), status-driven state language, action-capable mobile list rows from same data | `app/(main)/wallet/account-summary/data-table.tsx`, `app/(main)/wallet/account-summary/columns.tsx`, `app/(main)/wallet/page.tsx` |

**Reference implementation note:**  
`Active Accounts` is the validated reference implementation for action-capable wallet state rows with mobile list-row presentation and preserved desktop table behavior.
| **Wallet History** | Transaction log (mint, burn, fund, trade, withdraw) | TanStack table: type, amount, date; pagination; `min-w-[640px]`; horizontal scroll | **List rows** (not cards) at `max-md:`; same column data mapped to compact row; horizontal scroll removed | Transaction type + amount | Date | Full hash, secondary metadata | Primarily neutral; directional color may be used only when it reflects actual fund movement rather than risk/status semantics | Sort, paginate; row expand for additional details | None | **No** — single responsive component; `max-md:` list rows | `transaction-history/data-table.tsx` TanStack instance | **Replace** (presentation only) — introduce mobile list rows from same data | `app/(main)/wallet/transaction-history/data-table.tsx` |

| **Copyable Transaction / Address Blocks** | Display and interact with addresses, reserve IDs, and transaction hashes | Inline mono text with copy affordance; often paired with QR; truncation on overflow | Stacked layout; mono text with truncation; copy button always visible; QR optionally collapsible | Address / hash value | Label, partial value (truncated) | Full value, QR code, metadata | Neutral (text-primary / text-primary-accent) | Tap to copy; optional expand for QR and full value | Popover or Modal (QR or full details) | **No** — single responsive component | Same data source; no duplication | **Refine** — standardize truncation, copy affordance, QR relationship | wallet components, deposit flow, verification step, copy-field patterns |
| **Lend Page** | Liquidity provision overview and management | 2-column grid: LEFT = Pool Performance (APY-dominant) → My Investment → Pool Health (supporting); RIGHT = APY Trend (chart) → Add Liquidity; tabs below (Deposits / History) | Stacked single column; same cards reordered by hierarchy: APY → Chart → My Investment → Actions → Pool Health → Deposits (cards) → History (list rows) | APY (7D) on Pool Performance card | Pool Equity (BTC), Pool Return (7D) | Share NAV, BTC Price (de-emphasized or in expand on mobile) | APY uses neutral/emphasis typography (not PnL colors); Pool Return uses PnL semantics (green/red); others neutral | Add Liquidity (primary CTA) always visible; Withdraw available (secondary) when applicable; tabs switch for records | Modal (withdrawal in progress — auto); inline form for add | **No** — responsive grid; same components across breakpoints with reordered stacking on mobile | `useTwilightStore` lend state; same data across desktop/mobile | **Refine** — enforce APY dominance, user-first ordering; Deposits use card pattern (active capital), History uses list rows | `app/(main)/lend/page.tsx` |
| **Chart + Trade Layout** | Trading terminal workspace | `react-grid-layout` 12-col: chart panel, order panel, optional orderbook panel, details panel; draggable + resizable; panel state persisted in localStorage | Stacked sequence below 996px JS threshold: chart → order → details; orderbook hidden; `DragWrapper` not rendered | Price chart | Interval selector, chart controls | N/A | Candlestick semantic colors (existing chart library) | Drag/resize desktop; scroll through stacked mobile; panel toggle (hide/show trades) | None (layout engine) | **Yes** — trade-wrapper.client.tsx manages separate grid vs stacked compositions; 996px JS threshold is behavioral constant | `useTwilightStore`, `usePriceFeed`; panel layout persisted to `TRADES_PANEL_STORAGE_KEY` | **Adapt** — add mobile orderflow entry point (composition only); do not change desktop grid | `trade-wrapper.client.tsx`, `order/order.client.tsx`, `details/details.client.tsx` |
| **Orderbook** | Live bid/ask book | Panel in `react-grid-layout`; visible when `showOrderbook >= 996px`; bids/asks with depth | Hidden below 996px JS threshold. Approved future mobile entry: Sheet or similar non-blocking contextual surface — layout-only composition | Bid/ask price grid | Depth visualization | N/A | Bids → `text-green-medium`; asks → `text-red` | Panel scroll desktop; future: sheet trigger mobile | Sheet (future mobile entry — non-blocking, preserves chart context) | **No** — controlled by JS threshold; future mobile sheet is additive composition | Same orderbook data source | **Adapt** — add mobile entry point (sheet or collapsible) without changing desktop panel or JS threshold | `trade-wrapper.client.tsx`, orderbook components |
| **Header / Navigation** | Global wayfinding and account controls | `hidden lg:flex` desktop: logo + nav links + right cluster (RelayerStatus, ConnectWallet, Settings); full nav labels | `lg:hidden` mobile: logo + icon cluster (RelayerStatus dotOnly, ConnectWallet, Settings, MobileNav); drawer for nav | Navigation links (desktop) / MobileNav trigger (mobile) | RelayerStatus, ConnectWallet | N/A | RelayerStatus → HEALTHY `text-green-medium`, HALT `text-red`, CLOSE_ONLY yellow | Hover on desktop links; tap on mobile; drawer for mobile nav; popovers for wallet + relayer | Drawer (mobile nav); Popover (wallet address, relayer reason) | **Yes** — existing `lg:hidden` / `hidden lg:flex` separation is the approved split | N/A — navigation state only | **Refine** — reduce mobile header density; ensure safe-area top if fixed header added | `app/_components/layout/header.tsx`, `mobile-navigation.client.tsx`, `connect-wallet.client.tsx`, `relayer-status.client.tsx` |
| **Settings / Theme** | User preferences (theme, color scheme, leaderboard) | Right-slide panel: DialogContent with `left-auto right-0 translate-x-0`; `min-h-dvh`; sections: light mode Switch, color scheme DropdownMenu, leaderboard Switch | Identical — full-height right slide; `pb-[env(safe-area-inset-bottom)]` needed for notch; `overflow-y-auto` | Settings options | Theme switch, color scheme picker | N/A | Theme accent → active color swatch in DropdownMenu | Right slide open from Settings icon; close button top-right; no mobile-specific structure change | Drawer (right slide — this component IS the drawer) | **No** — single component; already full-height on all viewports | User preferences from `useTwilightStore` | **Refine** — verify safe-area bottom padding; no structural change | `app/_components/layout/settings.client.tsx` |
| **Overlays (Dialog / Sheet / Drawer / Popover)** | System overlay containers | Dialog: centered, `max-w-sm` / `md:max-w-lg`, backdrop blur; Drawer: `min-h-dvh`, right-slide; Popover: `w-72` default | Dialog: same centered position; `pb-[env(safe-area-inset-bottom)]` on `max-md:`; Popover: clamp to `max-w-[min(100vw-2rem,18rem)]` | N/A — container pattern | N/A | N/A | N/A — inherits from content | Keyboard/touch dismiss (Radix-managed); close button on Dialog/Drawer | Self — this row defines the container rules | **No** — Radix primitive behavior is locked; only sizing and safe-area adapt | N/A | **Adapt** — clamp popover width; add safe-area bottom to dialogs on mobile | `components/dialog.tsx`, `components/popover.tsx` |
| **Step Flows** | Linear multi-step task scaffolds (registration, verification, deposit) | Centered `max-w-4xl`; 2-column grid: form card (left) + important notices (right); Stepper at top; instruction panels with icons | Stacked: Stepper + form full-width; notices stacked below form; reduced gutters; same step logic | Current step / form fields | Stepper progress indicator, instruction notices | N/A | `text-theme` for active/completed step circle and connector | Linear progression; submit per step; ExchangeResource gate at trade entry post-completion | Modal (ExchangeResource redirect if gate fails elsewhere) | **No** — responsive grid via `md:` breakpoint | Per-flow form state; `useTwilight` for registration/verification status | **Refine** — normalize mobile spacing; ensure notices stack cleanly below form | `app/_components/registration/form.tsx`, `app/_components/deposit/deposit-flow.tsx`, `app/_components/deposit/verification-step.tsx`, `components/stepper.tsx` |
| **Resource / Ticker Strip** | Live market data strip (price, funding, OI, skew, stats) | `hidden lg:flex` horizontal strip: all metrics inline with separators; skew bar; funding countdown. `xl` may widen metric budgets; `2xl`/`3xl` are approved only for conservative ticker width/spacing recovery on large desktops, not layout changes. | `lg:hidden` collapsible: row 1 (price + 24h change + chevron), row 2 (funding + OI); expanded rows (high/low, turnover, skew, max long/short) | BTC price + 24h change % | Funding rate, Open Interest | 24h High/Low, Turnover, Skew, Max Long/Short | Price change → `text-green-medium` (positive) / `text-red` (negative); funding → same | Tap chevron to expand/collapse on mobile; live `useSyncExternalStore` updates | None — inline expand | **No** — single component with `lg:hidden` / `hidden lg:flex` sections | `usePriceFeed`, `useSessionStore` | **Refine** — clarify truncation behavior; collapse/expand animation; allow rail-only large-screen scaling beyond `xl` when needed | `app/_components/trade/ticker-wrapper.client.tsx` |
| **PnlCell** | Shared PnL display primitive across all trade surfaces | `stacked` in table cells (BTC + USD vertical, `text-xs`); `inline` in desktop card rows (flex baseline, BTC semibold + USD in parens) | `hero` in mobile feature positions (border-l-2 accent, bg tint, `text-lg`); `responsive` in mixed contexts (stacked on mobile / inline from `md:`) | PnL value in BTC | USD equivalent (when BTC price available) | N/A — self-contained display primitive | Positive → `text-green-medium`; negative → `text-red`; zero/neutral → `text-primary/40` | Display only; no interaction | None | **No** — layout mode selected via `layout` prop per consumer | `pnlSats` + `btcPriceUsd` props — same values across all consumers | **Keep** — locked layout mode contracts; use existing modes; no new modes without audit update | `lib/components/pnl-display.tsx` |
| **Page Shells / Card-on-canvas** | Outer layout frames for route-level pages (wallet, lend, trade details, registration) | `bg-background rounded-default` card surface on neutral canvas; page-level `max-w-*` container; internal 2–3 column grid with `gap-*` gutters | Full-bleed or single-card full-width on mobile; grid collapses to stacked; gutters reduced via `max-md:px-*` overrides | N/A — container only | N/A | N/A | N/A — inherits from content | Scroll only | None | **No** — responsive grid collapse only | N/A | **Refine** — normalize gutters and rounding at mobile breakpoints | `app/(main)/layout.tsx`, `app/(main)/wallet/page.tsx`, `app/(main)/lend/page.tsx` |
| **Headers / Typography** | Section headings, card titles, page labels across all surfaces | `text-xl` / `text-lg` / `text-base` heading hierarchy; `font-semibold` for primary labels; `text-primary` base; `text-primary/40` for muted | Same hierarchy on mobile; no global font-size reduction; `text-xs` in dense card metric labels unchanged | N/A — typographic system | N/A | N/A | `text-primary` base; `text-primary/40` muted; `text-theme` for active step / accent labels | Display only | None | **No** — single responsive scale | N/A | **Keep** — typography scale is established; do not introduce new size tokens | `components/typography/index.tsx`, all page and card components |
| **Forms / Input Primitives** | Data entry across order forms, registration, transfer dialogs, settings | `Input`: `rounded-default border-outline bg-transparent px-3 py-2 text-sm`; `NumberInput` extends with increment/decrement; Slider for leverage; Select/DropdownMenu for discrete choices | Same components on mobile; `max-md:h-12` height override for touch targets on order form inputs; Slider thumb size unchanged | Input value | Label, placeholder, unit badge (BTC/USD toggle) | N/A — inputs always exposed | Focus ring → `ring-primary`; error → `ring-red` | Direct text/numeric entry; Slider drag; Select tap to open | None (Select/DropdownMenu self-manages) | **No** — same components across viewports | Controlled form state (local React state or store) | **Adapt** — extend `max-md:` touch-target overrides uniformly; do not change base component contract | `components/input.tsx`, `components/slider.tsx`, Radix `Select`, `DropdownMenu` |
| **Action Areas / Button System** | All interactive triggers across order forms, dialogs, navigation, card actions | `Button` with 5 variants (`primary`, `secondary`, `link`, `icon`, `ui`); `min-h-[44px]` default, `min-h-[40px]` small, `min-h-[44px] min-w-[44px]` icon; `touch-manipulation` on all | Same component on mobile; order form Buy/Sell gain `max-md:h-12 max-md:text-base max-md:font-semibold` soft-fill override; icon variant size unchanged; no variant removed | Button label / icon | N/A | N/A | `primary` → `bg-button-primary` gradient; `secondary` → `bg-button-secondary`; Buy → `bg-green-medium/10`; Sell → `bg-red/10` | Tap/click; ExchangeResource intercepts gate-controlled buttons; `disabled:` state via classes | None (buttons trigger overlays; they are not overlays) | **No** — single component; context-specific `className` overrides | N/A — action triggers only | **Refine** — document soft-fill pattern; normalize all `max-md:` button overrides | `components/button.tsx`, `components/exchange-resource.tsx`, `components/fund-trade-button.tsx` |
| **General Tables / Lists** | All tabular data not covered by Trade Detail Cards or Wallet History (lend history, future extensions) | TanStack Table with sortable columns; `min-w-[640px]` container; horizontal scroll if needed; column headers with sort icons | **List rows** at `max-md:`; horizontal scroll removed; each row maps all columns to compact label/value pairs; no cards | Varies by table — typically transaction type or identifier | Date, amount, status | Hash / detail identifiers (one expand) | Contextual — status badge for outcomes; no semantic color for neutral data | Sort (desktop); scroll list (mobile); no row actions unless specified | None unless row action present | **No** — single responsive component with `max-md:` list rows | TanStack Table instance; same data source for desktop and mobile | **Replace** (presentation only) — mobile list rows replace scrolling mini-table at `max-md:` | `app/(main)/wallet/transaction-history/data-table.tsx`, TanStack Table pattern |
| **Status Signals / Semantic Badges** | Order status, relayer status, position side (Long/Short), type labels across all trade surfaces | Small pill/badge: `rounded-full px-2 py-0.5 text-xs`; border or background tint; text label; semantic color locked per signal type | Same component on mobile; same text label; color unchanged; badge remains primary only where the matrix explicitly says so; otherwise it is supporting semantics | Signal label (context-dependent) | N/A — self-contained signal | N/A | Long/BUY → `text-green-medium` / green tint; Short/SELL → `text-red` / red tint; HEALTHY → `text-green-medium`; HALT → `text-red`; CLOSE_ONLY → yellow; `Pending` / `Active` / similar Open Orders states use supporting semantic treatment only | Display only; no interaction | None | **No** | Derived from order/position state; no separate fetch | **Keep** — semantic colors are locked; do not introduce new signal colors without audit update; badges must respect the hierarchy defined by each pattern row | Trade detail card components, `relayer-status.client.tsx`, `lib/components/pnl-display.tsx` (side rendering) |
| **Copyable Fields / Reserve Blocks** | Wallet addresses, transaction hashes, registration keys — fields the user needs to copy | Monospace text, truncated with ellipsis; Copy icon button (`Button variant="icon"`); displayed inline in card or form | Same layout on mobile; full-width on narrow cards; Copy icon touch target meets `min-h-[44px] min-w-[44px]`; truncation preserved | The address / hash value (truncated display) | Copy action | Full value accessible via clipboard (copy action; no expand needed) | N/A — neutral text; `text-theme` on hover for copy icon | Tap Copy icon → clipboard write → Toast feedback | Toast (non-blocking feedback only) | **No** | Static value from store (wallet address, tx hash) | **Refine** — ensure copy icon touch target; normalize truncation lengths | `app/(main)/wallet/page.tsx` (address display), `components/button.tsx` (icon variant), `components/toast.tsx` |
| **Feedback States** | Toast notifications, loading states, empty states across all surfaces | Toast: bottom-right, `max-w-sm`, auto-dismiss; Loading: skeleton or spinner inline; Empty: centered label + optional CTA within the table/card area | Toast: bottom of viewport with `pb-[env(safe-area-inset-bottom)]` for notch clearance; Loading: same skeleton; Empty: same centered label; no structural change | Status message | Action (optional — retry or dismiss) | N/A | Success → `text-green-medium`; Error → `text-red`; Info/default → `text-primary` | Toast auto-dismisses; manual dismiss via close button; empty state CTA if present | Toast (non-blocking, self-positioning) | **No** | UI state — triggered by action outcomes or empty data sets | **Refine** — add safe-area bottom offset to Toast on mobile; normalize empty-state placeholder text | `components/toast.tsx`, loading skeleton patterns, empty state inline components |

---

## 4. Pattern Deep Dives

### 4.1 Trade Detail Card System

**Scope:** Four card variants consumed by `details.client.tsx`:
- `positions-cards.client.tsx` — active positions
- `open-orders-cards.client.tsx` — pending conditional orders
- `order-history-cards.client.tsx` — settled/cancelled orders
- `trader-history-cards.client.tsx` — account history

**Shared scaffold (all four variants):**

```
grid-cols-1 xl:grid-cols-2              ← outer grid
  rounded-xl border border-border/70 bg-background/90 shadow-sm   ← card shell
    absolute inset-y-0 left-0 w-0.5 {semantic color}              ← accent bar
    [card header: pill(s) + timestamp]
    [primary field section]
    [secondary metrics grid]
    [expandable details — ChevronDown/Up]
    [action row]
```

**Card hierarchy rules (per system decision):**

| Card | Primary / Dominant | Secondary (always visible) | Expand | Color Driver |
|------|--------------------|---------------------------|--------|--------------|
| Positions | PnL (`PnlCell hero` mobile; always visible including zero state) | Side pill, leverage, entry, mark, notional, BTC exposure | Avail margin, maint margin, fee, funding | PnL tone + side accent bar |
| Open Orders | Side + Price | Type, Status, notional, leverage, created time | BTC size, hash, secondary metadata | Side color (buy/sell) |
| Order History | Side + Lifecycle | Type, Latest Event, Entry, Close / Trigger, latest timestamp, PnL when terminal | Full grouped timeline, Order ID, request ID, tx hash, reason, trigger/price change, funding, fee, avail. margin, pos. value | Side pill + lifecycle pill + PnL only |
| Trader History | Outcome amount (PnL if exists; else settlement/notional) + outcome context | Entry → Close, Notional, Leverage, Date/Time (grouped readable units) | Full hash, funding, fee, liq, pos. value, avail/margin | Outcome semantics (green/red/neutral) |

**Table/card toggle (`details.client.tsx`):**
- `viewByTab: Record<TabKey, "table" | "cards">` — persists per-tab selection
- Default: `"cards"` on all tabs
- Toggle button switches presentation; data source is unchanged
- Both views consume the same prop data — no conditional fetching

**PositionsCards dual-layout (approved exception):**
- Desktop block: `hidden md:block` — 4-column metric grid, inline action buttons, `PnlCell responsive`
- Mobile block: `block md:hidden` — 2-column metric grid, `PnlCell hero` (must remain visible even at zero), visible `Close Market` + `Manage` entry
- `Manage` is the mobile action hub and should open as a **sheet**, not a centered chooser dialog
- Configuration/edit flows (limit close, SL/TP setup/edit) should use sheet-based steps or sheet content replacement
- Destructive remove actions must require explicit confirmation via **modal/dialog** before execution
- Both blocks receive the same `trade: TradeOrder` prop and the same `settleMarketOrder`, `cancelOrder` handlers
- Instrument / market labels shown in card headers must come from a **shared canonical source** (constant/config or shared metadata), not a local component literal


-**OpenOrdersCards single-layout rule:**
**OrderHistory grouped-timeline rule:**
- Order History is a **grouped order timeline**, not a flat event dump and not a position/outcome card family.
- Grouping key is `uuid`.
- One parent entity represents one logical order; child rows/events preserve the raw history items in chronological order.
- Desktop remains a **table** and must render one collapsible parent row per `uuid`, with inline expanded child event rows.
- Mobile uses **grouped cards**, one card per `uuid`, with expand to reveal the full timeline.
- Parent / collapsed state must separate:
  - **Lifecycle** (order-level state)
  - **Latest Event** (most recent raw event label)
- The UI must not treat raw event labels such as `StopLossAdded`, `TakeProfitUpdated`, or `LimitPriceAdded` as lifecycle states.
- Lifecycle display model:
  - `SETTLED` → `Settled`
  - `LIQUIDATE` → `Liquidated`
  - `CANCELLED` → `Cancelled`
  - `FILLED` → `Filled` (active/intermediate, not terminal close)
  - `PENDING` → `Open`
  - if no normalized lifecycle can be derived cleanly, fallback to the latest lifecycle-like raw value without collapsing event labels into lifecycle
- Parent derivation rules:
  - `groupKey = uuid`
  - `latestRow = max(date)`
  - `parentLifecycle = latest row in group whose orderStatus is one of lifecycle-like values`
  - `parentLatestEvent = latest non-error raw event label when possible; if unavailable, fallback to latest raw status/event value`
  - `parentType = oldest non-SLTP row if available, else oldest row`
  - `parentSide = oldest row.positionType`
  - `parentEntryPrice = oldest row.entryPrice`
  - `parentLeverage = oldest row.leverage`
  - `parentTerminalRow = latest row whose orderStatus is SETTLED or LIQUIDATE`
- Parent desktop columns should prioritize: Last Time, Order ID, Side, Lifecycle, Type, Latest Event, Entry, Close / Trigger, PnL, Expand.
- `Leverage`, `request_id`, `reason`, `priceChange`, `funding`, `fee`, `availableMargin`, and `tx_hash` are supporting details and should live in expand / child timeline, not in the parent primary view.
- Mobile grouped card hierarchy:
  - Header: Side pill, Type, Lifecycle pill, latest timestamp
  - Primary content: Entry, Close / Trigger, PnL when terminal
  - Secondary content: Latest Event, Leverage (optional only if space allows)
  - Expand: full grouped event timeline + all supporting metadata
- Timeline density rule:
  - show a short preview of the most recent 2–3 events in collapsed mobile state only if it helps scanning
  - full chronological timeline belongs in expanded state
- Error-like values such as `RejectedByRiskEngine`, `RejectedByExchange`, `RejectedByRelayer`, and `Error` must not become the primary visible lifecycle state unless no better lifecycle state exists; treat them as raw event/error labels in the timeline first.
- Shells remain neutral. Side semantics belong to the side pill, lifecycle semantics belong to the lifecycle pill, and PnL semantics belong only to `PnlCell`.
- Open Orders does **not** use the Positions-style dual-layout exception
- The component should remain a single responsive implementation with shared structure across breakpoints
- Mobile hierarchy is: `Side + Price` dominant; `Type`, `Status`, `Notional (USD)`, `Leverage`, and `Created time` always visible; `BTC size`, `Hash`, and lower-priority metadata may expand
- `Status` is visible because this surface includes materially different operational states (for example `Pending` vs `Active`), but it must remain visually subordinate to the dominant `Side + Price` unit
- Mobile actions are direct: `Cancel` remains immediately available with no pre-confirmation for unambiguous cancels; `Edit` is secondary and should open as a **sheet-based contextual editor**
- A scope-selection dialog is still allowed when a cancel action is ambiguous (for example, deciding whether to cancel one SL/TP leg or both)
- Do **not** introduce a `Manage` hub for Open Orders
- Type and Status remain supporting semantics and must not visually overpower side-driven meaning
- OpenOrdersCards is the validated reference implementation for direct-action mobile trading cards with single responsive structure
**TraderHistoryCards outcome-focused rule:**
- Trader History represents a **trade-outcome view**, not a flat transaction ledger
- The dominant block must communicate **what happened and what the outcome was** (PnL or settlement value)
- The component must remain a **single responsive implementation** with identical hierarchy across breakpoints
- The card should be **denser than Wallet History but lighter than Positions** (fewer always-visible metrics, more use of expandable details)
- Always-visible secondary context may include entry → close, notional, leverage, and date/time, but must remain visually subordinate to the dominant outcome block and should render as grouped readable units on narrow widths
- Expandable section must surface **full hash (copy)** and **funding detail**, and may include fee, liq, position value, and margin/available balances
- This surface is **read-only**: no action hubs, no management flows; only expand, copy, and funding detail access are allowed
- Color semantics are driven by **outcome**, not position side or order status
**MetricCell pattern:**
- Inline compound: `<div className="flex flex-col gap-1"><span label /><children /></div>`
- Used for all metric cells in both desktop and mobile blocks of PositionsCards
- Not a shared component file — defined inline in positions-cards. If extracted, it must remain visually identical.

**Shared scaffold extraction target:**
These fields are duplicated across all four card variants and should be aligned (not extracted prematurely, but made consistent):
- Card shell classes: `rounded-xl border border-border/70 bg-background/90 shadow-sm`
- Accent bar: `absolute inset-y-0 left-0 w-0.5`
- Hover: `hover:-translate-y-[1px] hover:border-theme/35 hover:shadow-md`
- Expand toggle: `ChevronDown` / `ChevronUp` with `expandedIds` Set state

**Reference implementation note:**  
`PositionsCards` is the first validated reference implementation for mobile trading cards and managed action flows. Future implementations in this family should align with its approved hierarchy, action model, overlay treatment, and data-parity behavior unless the matrix explicitly states otherwise.
`TraderHistoryCards` is the validated reference implementation for outcome-focused read-only trade history cards with single responsive structure.
---

### 4.2 Wallet System

**Two distinct presentation modes within the wallet route:**

#### Balances section (`wallet/page.tsx`)

| Aspect | Detail |
|--------|--------|
| Layout | 3-column responsive grid (`md:grid-cols-12`) → stacked on mobile |
| Columns | Asset overview (col-span-4), Summaries (col-span-3), My Accounts (col-span-5) |
| Mobile | Each column stacks; same card structure, same data |
| Primary field | BTC total balance (large text display) |
| Color | PnL summaries → `text-green-medium` / `text-red`; balance neutral |
| Actions | Transfer buttons in My Accounts → `FundTradeButton` dialog (Modal) |
| Parity rule | All account balances (Funding, Trading, Lending, Allocated) must be visible on mobile — they may stack but must not be hidden |

**Balances are cards, not tables.** They are not trading data — they are account state. The table-vs-card rule (R2) applies to data-dense tabular records, not to balance overview cards. Balance cards are single responsive layout.

#### Transaction History (`wallet/transaction-history/data-table.tsx`)

| Aspect | Detail |
|--------|--------|
| Desktop | TanStack table; `min-w-[640px]`; horizontal scroll; sort by date desc; 10 rows/page |
| Mobile | **List rows** — NOT cards; same columns mapped to compact row; horizontal scroll removed |
| Why list not cards | Transactional data is linear and chronological. It does not require card-style hierarchy, but may use compact row expansion for secondary metadata such as hash or additional details. Cards add structural overhead without benefit for flat records. |
| Primary field | Transaction type + amount |
| Color | Primarily neutral; directional color may be used only when it reflects actual fund movement rather than risk/status semantics |
| Parity rule | All columns from desktop table must be accessible in mobile list row — either inline or on expand |
| Data source | Same TanStack instance; same sort/pagination state |
| Implementation | Add `max-md:` list row rendering to same component; table on `md+`, list rows on `max-md:` |

**Reference implementation note:**  
`Wallet History` is the validated reference implementation for wallet ledger list rows on mobile with preserved desktop table behavior.
---

#### Active Accounts (`wallet/account-summary/data-table.tsx`)

| Aspect | Detail |
|--------|--------|
| Desktop | TanStack table; address is the primary verifiable identity anchor; columns: Created, Address, Balance, Type, Status, Label, TxHash, Actions |
| Mobile | **List rows** — NOT cards; primary = Address + Balance; secondary = Status + Label + Created date in structured grouped layout; horizontal scroll removed |
| Why list not cards | This is a wallet state surface with actions, not a trading card surface. Rows need quick scanability, preserved actions, and expandable technical detail without trading-style card overhead. |
| Primary field | Address + balance |
| Status contract | `Available` / `Locked in Position` / `Locked in Lending` / `Action Required` |
| Status meaning | Status describes the condition of funds. `Action Required` means the account was not fully processed; funds are safe and can be moved back using `Transfer`. |
| Label rule | Label is supporting context only. It is not canonical identity and must not outrank address. |
| Type rule | Type is supporting metadata only. It reflects derived usage context and must not be treated as canonical account identity. |
| Desktop explanation pattern | `Action Required` uses tooltip/info affordance with explanatory copy; no new modal required |
| Mobile explanation pattern | `Action Required` explanation is shown inline inside the existing expand/details area; do not use hover tooltip patterns on mobile |
| Parity rule | All desktop table fields remain accessible on mobile — either visible inline or in expand/details |
| Data source | Same TanStack instance; same row model and action eligibility rules |
| Implementation | Desktop table on `md+`; list rows on `max-md:` from the same row model; no separate mobile data pipeline |

**Reference implementation note:**  
`Active Accounts` is the validated reference implementation for action-capable wallet state rows with truth-first identity, status-driven state language, mobile list-row presentation, and preserved desktop table behavior.
---

#### Lend System (`wallet/lend/page.tsx`)

| Aspect | Detail |
|--------|--------|
| Desktop layout | 2-column grid. LEFT column: Pool Performance (APY-dominant) → My Investment → Pool Health. RIGHT column: APY Trend (chart) → Add Liquidity. Tabs (Deposits / History) span full width below. |
| Mobile layout | Single column stack with strict hierarchy: APY (hero) → Chart (supporting) → My Investment → Add Liquidity (actions) → Pool Health (supporting) → Deposits (cards) → History (list rows). |
| Page mental model | Yield position dashboard: (1) What yield exists → (2) What is my position → (3) What can I do → (4) Supporting pool state → (5) Records. |
| Hero system | Pool Performance + APY Trend are a single conceptual system. Chart explains APY; it does not compete with it. |

**Pool Performance (APY-dominant)**

| Aspect | Detail |
|--------|--------|
| Primary | APY (7D) — large, dominant typography |
| Secondary | Pool Equity (BTC), Pool Return (7D) |
| Supporting | Share NAV, BTC Price (visually muted; may move to expand on mobile) |
| Color | APY = neutral emphasis (not green/red); Pool Return uses PnL semantics; others neutral |
| Pills | None — no binary state to communicate |
| Rule | Do not present all metrics equally; APY must visually dominate |

**APY Trend (Chart)**

| Aspect | Detail |
|--------|--------|
| Role | Visual explanation of APY over time |
| Dominance | Supporting to APY; never primary |
| Controls | 1D / 1W / 1M remain |
| Color | Align with APY tone (not PnL colors) |
| Title | Use concise label (e.g., “APY Trend”) |

**My Investment (User state)**

| Aspect | Detail |
|--------|--------|
| Primary | Active Principal (BTC) |
| Secondary | Pending Rewards (soft green), Annualized Return |
| Supporting | Total Deposits, Realized Rewards |
| Color | Yield uses soft green; avoid aggressive PnL styling |
| Priority | Must appear above Pool Health on all viewports |
| Actions | Withdraw available (secondary); Add Liquidity is separate primary action surface |

**Add Liquidity (Action surface)**

| Aspect | Detail |
|--------|--------|
| Primary CTA | Deposit / Add Liquidity |
| Visibility | Always visible (no hiding behind tabs or expand) |
| Inputs | Amount (BTC/USD), approx pool share |
| Color | Primary button uses theme; not PnL colors |
| Behavior | Inline form; submission follows existing flow |

**Pool Health (Supporting system state)**

| Aspect | Detail |
|--------|--------|
| Primary | None (no dominant field) |
| Visible | Exposure Utilization, Net Exposure |
| Color | Neutral with limited semantic accents (e.g., LOW) |
| Priority | Supporting only; visually lighter than My Investment |

**Tabs — Deposits / History (Records layer)**

| Aspect | Detail |
|--------|--------|
| Deposits | Active user lending positions (capital allocations) |
| Deposits Mobile | **Cards** — follow Deposit Card spec (position-like, actionable) |
| Deposits Primary | Deposit (BTC) |
| Deposits Secondary | PnL (BTC), Annual Return, Status |
| Deposits Supporting | Account Tag, Date |
| Deposits Expand | Shares, NAV, additional metadata |
| Deposits Action | Withdraw (primary CTA) |
| Deposits Color Driver | PnL / return semantics (soft green/red/neutral) |
| History | Lending event log (deposits, withdrawals, rewards) |
| History Mobile | List rows (not cards) following general tables rule |
| Desktop | Table with sorting/pagination |
| Parity | All fields accessible on mobile via inline/expand |

**Reference implementation note:**
`Lend System` is the validated reference for yield dashboards with APY-dominant hierarchy, user-first positioning, and action clarity, using cards on both desktop and mobile with reordered stacking.

### 4.3 Order Forms (Market and Limit)

**Both forms share the same responsive approach.** The market form is the reference; the limit form mirrors it with the addition of the price input.

**Form field structure:**

| Field | Desktop | Mobile (`max-md:`) |
|-------|---------|-------------------|
| Collateral input (BTC/USD) | Standard `Input` with unit toggle | Same; `max-md:border-t max-md:border-border/30 max-md:pt-3` section separator added |
| Collateral stepper (+/−) | `hidden md:flex` — shown only on desktop | `flex items-stretch gap-2 md:hidden` — shown only on mobile |
| Preset buttons (25/50/75/100%) | Inline row | Same |
| Leverage input + presets | Inline row | `max-md:border-t` separator; same fields |
| Liq Buy / Liq Sell | `text-green-medium/70` / `text-red/70` (colored) | `max-md:text-primary/50` (softened to neutral) |
| Buy / Sell buttons | `border-green-medium py-2` / `border-red py-2`; `opacity-70` with hover reveal | `max-md:h-12 max-md:bg-green-medium/10 max-md:text-base max-md:font-semibold max-md:opacity-100 max-md:active:bg-green-medium/20` — soft-fill, full height, always prominent |
| Limit price input | — (market only has current price display) | Same `NumberInput` with Mark button |

**ExchangeResource gate:**
- Both forms wrap their submit buttons in `ExchangeResource`
- If BTC not registered: gate intercepts, shows "Register BTC Address" dialog with navigation to `/registration`
- If BTC registered but not confirmed: shows "Verify BTC Address" dialog with navigation to `/verification`
- The gate is transparent when both conditions are met — children render normally
- **Do not move or remove this wrapper during any form refactor**

**FundTradeButton in order panel header:**
- Displayed as `compact` type on desktop panel, `icon` type on mobile header
- Opens transfer dialog (Modal) for moving BTC between funding and trading accounts
- Not part of the order submission flow — it is a pre-trade utility action
- Always visible alongside the order form tabs

**Collateral unit toggle (BTC / USD):**
- `collateralUnit` state: `"btc"` or `"usd"`
- Affects: step size for stepper buttons, input validation, display label
- Same state across breakpoints — no mobile-specific unit behavior

---

## 5. Cross-Pattern Rules

These rules govern interactions between patterns. Apply them when a change in one pattern affects another.

### 5.1 Color cannot be used differently across patterns

`text-green-medium`, `text-red`, and yellow shades carry fixed meanings:
- Green: positive PnL, LONG position, TP order, FILLED status, healthy system state, buy action
- Red: negative PnL, SHORT position, SL order, CANCELLED status, halt system state, sell action
- Yellow: warnings, CLOSE_ONLY state, Limit order type

These mappings must be identical between the trade card system, order forms, wallet summaries, ticker strips, and relayer status. A color used in a new context must match its established meaning. If a context requires a neutral color, use `text-primary-accent` or `text-primary/40` — not a repurposed semantic color.

### 5.2 PnlCell is the enforcement boundary for PnL rendering

All PnL values displayed anywhere in the UI must go through `PnlCell`. This includes:
- Trade detail tables (all four tab types)
- Wallet page summaries (trade PnL, lend PnL)
- Any future positions or history surface

If a surface currently displays raw PnL numbers outside `PnlCell`, that is a technical debt item, not a pattern to replicate.

### 5.3 Overlay types must not be mixed within a pattern

Each pattern has a defined overlay type (see matrix, column "Overlay Type"). Do not add a modal where the pattern calls for a popover, or add a popover where a sheet is specified. Overlay type is determined by task risk (R13). If a pattern's task risk changes, the overlay type must change with it — and the change must be documented.

For the Positions mobile action model specifically:
- `Manage` is a sheet-based action hub
- configuration/edit tasks stay in sheet-based flows
- destructive remove actions escalate to modal confirmation
- `Close Market` remains a visible primary action outside the sheet

For the Open Orders mobile action model specifically:
- `Cancel` remains a direct action and does not use pre-confirmation for unambiguous cancels
- A scope-selection dialog is allowed when the cancel target is ambiguous and the user must choose between multiple affected legs/states
- `Edit` uses a sheet-based contextual editor
- Open Orders does not use a `Manage` hub
- `Status` is an allowed visible secondary signal on this surface because the surface includes materially different operational states
- Type/status labels remain supporting semantics; side-driven price context remains dominant

### 5.4 Touch target sizes must be consistent across patterns

All interactive elements on primary action paths at `max-md:` must meet 44×44px minimum. This is a cross-pattern rule: if the Buy button on the order form meets 44px but the Close Market button on the position card does not, both must be fixed together. Touch target remediation is done by pattern family in the polish pass, not per-component.

### 5.5 Direct-action patterns must not inherit managed-action flows

Not all trading card families use the same action model.

- Positions uses a managed-action model (`Close Market` + `Manage`)
- Open Orders uses a direct-action model (`Cancel` + secondary `Edit`)

Do not copy a managed-action hub into a direct-action pattern unless the matrix is explicitly updated.

### 5.6 Expand/collapse state is local to each pattern

Each card variant manages its own `expandedIds: Set<string>`. The expanded state does not persist across navigation or page reload. This is intentional — expanded state is ephemeral UI state. Do not introduce persistence (localStorage, store) for expand state without explicit product approval.

### 5.7 The trade layout breakpoint and CSS breakpoints are independent systems

The `showOrderbook` JS threshold (996px) in `trade-wrapper.client.tsx` controls which layout panels are composed. The CSS breakpoints (`md`, `lg`) control styling within those panels. These two systems must not become coupled:

- Do not use `showOrderbook` to drive CSS class logic
- Do not use CSS `lg:` visibility to replicate `showOrderbook` behavior
- If both need to change, they must be changed together intentionally, not as side effects

### 5.8 Step flow sequence is immutable

The registration → verification → deposit sequence, and the individual steps within each flow, must not change in response to responsive work. Responsive adaptation within a step (stacking form + notices, reducing gutters) is permitted. Removing a step, merging steps, or skipping steps is not permitted as a UI optimization.

### 5.9 Data source sharing is verified, not assumed

When introducing a mobile alternate presentation for any pattern, verify — not assume — that the mobile component consumes the same data source as the desktop component. The verification check: both components receive the same prop type, and there is no conditional fetch or transform that produces different data by breakpoint.

### 5.10 Instrument labels must come from a shared canonical source

Instrument / market labels displayed in cards, headers, or detail surfaces must come from a shared canonical source.

Approved sources:
- route-level market metadata when available
- centralized constant/config when route data does not yet provide the label

Do not:
- hardcode market labels locally inside a card component
- show a market label on one device expression but not the other

If the product is currently single-instrument, the label may still be constant — but it must be defined once in a shared source and consumed consistently.

---

*This document specifies responsive behavior as it must be implemented. It does not describe design intent or UX goals — those are in the audit and principles documents. Every rule here is enforceable in a code review.*
