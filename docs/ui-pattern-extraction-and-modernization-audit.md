# UI Pattern Extraction and Modernization Audit

**Document purpose:** Capture the Twilight Pool app’s recurring UI patterns as implemented today, classify them for modernization, and define a **responsive pattern system** evolution path without changing product behavior or brand identity.

**Last updated:** System-level scan of `components/`, `app/_components/`, `app/globals.css`, `tailwind.config.ts`, and representative routes under `app/(main)/`.

---

## 1. Scope

### In scope

- Visual language: color tokens, typography roles, borders, radii, spacing rhythms.
- Layout shells: main layout, header, route-level page composition.
- Component families: navigation, forms, buttons, tabs, dialogs, popovers, toasts, tables, cards, charts, skeletons.
- Interaction affordances: hover vs touch, scroll regions, breakpoints (`md`, `lg`, `max-md`, width thresholds such as ~996px for trading).
- **Modernization targets:** responsiveness, density, touch usability, scroll/safe-area behavior, discoverability—**without** altering business logic, API contracts, or user flows.

### Out of scope

- Feature development, new trading capabilities, or backend changes.
- Replacing the brand palette or renaming products.
- Pixel-perfect redesigns of individual pages (this document is **system-level**).

### Constraints (per product direction)

- Preserve **Twilight** visual identity: dark/light via `html.dark` / `html.light`, accent **theme** (`--theme` from pink/orange/purple), semantic greens/reds for PnL and risk.
- Keep **Inter** (body), **Instrument Serif** (feature/display), **Roboto Mono** (numeric/UI) as the typography stack unless a future explicit brand update says otherwise.
- Prefer **one codebase** with responsive variants (`max-md:`, `md:`) over duplicating entire screens.

---

## 2. Locked Constants

These are treated as **brand and structural anchors**—modernization should **compose around** them, not replace them without explicit design sign-off.

| Constant | Implementation notes |
|----------|----------------------|
| **HSL color system** | `--primary`, `--background`, `--primary-accent`, `--outline`, `--theme` (pink/orange/purple), `--green-medium`, `--red`, tab/button tokens in `app/globals.css` + `tailwind.config.ts`. |
| **Theme accent switching** | `html.pink` / `html.orange` / `html.purple` sets `--theme`; `text-theme`, `border-theme`, `bg-theme/*` usage across UI. |
| **Light/dark mode** | `html.light` / `html.dark` class on `html`; shared foreground/background pairs. |
| **Primary button language** | `.btn-primary` / `.btn-secondary` layered pseudo-elements (gradient ring on hover); pill-adjacent `rounded-default` (very large radius). |
| **Font roles** | `--font-body` (Inter), `--font-feature` (Instrument Serif), `--font-ui` (Roboto Mono) from `lib/fonts.ts`. |
| **Trading terminal tone** | Dense panelized trading presentation, draggable desktop workspace, numeric emphasis, muted chrome with semantic color highlights. Modernization must not flatten this into a generic consumer-finance layout. |
| **Status semantics** | Green / red / yellow state language for PnL, relayer health, risk, order states, warnings, and confirmations is part of product comprehension, not decorative theming. |
| **Radix UI primitives** | Dialog, Popover, Tabs, Select, Toast, Checkbox, DropdownMenu, Separator, Slider, Slot, Switch — accessibility and behavior baseline. |
| **Trading layout engine** | `react-grid-layout` + `DragWrapper` for resizable panels on large screens; fixed **stacked** layout below `showOrderbook` breakpoint (~996px) in `trade-wrapper.client.tsx`. The JS composition threshold is a behavioral constant unless explicitly re-approved. |

### Adaptive variables (should evolve with modernization)

| Variable | Why variable |
|----------|----------------|
| **Spacing scale** | Mix of `p-4`, `p-6`, `gap-*`, route-specific `mx-*`; should converge on a small set of **page gutters** per breakpoint. |
| **Touch targets** | Shared `Button` sizes and ad-hoc `min-h-*` on chrome; secondary controls still vary. |
| **Table vs card** | Data-heavy routes use `min-w-[…]` + `overflow-x-auto`; mobile may need **parallel presentation** without changing data. |
| **Popover/dialog width** | Default `w-72` on `PopoverContent`; modals use `max-w-sm` / `md:max-w-lg` + overrides. |
| **Chart height** | Lend APY and trade chart reserve fixed or min heights—should adjust by viewport **visually** only. |
| **Route-specific table minima** | `min-w-[640px]`–`880px` and scroll containers are implementation choices, not brand constants. |
| **Scroll ownership** | Nested scroll regions, sticky headers, and panel-local overflow should be normalized by route and breakpoint. |

### Classification vocabulary

Use these labels consistently throughout the document:

- **Keep**: Preserve as-is except for token alignment or low-level cleanup.
- **Refine**: Preserve the pattern and role, but tighten spacing, sizing, or consistency.
- **Adapt**: Preserve product behavior and identity while changing responsive expression or composition.
- **Replace**: Replace the **presentation pattern only**, while preserving data, behavior, and business intent.

---

## 3. Current Pattern Inventory

### 3.1 Page shells

| Aspect | Current expression |
|--------|--------------------|
| **Root** | `app/(main)/layout.tsx`: global fonts on `<html>`, optional testnet banner, `Header`, `LayoutMountWrapper` (pass-through), flex column for main content. |
| **Viewport** | Named `viewport` export: `viewportFit: "cover"` for safe-area insets. |
| **Route pages** | Common pattern: `bg-card` + `rounded-lg` + `border border-outline` + responsive padding (`p-4 md:p-6`) for wallet, lend, registration-like flows. |
| **Purpose** | Consistent “card on canvas” for account/finance pages; trade route is exception (grid). |

**Desktop-biased?** Trade page shell is **strongly desktop-first** (grid + drag); other routes use responsive grids but **tables** remain wide.

---

### 3.2 Navigation

| Aspect | Current expression |
|--------|--------------------|
| **Header (`md+`)** | `border-b`, horizontal logo + nav links (`marketSubLinks`, docs, deposit multi-link) + right cluster: `RelayerStatus`, `ConnectWallet`, `Settings`. `KycStatus` and `SubaccountSelect` are imported but currently **commented out**; if re-enabled they follow existing patterns (popover for KycStatus, select + modal for SubaccountSelect with `ExchangeResource` gating). |
| **Header (mobile)** | Compact row: small logo, `RelayerStatus dotOnly`, wallet, settings, `MobileNav` drawer. |
| **Mobile drawer** | Radix Dialog slide-in from right, `max-w-xs`, `min-h-dvh`, nav links as bordered rows. |
| **Settings** | Full-height drawer from right (`DialogContent` overrides), scroll + safe-area padding. |

**Interaction:** Hover on desktop links; touch on mobile drawer and icon triggers; settings/tooltips use popover or dialog.

**Desktop-biased?** Desktop gets full nav labels; mobile relies on drawer—**by design**, but **density** of the mobile header is high.

---

### 3.3 Cards / panels

| Aspect | Current expression |
|--------|--------------------|
| **Finance pages** | `bg-card`, `rounded-lg`, `border border-outline`, internal vertical spacing (`gap-6`, `space-y-*`). |
| **Alerts / step callouts** | Yellow/blue bordered panels (`border-yellow-500/30`, etc.) on registration/verification-style pages. |
| **Trade panels** | `DragWrapper` titles + draggable chrome; internal `overflow` per widget. |
| **Positions (mobile)** | Card-style position rows with metric grids, soft-fill actions—**tighter** to trading terminal patterns. |

**Desktop-biased?** Trade panels assume drag/resize; card patterns on wallet/lend are **responsive** but content inside often **tables**.

---

### 3.4 Headers (page-level and panel-level)

| Aspect | Current expression |
|--------|--------------------|
| **Typography** | `Text` component with `heading="h1"|"h2"|"h3"` — responsive steps (`text-2xl sm:text-4xl` for h1, etc.). |
| **Ticker** | Collapsible mobile ticker row; desktop ticker in layout. |
| **Panel titles** | String titles in drag handles, tab labels, section headings with `text-primary-accent` for labels. |

**Desktop-biased?** Tab strips can overflow horizontally with **scrollbar hidden**—discoverability on small screens is a known UX gap.

---

### 3.5 Forms

| Aspect | Current expression |
|--------|--------------------|
| **Input** | `input.tsx`: bordered, `h-9`, `text-base md:text-sm` (iOS zoom mitigation). |
| **Number / PopoverInput** | Steppers, denom toggles—often **compact** next to 16px inputs. |
| **Select** | Radix select, `h-10`, `text-sm`, full-width trigger. |
| **Market/Limit** | Split mobile/desktop DOM in places for margin, leverage, price steppers (`max-md:` / `md:`). |
| **Labels** | `Text asChild` + `label`, `text-primary-accent` common. |

**Desktop-biased?** Desktop-dense forms; mobile **soft-fill** Buy/Sell and larger steppers where implemented—pattern is **inconsistent** across every form.

---

### 3.6 Action areas

| Aspect | Current expression |
|--------|--------------------|
| **Primary actions** | `Button`: variants `primary`, `secondary`, `ui`, `link`, `icon`; sizes with `min-h-[40px]`–`44px` + `touch-manipulation`. |
| **Destructive / theme** | Outline `ui` variant with theme-colored labels for close/manage actions in trading cards. |
| **Fund ↔ Trade** | `FundingTradeButton`: `icon` / `large` / `compact` for header density. |
| **Sticky/fixed** | Toast top/bottom with safe-area padding; footer padding on trade page (`pb-20 lg:pb-[140px]`). |

**Desktop-biased?** Some raw `<button>` elements and small icon buttons remain outside the shared `Button` system.

---

### 3.7 Status signals and semantic badges

| Aspect | Current expression |
|--------|--------------------|
| **Health / system state** | `RelayerStatus` uses colored dot + badge + popover reason; semantic states are HEALTHY / HALT / CLOSE_ONLY. |
| **Trading side / risk** | LONG / SHORT, PnL, liquidation, SL/TP, warnings, and funding cues use consistent semantic color coding. |
| **Alerts / confirmations** | Yellow, blue, red, green panels and inline states appear in onboarding, verification, withdrawal, and success/failure flows. |
| **Purpose** | These patterns communicate trust, risk, and action readiness; they are part of the product language. |

**Desktop-biased?** No. This family is cross-device and must remain semantically stable across responsive adaptations.

---

### 3.8 Copyable fields, reserve blocks, and transactional read-only inputs

| Aspect | Current expression |
|--------|--------------------|
| **Copy rows** | Address / amount / reserve fields use read-only inputs with inline copy affordances and monospace or tabular display. |
| **Reserve / QR tasks** | Deposit and verification flows combine QR code, reserve address, reserve ID, amount copy field, and expiry/progress state. |
| **Wallet/account info** | Connected wallet popover and transactional tables/cards rely on truncation + copy patterns for hashes and addresses. |
| **Purpose** | Present immutable operational values clearly while keeping them immediately actionable on touch devices. |

**Desktop-biased?** No, but touch hit areas and width behavior are inconsistent.

---

### 3.9 Tables / lists

| Aspect | Current expression |
|--------|--------------------|
| **Pattern** | TanStack-style tables or table markup wrapped in `overflow-x-auto`; `min-w-[640px]`–`880px` common. |
| **Wallet** | Account summary + transaction history tables scroll horizontally. |
| **Lend** | Lend orders/history tables with large min-widths. |
| **Trade details** | Positions: table vs cards toggle; open orders/history often table-oriented. |
| **Withdrawal** | Requests table in constrained height + scroll in some layouts. |

**Desktop-biased?** **Yes.** Tables are the default “source of truth” layout; mobile is **scroll inside scroll**, not alternate row cards.

---

### 3.10 Step flows and instructional scaffolds

| Aspect | Current expression |
|--------|--------------------|
| **Stepper** | Shared `Stepper` pattern for registration / verification / deposit style flows. |
| **Instruction panels** | Parallel “important information” and staged instruction cards on onboarding-like routes. |
| **Task staging** | Faucet, registration, deposit, and verification all use explicit linear progression. |
| **Purpose** | Reduce user error in sensitive wallet / reserve / identity tasks without changing underlying flow logic. |

**Desktop-biased?** No. These are system onboarding patterns and should remain readable and sequential on all devices.

---

### 3.11 Overlays

| Aspect | Current expression |
|--------|--------------------|
| **Dialog** | Centered modal: `max-h-[calc(100dvh-2rem)]`, `overflow-y-auto`; close button top-right. |
| **Drawers** | Full-height right sheets: `min-h-dvh`, `translate-x-0`, safe-area bottom padding where applied. |
| **Popover** | Default `w-72` on `PopoverContent`; wallet popover `w-64` in places. |
| **Tooltip (custom)** | Popover-based `Tooltip` in `components/tooltip.tsx`: hover + click toggle, Info icon. |

**Desktop-biased?** Fixed `w-72` can crowd narrow viewports; centered dialogs may need **keyboard-safe** padding in future (visual only).

---

### 3.12 Feedback states

| Aspect | Current expression |
|--------|--------------------|
| **Toast** | Radix toast; variants (default, error, success); viewport with safe-area offsets. |
| **Skeleton** | `Skeleton` component for loading placeholders. |
| **Inline errors** | Red text, bordered alerts; form validation via toasts in some flows. |

---

### 3.13 Charts / data displays

| Aspect | Current expression |
|--------|--------------------|
| **K-line / trading** | Chart in grid; mobile interval controls simplified in chart client. |
| **Lend APY** | Chart with reserved min height for readability. |
| **Ticker / resource strips** | Price, funding, OI, skew, and stat strips use condensed, live-updating resource presentation with numeric emphasis. |
| **Numeric display** | `tabular-nums`, `font-mono` / `font-ui` for prices, PnL, resources. |

**Desktop-biased?** Chart **area** competes with vertical space on short phones; tuning is **layout/density**, not data.

---

### 3.14 Trade detail cards

| Aspect | Current expression |
|--------|--------------------|
| **Scope** | Four card variants under `app/_components/trade/details/tables/`: `positions-cards`, `open-orders-cards`, `order-history-cards`, `trader-history-cards`. |
| **Shared scaffold** | Sorted data array mapped to `grid-cols-1 xl:grid-cols-2`; card shell `rounded-xl border border-border/70 bg-background/90 shadow-sm`; left accent bar (`absolute inset-y-0 left-0 w-0.5`) with semantic color; expandable details with `ChevronDown`/`ChevronUp` toggle; `hover:-translate-y-[1px] hover:border-theme/35 hover:shadow-md` lift interaction. |
| **Semantic pills** | `bg-green-medium/10 text-green-medium` (LONG / TP / FILLED), `bg-red/10 text-red` (SHORT / SL / CANCELLED), `bg-yellow-500/10 text-yellow-500` (Limit). |
| **MetricCell** | Inline compound component (label + value cell, `flex flex-col gap-1`) used inside `positions-cards` for metric grids. |
| **PositionsCards dual-layout** | Separate DESKTOP (`hidden md:block`) and MOBILE (`block md:hidden`) DOM blocks per card. Mobile uses `PnlCell` hero layout and a "Manage" dialog for secondary actions; desktop uses responsive/inline PnlCell and inline action buttons. This is an existing instance of the DOM divergence risk noted in Section 9. |
| **Table/card toggle** | `details.client.tsx` maintains `viewByTab` state (`Record<tab, "table" | "cards">`) across all four tabs, defaulting to `"cards"`. Toggle button switches rendering; data source remains shared. |

**Desktop-biased?** Cards are mobile-native; the dual-layout in PositionsCards is the most significant responsive composition in the trade surface.

---

### 3.15 PnL display system

| Aspect | Current expression |
|--------|--------------------|
| **Component** | `PnlCell` in `lib/components/pnl-display.tsx` — shared PnL rendering primitive. |
| **Layout modes** | `stacked` (table default: BTC + USD vertical, `text-xs`), `inline` (desktop rows: flex baseline, BTC semibold + USD in parens), `responsive` (stacked on mobile / inline from `md:`), `hero` (mobile full-width block: `border-l-2` accent, `bg-**/[0.04]` tint, `text-lg` BTC, `text-sm` USD below). |
| **Semantic coloring** | `text-green-medium` (positive), `text-red` (negative), `text-primary/40` (zero/neutral). |
| **Usage** | All four trade detail card variants, table column definitions (positions, order history, trader history), wallet page summaries. |
| **Header** | `PnlHeader` — simple label component (`"uPnL"` / `"PnL"`). |

**Desktop-biased?** No. The layout modes are purpose-built for cross-device rendering; `hero` is mobile-specific and `stacked`/`inline` serve desktop tables and rows respectively.

---

### 3.16 Behavioral gates

| Aspect | Current expression |
|--------|--------------------|
| **ExchangeResource** | `components/exchange-resource.tsx` — wraps interactive triggers (buttons, links) and intercepts the action if the user has not completed BTC registration or verification. Shows a redirect dialog prompting registration or verification. |
| **Usage** | Trade order forms (`market.client.tsx`, `limit.client.tsx`), subaccount select (`subaccount-select.client.tsx`). |
| **Boundary** | Sits at the visual/behavioral boundary: the component is visually transparent (renders children as-is when gating passes) but structurally significant because it wraps triggers as `DialogTrigger`. Refactoring action entry points must preserve this wrapping to avoid breaking the registration/verification flow. |

**Desktop-biased?** No. This is a behavioral constraint, not a visual pattern.

---

## 4. Pattern Classification Matrix

Summary classification for modernization (UI only; **no** behavior change).

| Pattern Family | Current Pattern | Purpose | Constant or Variable | Keep / Refine / Adapt / Replace | Notes |
|----------------|-----------------|---------|----------------------|----------------------------------|-------|
| Page shells | Card-on-canvas (`bg-card`, border, rounded-lg) | Group related account/finance content | **Constant** structure; **variable** gutters | **Refine** | Tighten responsive gutters (`mx`, `p`) per breakpoint. |
| Page shells | Trade `react-grid-layout` + stacked mobile layout | Dense terminal workspace | **Constant** engine; **variable** breakpoints | **Adapt** | Add mobile orderflow surface without removing desktop grid. |
| Navigation | Split header + mobile drawer | Global wayfinding + account access | **Constant** roles; **variable** density | **Refine** | Reduce accidental taps; optional safe-area top on drawer. |
| Cards / panels | Finance cards vs trade drag-panels | Content grouping + resizable workspace | **Constant** brand; **variable** chrome | **Refine** | Align border/bg opacity language across trade + wallet. |
| Headers | `Text` headings + section labels | Hierarchy and scanning | **Constant** fonts; **variable** sizes (already partly responsive) | **Keep** | Optional fluid type for edge viewports only. |
| Forms | Input + Select + custom steppers | Data entry | **Constant** Radix; **variable** field layout | **Adapt** | Extend mobile stepper/soft-fill patterns to remaining forms. |
| Copyable task fields | Read-only inputs + QR + reserve blocks + copy actions | Execute operational wallet/deposit tasks safely | **Constant** role; **variable** width/action density | **Refine** | Keep monospace clarity and copy-first behavior; normalize mobile hit areas and wrapping. |
| Action areas | `Button` + specialized trade actions | Primary/secondary CTAs | **Constant** variants; **variable** sizes | **Refine** | Align orphan buttons to `Button`; ensure 44px on touch-critical paths. |
| Status semantics | Health badges, order pills, alerts, semantic color chips | Risk and state communication | **Constant** semantics; **variable** density | **Keep** | Preserve meanings and color mapping; only refine layout and touch behavior. |
| Tables / lists | Horizontal scroll tables | Data-dense review | **Variable** | **Replace** (presentation only) | Introduce **card/list** or stacked rows at `max-md:`; same data. |
| Step flows | Stepper + instructional panels + staged task screens | Guide sensitive multi-step tasks | **Constant** flow roles; **variable** spacing/layout | **Refine** | Preserve progression structure; normalize mobile spacing and information pairing. |
| Overlays | Dialog / Popover / drawer | Modal tasks, context menus | **Constant** Radix; **variable** width/safe-area | **Adapt** | `min(100vw - 2rem, …)` width; optional `pb-safe` on modals. |
| Feedback | Toast + skeleton + inline alert | Status and loading | **Constant** | **Refine** | Toast already safe-area aware; align loading skeleton shapes. |
| Charts | Chart height + controls | Market visualization | **Variable** | **Adapt** | Reduce min-height on small `dvh` only; keep chart behavior. |
| Resource strips | Ticker and compact stat displays | Condensed market/account status scanning | **Constant** numeric emphasis; **variable** density | **Refine** | Preserve terminal feel while clarifying truncation and collapse behavior on narrow widths. |
| Trade detail cards | Four card variants with shared scaffold (accent bar, pills, expandable details, `xl:grid-cols-2`) | Mobile-native data presentation for trade positions, open orders, order history, trader history | **Constant** semantic pills and data; **variable** card chrome and grid density | **Refine** | Extract shared scaffold; resolve PositionsCards dual-layout DOM divergence per Section 9 guidance. |
| PnL display | `PnlCell` with 4 layout modes (stacked, inline, responsive, hero) | Semantic PnL rendering across tables, cards, and summaries | **Constant** semantic coloring and mode contracts; **variable** per-consumer layout selection | **Keep** | Preserve layout mode contracts; any new consumer should select from existing modes. |
| Behavioral gates | `ExchangeResource` trigger wrapper | Enforce registration/verification before trade actions | **Constant** | **Keep** | Preserve trigger wrapping during any action-area refactoring. |

---

## 5. Target Experience Principles

1. **One system, two densities:** Same components; **narrow** viewports prioritize **reachability, legibility, and touch**, **wide** viewports prioritize **information density** and multi-pane layout.
2. **No hidden critical data:** If a column is off-screen due to horizontal scroll, provide a **narrow** summary or **primary fields** in a stacked pattern (visual reordering only).
3. **Progressive disclosure:** Trade, wallet, and lend can use **sheets, collapses, or tabs** to show depth without adding new business steps.
4. **Predictable primitives:** Overlays and lists use **shared width, safe-area, and scroll** rules so each team doesn’t re-solve 320px layouts.
5. **Brand-stable:** Theme accent, semantic colors, and typography roles stay; modernization is **spacing, interaction, and responsive structure**.

---

## 6. Current-to-Target Pattern Map

| Current pattern | Target pattern (UI-only) |
|-----------------|---------------------------|
| Trading terminal chrome and dense numeric emphasis | Preserve panelized terminal feel, monospace/tabular numerics, semantic status accents, and subdued chrome while modernizing spacing and touch behavior only. |
| Wide tables + horizontal scroll on phone | **Same table component** renders **stacked card rows** or **primary-field list** below `md` (or route flag), **no** API change. |
| Orderbook hidden on small screens | **Additional** panel entry (tab, sheet, or collapsible strip) exposing **recent trades and/or compact book**—layout-only composition in trade wrapper. |
| Stepper + side-by-side instructional scaffolds | Keep linear staged flow, but allow stacked instructional pairing and reduced guttering on narrow viewports. |
| Copy fields / QR / reserve task blocks | Normalize as a reusable “transaction task block” with clamp-aware widths, stronger touch targets, and preserved copy-first behavior. |
| Status badges / pills / health chips | Preserve semantic color/label mapping exactly; only adjust density, spacing, and responsive wrapping. |
| Fixed `w-72` popovers | **max-width** relative to viewport + consistent padding; **optional** `align`/`side` tweaks per anchor. |
| Nested scroll regions in trade | **Visual** mitigation: clearer panel boundaries, sticky subheaders, or reduced nested `max-h` where safe—without changing data updates. |
| Hidden scrollbar tab strips | **Scroll hint** (fade, gradient) or **truncated labels** on `max-md:`—purely visual. |
| Small icon-only secondary actions | **Hit area** padding and `min-h`/`min-w` on `max-md:` using shared class or variant. |
| Drawer vs centered modal inconsistencies | Keep Radix primitives, but define route-appropriate overlay mode by task type and viewport rather than one-off overrides. |
| Verification empty shell | **Product** fix is out of scope for “patterns only”; if enabled, use **same** card + form patterns as registration/deposit. |

---

## 7. Device Expression Rules

| Rule | Guidance |
|------|----------|
| **Breakpoints** | Tailwind `sm` / `md` / `lg` + app-specific **996px** trade split (`showOrderbook`). Prefer `max-md:` for mobile-first overrides. Keep CSS breakpoints and JS composition thresholds explicitly documented together to avoid drift. |
| **Touch targets** | Interactive targets on primary paths: **≥ 44×44 CSS px** on touch-first surfaces; `touch-manipulation` on repeated taps. |
| **Viewport** | `100dvh` for full-height panels; avoid `100vh` for full-bleed sheets. |
| **Safe areas** | Respect `env(safe-area-inset-*)` for fixed top/bottom UI (toasts, drawers, future footers). |
| **Typography** | Body text ≥ 16px on inputs on mobile (already on `Input`); headings use responsive scale from `Text`. |
| **Orientation** | Portrait is the primary supported expression. Landscape may preserve the same components with denser arrangement, but should not introduce new task requirements. |
| **Pointer policy** | Hover may enrich desktop, but touch paths must remain fully understandable without hover-only cues. Any hover-dependent affordance needs visible touch-safe fallback. |
| **Scroll ownership** | Each route should have one obvious primary page scroll; nested scroll regions should be limited to data-dense widgets and made visually explicit. |
| **Sticky regions** | Sticky headers, tab bars, and panel titles should be used only where they improve orientation and do not create stacked scroll traps on narrow screens. |
| **Overlay sizing** | Drawers and popovers should clamp to viewport width and safe areas on narrow screens; avoid fixed widths that assume `>= 360px`. |
| **320px floor** | Responsive expressions must remain legible and operable at 320px logical width without relying on desktop overflow behavior as the only fallback. |
| **Data tables** | Desktop: full table. Mobile: **either** horizontal scroll **with** scroll hint **or** **card repeat** of same rows—pick per route based on friction audit. |

---

## 8. Rollout Plan

Phased, **non-breaking** modernization:

1. **Primitives pass (low risk)**  
   - Popover default width / max-width clamp.  
   - Dialog safe-area padding (bottom) on `max-md:` if needed.  
   - Tab strip scroll hint or label shortening.  
   **No** route structure changes.
   **Definition of done:** shared primitives render the same content and interactions as before, with no desktop visual regressions outside width clamping.

2. **Data presentation pass (medium risk)**  
   - Introduce a **responsive table wrapper** or “table on `md+`, list on `max-md:`” pattern on **one** pilot (e.g. transaction history).  
   - Replicate to wallet, lend, withdrawal **without** changing columns’ data binding.
   **Definition of done:** one source of row data, one meaning-preserving mobile presentation, no divergence between desktop and mobile values or actions.

3. **Trade surface pass (higher coordination)**  
   - Add **mobile orderflow** entry point using existing orderbook/recent-trades components where possible—**composition only**.  
   - Tune scroll regions and padding **visually**.
   **Definition of done:** desktop grid remains behaviorally unchanged; mobile gains access to missing market context without adding a new business step.

4. **Polish pass**  
   - Unify orphan buttons, residual small hit targets, chart min-heights on small `dvh`.  
   - Cross-check against design tokens (spacing, borders).
   **Definition of done:** no sub-44px critical actions remain on touch-first paths; token usage is consistent across shell, trading, wallet, lend, and onboarding patterns.

**Verification:** After each phase, run **visual regression** on desktop (`md+`) and mobile (`320`, `375`, `390`, representative landscape width) to ensure **no functional** changes and no accidental desktop redesign. Where a mobile alternate is introduced, verify it against the same data source and action set as desktop.

---

## 9. Risks and Cross-Impact Notes

| Risk | Mitigation |
|------|------------|
| **Table → card** changes row DOM | Keep **one data map**; render **two** presentational components behind a breakpoint flag. |
| **Trade layout** changes affect desktop | **Gate** new mobile UI with `max-md:` / `md:hidden` only; leave grid layout for `lg`. |
| **Popover width** changes clip content | Use `max-w-[min(100vw-2rem,18rem)]` and allow internal scroll. |
| **Touch target inflation** shifts desktop | Scope `min-h` overrides to `max-md:` or `touch:` where appropriate. |
| **Tailwind vs JS breakpoint drift** | Document behavioral thresholds alongside CSS breakpoints; do not silently change JS layout switches during style-only work. |
| **Duplicated mobile/desktop DOM divergence** | Keep shared derivation and action wiring; limit separate markup to presentation differences only. |
| **Semantic drift in status patterns** | Preserve existing color/state mapping for health, PnL, warnings, and order states; modernization must not remap meanings. |
| **Trading terminal tone erosion** | Validate changes against current dense, serious terminal presentation; avoid consumer-finance simplification. |
| **Chart / gesture regressions** | Treat touch and scroll tuning around charts as high-risk; validate drag, scroll, and interval controls on real mobile widths. |
| **Scope creep** | Treat “empty verification page” as **product/QA** issue; UI patterns apply once content exists. |

---

## 10. Pattern Ownership Model

- Shared primitives live in `/components/*`
- Route-specific compositions live in `app/_components/*`
- Pattern changes must be implemented at the **lowest shared layer possible**
- Avoid duplicating pattern logic across routes
- If a pattern appears in 2+ routes, it must be extracted or aligned

## 11. Single Source of Truth

- Data representation must not diverge between desktop and mobile
- Mobile alternates (cards, stacked rows) must derive from the same data source as tables
- Actions must trigger identical logic across breakpoints
- No mobile-only business logic

## 12. Interaction Priority

- Primary actions must remain immediately discoverable without hover
- High-risk or high-frequency actions (trade, close, withdraw) must not be visually deprioritized on mobile
- Secondary actions may collapse, but primary actions must not be hidden behind additional navigation layers

## 13. Density Guardrail

- Desktop density must be preserved for trading surfaces
- Mobile may reduce visible data, but must not remove critical context
- Avoid over-simplifying trading views into consumer-style layouts

## 14. Selective Modernization

- Not all patterns require change
- Prefer minimal, high-impact updates over global redesign
- If a pattern already works well across devices, it should be preserved

## Appendix: Key file index (for implementation)

| Area | Representative files |
|------|----------------------|
| Tokens & base | `app/globals.css`, `tailwind.config.ts` |
| Primitives | `components/button.tsx`, `input.tsx`, `dialog.tsx`, `popover.tsx`, `tabs.tsx`, `toast.tsx`, `select.tsx`, `typography/index.tsx`, `slider.tsx`, `checkbox.tsx`, `switch.tsx`, `dropdown.tsx`, `seperator.tsx`, `logo.tsx` |
| Shell | `app/(main)/layout.tsx`, `app/_components/layout/header.tsx`, `mobile-navigation.client.tsx`, `settings.client.tsx`, `connect-wallet.client.tsx` |
| Trade | `app/_components/trade/trade-wrapper.client.tsx`, `order/order.client.tsx`, `details/details.client.tsx`, `ticker-wrapper.client.tsx` |
| Wallet / lend | `app/(main)/wallet/page.tsx`, `**/transaction-history/data-table.tsx`, `**/account-summary/data-table.tsx`, `app/(main)/lend/page.tsx`, `app/_components/trade/details/tables/lend-*/**` |
| Onboarding / task flows | `app/_components/deposit/deposit-flow.tsx`, `components/stepper.tsx`, `app/_components/registration/form.tsx`, `app/_components/verification/form.tsx`, `app/_components/deposit/verification-step.tsx` |
| Status / alerts / copy tasks | `app/_components/layout/relayer-status.client.tsx`, `components/toast.tsx`, `app/_components/deposit/copy-field.tsx`, route-level alert panels under `app/(main)/` |
| PnL display | `lib/components/pnl-display.tsx` |
| Trade detail cards | `app/_components/trade/details/tables/positions/positions-cards.client.tsx`, `open-orders/open-orders-cards.client.tsx`, `order-history/order-history-cards.client.tsx`, `trader-history/trader-history-cards.client.tsx` |
| Card/table toggle | `app/_components/trade/details/details.client.tsx` |
| Behavioral gates | `components/exchange-resource.tsx` |
| Trading dialogs | `components/edit-order-dialog.tsx`, `settle-limit-dialog.tsx`, `conditional-close-dialog.tsx`, `funding-history-dialog.tsx` |

---

*End of document.*
