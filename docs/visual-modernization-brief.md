# Twilight Pool — Visual Modernization Execution Brief

**Version:** 1.2  
**Status:** Governance-Compliant and Execution-Ready  
**Objective:** Improve visual consistency, mobile usability, and perceived product polish while strictly adhering to AGENTS.md, CLAUDE.md, .cursorrules, the Responsive Pattern Matrix, and Implementation Guardrails.

---

## 1. Mission

Refine the Twilight Pool UI to achieve a professional, production-grade visual standard without modifying business logic, APIs, or desktop layouts. All changes must comply with established responsive patterns and governance constraints.

---

## 2. Governance Constraints

### 2.1 Non-Negotiable Rules

- Do not modify application logic or data flow.
- Do not alter desktop layouts unless explicitly authorized.
- Do not introduce new patterns without approval.
- Reuse existing components and Tailwind tokens.
- Respect protected boundary components (e.g., trade wrapper).
- Execute changes one route at a time to avoid cascading impacts.

### 2.2 Allowed Changes

- Responsive refinements aligned with the matrix.
- Visual consistency improvements within existing patterns.
- Accessibility and usability enhancements.
- Bug-compatible UX corrections.
- Human-approved shared primitives.

---

## 3. Execution Tiers

### Tier 1 — Approved for Immediate Implementation

#### 3.1 Lend Tables: Mobile Polish Pass

**Status:** Already Implemented — Refine Only

**Files:**
- `app/_components/trade/details/tables/lend-orders/data-table.tsx`
- `app/_components/trade/details/tables/lend-history/data-table.tsx`

**Scope:**
- Audit existing `md:hidden` mobile layouts.
- Verify alignment with wallet mobile patterns.
- Normalize spacing, typography, and empty states.

**Acceptance Criteria:**
- No horizontal scrolling on mobile.
- Desktop rendering unchanged.
- Consistent styling with wallet tables.

---

#### 3.2 Popover Width Clamp

**Files:**
- `components/popover.tsx`

**Change:**
```
className={cn(
  "w-72 max-w-[calc(100vw-2rem)]",
  className
)}
```

**Acceptance Criteria:**
- Popovers never overflow on small screens.
- Desktop rendering remains unchanged.
- Matches responsive pattern matrix.

---

#### 3.3 Shared EmptyState Component

**Approved Exception:** New shared component authorized.

**File to Create:**
- `components/empty-state.tsx`

**Specification:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}
```

**Usage Locations:**
- Wallet tables
- Lend tables
- Orders and transactions
- Ledger and withdrawals

**Acceptance Criteria:**
- Eliminates duplicated empty-state markup.
- No behavioral changes.
- Visually consistent across the application.

---

#### 3.4 Onboarding Pages: Mobile Spacing Normalization

**Files:**
- `app/(main)/deposit/page.tsx`
- `app/(main)/withdrawal/page.tsx`
- `app/(main)/faucet/page.tsx`
- `app/(main)/registration/page.tsx`
- `app/_components/registration/form.tsx`

**Scope:**
- Apply mobile-only spacing refinements.

**Standards:**
- Outer padding: `max-md:px-4`
- Section spacing: `space-y-6`
- Minimum touch target: 44px

**Acceptance Criteria:**
- No layout redesign.
- Desktop unaffected.
- Forms stack cleanly on mobile.

---

#### 3.5 Mobile Semantic Action Button Normalization

**Scope:** Normalize existing mobile button treatments.

**Pattern:**
```
max-md:h-12
max-md:text-base
max-md:font-semibold
max-md:bg-{color}/10
max-md:text-{color}
max-md:active:bg-{color}/20
```

**Locations:**
- Trade forms
- Wallet actions
- Position cards
- Lend management interfaces

Verify LendManagement submit/action buttons before modifying. Only normalize mobile overrides if they currently diverge from the established shared button pattern.

**Acceptance Criteria:**
- Desktop styles remain unchanged.
- Consistent mobile behavior across modules.

---

#### 3.6 Mobile Gutter and Padding Consistency

**Scope:** Mobile-only refinements executed per route.

**Standards:**
- Outer padding: `max-md:px-4`
- Section spacing: `space-y-6`
- Card padding: `p-4`

**Applicable Routes:**
- Wallet
- Lend
- Trade
- Deposit
- Withdrawal
- Faucet
- Registration

**Constraints:**
- Do not modify `md:` or larger breakpoints.
- Execute independently per route.

---

### Tier 2 — Deferred

#### 3.7 Trade Page: Mobile Natural Scroll Layout

**Status:** DEFERRED — to be implemented in a future sprint.

**File:**
- `app/_components/trade/trade-wrapper.client.tsx`

**Objective:**
Remove nested scrolling and DragWrapper chrome on mobile while preserving dimension context required by chart, order forms, and details panel.

**Key Constraints:**
- Preserve the existing `windowWidth >= 996` desktop/orderbook threshold exactly.
- Do not modify desktop `ResponsiveGridLayout` behavior.
- Do not remove or bypass dimension context relied on by `useGrid()` consumers.

**Critical Implementation Requirement:**
`DragWrapper` currently provides `GridProvider`, and several children depend on `useGrid()`:
- `kline-chart.client.tsx` uses `width` and `height` for chart resize and axis layout
- `market.client.tsx` uses `width` for compact form logic
- `limit.client.tsx` uses `width` for compact form logic
- `details.client.tsx` uses `width` for card/table behavior

The mobile branch must preserve `GridProvider` or an equivalent measured dimension context for each panel. Removing DragWrapper chrome is the goal. Removing sizing context is not.

**Allowed Implementation Shape:**
- On mobile, replace DragWrapper shells with lightweight measured wrappers that:
  - render panels in natural document flow
  - provide a GridProvider-compatible width/height context
  - avoid fixed-height internal scroll containers
- Acceptable approaches:
  - a lightweight wrapper using `ResizeObserver`
  - a ref-measured container that feeds dimensions into `GridProvider`
  - another equivalent solution that preserves `useGrid()` behavior

**Conceptual Rendering Shape:**
```typescript
if (windowWidth < 996) {
  return (
    <div className="flex flex-col gap-4">
      <MeasuredGridPanel>
        <KLineChart />
      </MeasuredGridPanel>
      <MeasuredGridPanel>
        <Order />
      </MeasuredGridPanel>
      <MeasuredGridPanel>
        <DetailsPanel />
      </MeasuredGridPanel>
    </div>
  );
}
```

**Critical Validation Requirements:**
- `KLineChart` resizes correctly on mobile
- `market.client.tsx` and `limit.client.tsx` receive correct width behavior
- `details.client.tsx` switches card/table mode correctly
- `isTradesPanelVisible` localStorage behavior remains intact
- panel order remains unchanged
- desktop grid path remains pixel-identical

---

## 4. Deferred Enhancements (Out of Scope)

| Item | Reason |
|------|--------|
| Desktop navigation active-state styling | Desktop redesign — not authorized |
| Skeleton shimmer effects | Introduces new pattern not in matrix |
| Scroll-hint gradients on tables | Not defined in matrix |
| Withdrawal balance context header | Adds new functionality |
| Light mode token tuning | Requires brand approval |
| Dropdown active styling | Low-priority micro-refinement |
| Trade mobile natural-flow layout (§3.7) | Deferred — requires GridProvider handling |

---

## 5. Tracked UX and Functional Defects

### 5.1 Verification Page Empty Panel

**File:** `app/(main)/verification/page.tsx`

**Issue:** Primary form is commented out, leaving an empty container.

**Resolution Options:**
- Restore the form, or
- Replace with a "Coming Soon" placeholder.

### 5.2 Mobile Header Density

**Scope:**
- Normalize spacing and icon sizes.
- Improve truncation behavior.
- Maintain existing header elements per matrix definition.

---

## 6. Acceptance Criteria

### Global Requirements
- No changes to business logic or APIs.
- No desktop regressions.
- No modifications to protected thresholds.
- Compliance with governance files.

### Quality Gates
- `pnpm typecheck` passes.
- `pnpm build` succeeds.
- `pnpm lint` reports no new violations.

### Visual Validation
- 320px
- 375px
- 768px
- 1024px
- 1440px

---

## 7. Implementation Order

1. Popover width clamp
2. Shared EmptyState component
3. Lend tables mobile polish pass
4. Mobile gutter normalization (per route)
5. Mobile semantic action button normalization
6. Onboarding mobile spacing adjustments

---

## 8. Deliverables

The implementing agent must produce:
- Updated source files.
- A list of modified files.
- Before-and-after screenshots where the execution environment supports browser capture; otherwise provide manual verification at the specified breakpoints with a checklist of validated surfaces.
- A modernization summary including compliance confirmation.

---

## 9. Definition of Done

The modernization is complete when:
- Mobile usability issues are resolved.
- Visual consistency is achieved across routes.
- Desktop layouts remain unchanged.
- All quality gates pass.
- The interface reflects a professional, production-grade standard.
