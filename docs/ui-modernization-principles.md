# UI Modernization Principles

**Companion document to:** `docs/ui-pattern-extraction-and-modernization-audit.md`

**Relationship:** The audit defines *what* the current system is. This document defines *how* implementation decisions are made. Do not repeat or replace the audit — use it as the factual baseline this document operates against.

---

## 1. Purpose

This document governs decision-making during UI modernization. It exists to prevent three failure modes:

1. **Scope creep** — UI changes that cross into product behavior, data structure, or user flow
2. **Identity erosion** — Responsive adaptations that simplify the trading terminal into a generic consumer layout
3. **Data drift** — Mobile presentations that show different data, different state, or trigger different logic than desktop

Every implementation decision must be traceable to a rule in this document or a classification in the audit.

---

## 2. System Philosophy

### Desktop is authoritative

The desktop trading terminal is the reference implementation. Mobile does not define its own information architecture. Mobile adapts, reorganizes, and restructures — it does not redesign.

### Mobile restructures, it does not simplify

A mobile view may collapse, group, stage, or reorder information. It must not remove it. Reducing visible data to reduce complexity is a failure, not a feature.

### Same data, reorganized

Every field visible on desktop must be accessible on mobile — either directly visible, one interaction deep (expand, tab, sheet), or available through an explicit detail expansion that preserves the same underlying value. Fields are never silently absent.

### Terminal identity is protected

The Twilight trading interface is dense, numeric-first, and serious. Modernization improves usability within that identity. It does not pursue a consumer-finance aesthetic as a side effect of responsiveness work.

---

## 3. Non-Negotiables


These must not change without explicit design sign-off. They are the locked constants defined in the audit (Section 2).

**Brand policy:** The visual identity is preserved with controlled, usability-driven refinement. Modernization must not result in a redesign or introduce a new visual language.

### Visual identity

| Constant | What it means in practice |
|----------|---------------------------|
| HSL color system | Do not replace CSS variable references with hardcoded values. Do not add new semantic colors. |
| Theme accent switching | `text-theme`, `border-theme`, `bg-theme/*` must remain the accent expression. No alternative accent classes. |
| Light/dark mode | All color decisions are made via `html.dark` / `html.light` class inheritance. No inline dark mode logic. |
| Primary button language | `.btn-primary` / `.btn-secondary` gradient pseudo-elements and `rounded-default` are locked. Do not restyle `Button` variants. |
| Font roles | Inter for body, Instrument Serif for display/feature, Roboto Mono for numeric/UI. Assignments are locked. |
| Status semantics | `text-green-medium` (positive/LONG), `text-red` (negative/SHORT/loss), yellow (warnings). These meanings cannot be reassigned or used decoratively. |

### Structural constants

| Constant | What it means in practice |
|----------|---------------------------|
| Trading layout engine | `react-grid-layout` + `DragWrapper` on desktop. The `showOrderbook` JS threshold at ~996px is a behavioral constant — do not change it during style-only work. |
| Radix UI primitives | Dialog, Popover, Tabs, Select, Toast, Checkbox, DropdownMenu, Separator, Slider, Slot, Switch are the accessibility and keyboard behavior baseline. Do not replace with custom implementations. |
| PnlCell layout modes | `stacked`, `inline`, `responsive`, `hero` are a design contract. New consumers select from existing modes. The semantic coloring (`text-green-medium` / `text-red` / `text-primary/40`) is locked. |
| ExchangeResource gating | `components/exchange-resource.tsx` wraps triggers to enforce BTC registration/verification. This wrapping must survive any refactoring of action entry points. |

### Behavioral constants

- API contracts, data structures, and business logic are out of scope. No changes to what data is fetched, stored, or transmitted.
- User flows (registration, verification, deposit, withdrawal, trade) must remain structurally unchanged. Responsive adaptations may reorder UI within a step; they may not add, remove, or resequence steps.
- `ExchangeResource` intercept behavior must not be bypassed or restructured during UI changes.

---

## 4. Adaptation Rules

These are the dimensions that **can** change. They correspond to the adaptive variables in audit Section 2.

### What can change

| Variable | Allowed change | Constraint |
|----------|----------------|------------|
| Spacing scale | Converge `p-*`, `gap-*`, `mx-*` to a consistent per-breakpoint set | Do not change spacing on trading panels without verifying density |
| Touch targets | Increase `min-h-*` / `min-w-*` on interactive elements at `max-md:` | Scope to `max-md:` only; do not inflate desktop targets |
| Table vs card | Add card/list presentation at `max-md:` for data tables | Same data source; same columns; same actions. See Section 8. |
| Popover/dialog width | Clamp to `max-w-[min(100vw-2rem,18rem)]` or equivalent | Internal content must not be clipped; allow scroll if needed |
| Chart height | Reduce `min-height` on small `dvh` only | Do not change chart behavior, controls, or data |
| Scroll ownership | Normalize nested scroll; add scroll hints where scrollable content is non-obvious | Do not remove scroll from data-dense widgets; make scroll explicit, not invisible |
| Safe-area handling | Add `env(safe-area-inset-*)` padding where missing (toasts, drawers, fixed footers) | Do not assume safe-area is already applied — verify per component |

### Presentation changes that are permitted

- Responsive padding and gutters
- Mobile-specific layout reordering (stacking, collapsing, grouping) using `max-md:` / `md:` / `hidden`
- Touch target sizing scoped to `max-md:`
- Overlay width clamping
- Scroll hint additions (gradient fades, scroll indicators)
- Tab label shortening at narrow widths
- Chart height adjustments on narrow viewports

### Presentation changes that are not permitted

- Changing what data a component receives or displays
- Adding or removing fields from any view
- Restructuring user flows
- Changing overlay trigger logic
- Changing status color semantics
- Changing font assignments
- Changing button variant styles

---

## 5. Pattern Decision Framework

### Keep / Refine / Adapt / Replace

Use the classification vocabulary from audit Section 2 consistently:

| Label | When to use | What changes | What doesn't |
|-------|-------------|--------------|--------------|
| **Keep** | Pattern works on all devices; only token-level cleanup needed | Token references only | Everything else |
| **Refine** | Pattern is correct; spacing, sizing, or consistency is off | Spacing, touch targets, border/bg opacity | Pattern structure, data, behavior |
| **Adapt** | Pattern works on desktop; needs responsive restructuring | Layout, density, composition | Data, semantics, business behavior |
| **Replace** | Presentation is wrong for the viewport; alternate form needed | Presentation component | Data source, column definitions, action wiring |

When in doubt between Refine and Adapt: if the change requires a new CSS breakpoint condition or a new layout composition, it is Adapt. If it is a sizing or spacing tweak to existing structure, it is Refine.

### Overlay type selection

Choose the overlay type by task category:

| Task type | Overlay | Rationale |
|-----------|---------|-----------|
| High-stakes confirmation (close position, withdraw, transfer) | **Modal (Dialog)** | Requires explicit focus; blocks background interaction |
| Multi-step, parameter-adjustment, or contextual task work that should preserve background context (orderbook view, editing parameters, managing positions) | **Sheet (drawer)** | Non-blocking; dismissible without commitment |
| Lightweight context or status detail (relayer reason, pool shares info, copy address) | **Popover** | Minimal interruption; anchored to trigger |

Do not use a modal where a sheet suffices. Do not use a popover where a modal is required.

### Component architecture: single vs dual-layout

**Default: single responsive component.** Use `max-md:` / `md:` Tailwind variants to express layout differences in one component tree.

**Allowed exception: dual-layout (separate desktop/mobile DOM blocks).** Use only when:
- The surface is data-dense enough that responsive variants would produce an unreadable component (e.g., PositionsCards)
- Desktop and mobile have fundamentally different information hierarchies for the same data
- Shared derivation, action wiring, and semantic markup are preserved — only presentation diverges

When dual-layout is used, the requirement is:
- Same data source and data derivation
- Same action handlers (no mobile-only logic)
- Same semantic color and status meaning
- Desktop block: `hidden md:block`; mobile block: `block md:hidden`

Dual-layout is a concession, not a pattern to extend. New surfaces should default to single responsive component.

---

## 6. Responsive Behavior Model

### Breakpoint hierarchy

| Breakpoint | Scope in this codebase | Use for |
|------------|------------------------|---------|
| `sm:` | Typography only (Text component) | Heading size steps — do not use for layout |
| `md:` | Primary layout breakpoint | Panel visibility, grid columns, spacing, form layout |
| `lg:` | 3 files only: header, ticker, trade-wrapper | Desktop nav visibility, trade grid — do not add new `lg:` usage outside these areas without audit |
| `xl:` | Card grids only (4 card variant files) | `xl:grid-cols-2` for card density — do not use for general layout |
| `max-md:` | Mobile-specific overrides | Touch targets, mobile-only layout variants, soft-fill buttons |
| `996px` JS | `showOrderbook` in trade-wrapper | Behavioral panel switch — not a CSS breakpoint |

**Rule:** Do not introduce new `lg:` or `xl:` breakpoint usage outside its current scope without documenting the reason. This prevents breakpoint drift.

### Mobile-first override pattern

Prefer `max-md:` over duplicating components. The pattern:

```
{base desktop style} max-md:{mobile override}
```

is preferable to separate mobile/desktop component files. Reserve separate files for dual-layout exceptions (see Section 5).

### Viewport and safe area

- Use `100dvh` for full-height panels, not `100vh`
- Apply `env(safe-area-inset-bottom)` on: fixed/sticky bottom elements, drawers, toast viewport
- Apply `env(safe-area-inset-top)` on: fixed headers if added in future
- `viewportFit: "cover"` is already set on the root layout — honor it in component-level fixed positioning

### 320px floor

Every responsive expression must remain operable at 320px logical width. This is not a target; it is a minimum. Do not rely on horizontal scroll as the only fallback for narrow viewports.

---

## 7. Interaction Rules

### Touch targets

- Primary interactive elements on touch-first paths: minimum **44×44 CSS px**
- Apply via `min-h-[44px]` / `min-w-[44px]` scoped to `max-md:` — do not inflate desktop
- Use `touch-manipulation` on elements subject to repeated taps (steppers, increment/decrement)
- Icon-only buttons: `p-3 min-h-[44px] min-w-[44px]` via `size="icon"` on `Button`

### Action visibility

- **Primary actions** must be immediately visible in a way that makes the user's next critical action obvious without interaction. They must not be hidden behind navigation layers or require hover to appear.
- **Secondary actions** (edit, funding history, SL/TP management) may be collapsed or placed in a dropdown/sheet — but must be reachable in exactly **one interaction** (one tap). No secondary critical action requires two taps.
- On mobile, the "Manage" dialog pattern (as used in PositionsCards) is the approved mechanism for collapsing secondary trade actions into one-tap access.

### Hover policy

- Hover states enrich desktop interactions. They are not required for functionality.
- Any affordance that is hover-only on desktop must have an equivalent visible-by-default state on mobile.
- Tooltip/info popovers triggered by hover must also respond to tap.

### Pointer type

- Do not gate critical functionality on pointer type (mouse vs touch)
- CSS `pointer: fine` / `pointer: coarse` media queries are not used in this codebase and should not be introduced

---

## 8. Data Integrity Rules

### Table is canonical

Tables are the authoritative structure for data display. They define the column set, data types, sort order, and action affordances. Card views are a presentation adaptation of the same data — they do not define their own schema.

### Card fields must map to table columns

Every field shown in a card view must have a corresponding column in the table view of the same data. Cards may group or reorder fields, but may not introduce fields that are absent from the table, or omit fields that are present in the table without making them accessible via expand/detail.

### No data loss on any viewport

A user on a 320px device must be able to access all the same data as a user on a 1440px display. Access may require one additional interaction (expand, detail section, tab), but the data must be present.

### Same data source

Desktop and mobile presentations of the same data must derive from the same store, query, or component prop. Do not introduce separate data-fetching paths for mobile views.

### No mobile-only business logic

Action handlers, validation rules, and state transitions must be identical across breakpoints. Presentation logic (CSS classes, component selection, layout) may vary. Business logic may not.

### PnlCell layout modes are a display contract

When consuming `PnlCell`, select the appropriate existing layout mode:
- `stacked` for table cells
- `inline` for desktop card rows
- `responsive` for mixed-breakpoint contexts
- `hero` for mobile full-width feature display

Do not pass raw PnL values to custom display components — use `PnlCell`. Do not add a fifth layout mode without updating the audit.

---

## 9. Implementation Guardrails

### Classification requirement

No implementation should begin without identifying the target pattern’s classification (Keep / Refine / Adapt / Replace) from the audit. This ensures changes remain aligned with the audited system.


### Layer order

Changes must be made at the lowest shared layer:

1. `components/` — shared primitives. Changes here affect every consumer.
2. `app/_components/` — route-scoped compositions. Changes here affect the route family.
3. `app/(main)/` — page-level. Changes here are isolated.

A pattern that appears in 2+ routes belongs in `app/_components/` or `components/`, not duplicated per route.

### Scoping mobile overrides

Mobile-specific changes must be scoped. Accepted patterns:

- `max-md:` Tailwind prefix on existing elements
- `md:hidden` / `hidden md:block` for visibility toggles
- Separate `block md:hidden` / `hidden md:block` blocks only for approved dual-layout cases

Do not introduce breakpoint logic in JavaScript (e.g., `useWindowWidth` hooks) for presentation-only decisions that can be expressed in CSS. The exception is the existing `showOrderbook` threshold in `trade-wrapper.client.tsx`, which is a behavioral constant and must not be moved to CSS.

### JS threshold protection

The `showOrderbook` threshold (~996px) in `trade-wrapper.client.tsx` is a behavioral switch, not a style. During any responsive work touching the trade surface:

- Do not change the threshold value
- Do not move the logic to a CSS breakpoint
- Do not conditionally render different data based on this threshold (it controls layout composition, not data)

If this threshold must change, it requires explicit approval and coordinated CSS + JS update.

### ExchangeResource preservation

`ExchangeResource` wraps interactive triggers in trade order forms and subaccount select. When refactoring any of these entry points:

- The wrapper must remain the outermost element around the trigger
- The trigger must remain a `DialogTrigger`-compatible child
- Do not restructure the parent tree in a way that breaks the `asChild` Slot composition

### Breakpoint documentation

When introducing a new CSS breakpoint usage, document it. Tailwind breakpoints and JS composition thresholds must be known together to avoid drift (per audit Section 7).

**Reference pattern:**  
The validated `PositionsCards` implementation is the current reference pattern for mobile trading cards and managed action flows.
---

## 10. Anti-Patterns

These are explicitly forbidden. Each is grounded in a risk identified in the audit (Section 9).

| Anti-pattern | Why forbidden |
|--------------|---------------|
| **Consumer-finance simplification** | Removing grid density, replacing numeric emphasis with large cards, or adding generous whitespace to the trade surface erodes the terminal identity. The audit calls this out as a named risk. |
| **Data removal as simplification** | Removing columns, fields, or stats from mobile to reduce complexity is data loss. Reorganize instead. |
| **New UX flows for mobile** | Do not add steps, screens, or navigational layers to mobile that do not exist on desktop. Responsive restructuring operates within existing flows. |
| **Semantic color reuse** | Do not use `text-green-medium` or `text-red` for non-semantic purposes (decorative highlights, categories). These are risk and PnL indicators. |
| **Hover-gated critical information** | Do not place trading-critical information (position status, order state, warnings) behind hover-only states. |
| **Replacing Radix primitives** | Do not replace Dialog, Popover, Tabs, Select, Toast, Checkbox, Slider, Switch, Separator, or DropdownMenu with custom implementations. Accessibility and keyboard behavior are inherited from Radix. |
| **JS breakpoints for presentation** | Do not use `useWindowWidth` or similar hooks to drive layout decisions that can be expressed with CSS breakpoints. The sole exception is the existing `showOrderbook` threshold. |
| **Silently changing the 996px threshold** | If the trade layout split changes, it must be documented as a behavioral change, not treated as a style tweak. |
| **Mobile-only action handlers** | Action wiring must be identical on mobile and desktop. Do not add mobile-specific conditions to submit handlers, validators, or store mutations. |
| **Bypassing ExchangeResource** | Do not restructure trade entry point triggers in a way that removes the `ExchangeResource` wrapper. This bypasses the BTC registration/verification gate. |
| **Adding new color tokens** | Do not introduce new CSS variables or Tailwind color tokens without audit-level documentation. New tokens become undocumented brand drift. |
| **Orphan breakpoint additions** | Do not add `lg:` or `xl:` breakpoint usage outside the files where they currently exist without explicit justification. These breakpoints have narrow scope in this codebase. |

---

## 11. Decision Checklist

Run this before implementing any UI change.

### Scope

- [ ] Is this change limited to visual presentation, layout, spacing, or interaction? If it touches data, logic, or flow — stop.
- [ ] Does it affect any locked constant from audit Section 2? If yes — stop unless there is explicit design approval.
- [ ] Is it covered by the Keep/Refine/Adapt/Replace classification in the audit (Section 4)? Use that classification.

### Data

- [ ] Does the change preserve all data visible in the current implementation?
- [ ] If introducing a mobile alternate (card, list), does every field map to an existing table column or expandable detail?
- [ ] Is the data source shared between desktop and mobile presentations?

### Behavior

- [ ] Are all action handlers identical between desktop and mobile?
- [ ] Is `ExchangeResource` still wrapping the appropriate triggers?
- [ ] Is the `showOrderbook` JS threshold unchanged?
- [ ] Are Radix primitive behaviors (keyboard, focus, dismiss) preserved?

### Interaction

- [ ] Are primary actions immediately visible without any interaction on all viewports?
- [ ] Are secondary actions reachable in one interaction on mobile?
- [ ] Are touch targets ≥ 44px on primary paths at `max-md:`?
- [ ] Are any hover-only affordances given a visible-by-default mobile fallback?

### Component architecture

- [ ] Is the change made at the lowest shared layer (prefer `components/` over `app/_components/` over page level)?
- [ ] If dual-layout DOM is used, does it share data source, action handlers, and semantic markup?
- [ ] Are mobile-specific styles scoped to `max-md:` and not bleeding into desktop?

### Identity

- [ ] Does the result still read as a trading terminal, not a consumer finance app?
- [ ] Are status semantic colors used with their defined meanings only?
- [ ] Are `tabular-nums` and `font-ui` (Roboto Mono) preserved on numeric data?

---

*This document is a decision framework, not a feature specification. It does not describe what the UI will look like — it defines what constraints any implementation must satisfy.*
