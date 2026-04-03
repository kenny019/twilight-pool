# AGENTS.md

## 1. Project Intent

This repository is undergoing a UI/UX modernization pass for Twilight.

The goal is to:
- Improve responsiveness, usability, and consistency
- Align all UI with a system-level pattern architecture
- Enable mobile adaptation without breaking desktop behavior

This is a **UI modernization effort only**.

Do NOT:
- Change product behavior
- Change business logic
- Change API contracts
- Change route structure
- Introduce a new design language

---

## 2. Source of Truth (Strict Order)

Before making any UI decision, ALWAYS consult these documents in order:

1. docs/ui-pattern-extraction-and-modernization-audit.md
2. docs/ui-modernization-principles.md
3. docs/responsive-pattern-matrix.md
4. docs/implementation-guardrails.md

If there is ambiguity:
- Prefer the most conservative interpretation
- Do NOT improvise
- Ask for clarification or mark as requiring human approval

---

## 3. Core Execution Model

### 3.1 Strict by Default

- Assume all UI work is constrained
- If something is not explicitly allowed → treat it as disallowed

### 3.2 No Redesign

- This is NOT a redesign
- Do NOT introduce new visual styles
- Do NOT change component philosophy
- Do NOT "improve" UI beyond defined system rules

### 3.3 Human Approval Required

The following require explicit approval:

- New shared components
- Replacing existing primitives
- Changing visual language (colors, spacing systems, typography roles)
- Changing action hierarchy
- Changing overlay types for high-risk actions
- Large cross-file refactors

---

## 4. Non-Negotiable Rules

### 4.1 No Functional Changes

Do NOT change:
- Trading logic
- Order flow
- Wallet behavior
- Verification / registration flows
- Data fetching
- State transitions

UI may change. Behavior must not.

### 4.2 No Product Flow Changes

Do NOT:
- Add steps
- Remove steps
- Reorder logical flows
- Move critical actions behind new navigation

### 4.3 Preserve Data Contracts

- Do not change data shape
- Do not change prop contracts
- Do not duplicate data logic
- Mobile and desktop must use the same data source

### 4.4 Preserve Route Structure

- Do not create mobile-only routes
- Do not split or merge routes
- Do not restructure navigation

---

## 5. Desktop vs Mobile Rules

### 5.1 Desktop is Authoritative

- Desktop = canonical experience
- Do NOT simplify desktop to match mobile

### 5.2 Mobile Adapts from Desktop

Mobile may:
- Reorder
- Collapse
- Group
- Use sheets instead of panels

Mobile must NOT:
- Remove critical data
- Change meaning
- Introduce new flows

### 5.3 Data Parity is Mandatory

- All desktop data must remain accessible on mobile
- Allowed mechanisms:
  - Inline expand
  - Detail views
  - Sheets

### 5.4 Breakpoint System Rules

The responsive system uses a constrained breakpoint model.

Approved roles:
- `sm:` → typography only (never layout)
- `md:` → primary layout breakpoint
- `lg:` → limited use (header, ticker strip, header navigation only)
- `xl:` → card grid scaling only
- `max-md:` → approved mobile override pattern

Constraints:
- Do NOT introduce new breakpoints
- Do NOT use `sm:` for layout changes
- Do NOT expand `lg:` usage beyond approved areas
- Do NOT repurpose breakpoint roles

Behavioral constant:
- `showOrderbook` threshold at **996px** is a JS behavioral constant
- Do NOT change the value
- Do NOT convert it to a CSS breakpoint

---

## 6. Component and Pattern Rules

### 6.1 Prefer Existing Components

- Reuse shared primitives
- Extend before creating new

### 6.2 New Components Require Approval

Only allowed when:
- Existing components are insufficient
- Extension is not viable

### 6.3 PnL Rendering Must Use PnlCell

`PnlCell` is the exclusive renderer for all PnL values.

Do NOT:
- build custom PnL components
- manually style PnL values
- duplicate PnL formatting logic

Use existing variants:
- stacked
- inline
- responsive
- hero

### 6.4 Responsive First

- Prefer one responsive component
- Use breakpoints

### 6.5 Dual Layout is Exception

Dual layout is tightly restricted.

Currently approved:
- `PositionsCards` only

All other cases require explicit human approval.

If allowed, both layouts must share:
- same data
- same logic
- same actions

---

## 7. Visual and Brand Guardrails

### 7.1 No Design Drift

Allowed:
- Better spacing
- Touch improvements
- Safe-area handling

Not allowed without approval:
- New colors
- New typography roles
- New layout styles
- New button styles

### 7.2 Preserve Trading Identity

The UI must remain:
- Dense where needed
- Data-first
- Terminal-like
- Serious, not playful

### 7.3 Preserve Semantic Colors

Do NOT change meaning of:
- PnL colors
- Buy/Sell colors
- Risk states
- Alerts and warnings

---

## 8. Interaction Rules

### 8.1 Primary Action Visibility

- The next critical action must be visible
- Secondary actions may be under a visible entry (e.g. Manage)

### 8.2 Overlay Rules

- High-risk → Modal
- Medium → Sheet
- Low → Popover / Inline

### 8.3 Data vs Action

- Data → Inline expand
- Actions → Sheet or Modal

### 8.4 Safe Area Requirements

Mobile overlays that reach viewport edges must preserve safe-area padding.

Applies to:
- dialogs
- sheets/drawers
- toast surfaces

Use safe-area inset where applicable.

---

## 9. Tables, Cards, and Data

### 9.1 Table is Canonical

- Desktop uses tables

### 9.2 Cards are Mobile Adaptation

- Cards must map to same data

### 9.3 Data Type → Mobile Representation

Different data types map to specific mobile layouts:

- Trading data (positions, open orders, order history)
  → use cards on mobile

- Transactional data (wallet history, deposits, withdrawals, transfers)
  → use list rows (not cards)

Do NOT interchange these.

### 9.4 No Data Loss

- Do not remove fields
- Use expand if needed

### 9.5 Respect Dominant Hierarchy

- Positions → PnL
- Open Orders → Side + Price
- Order History → Outcome

---

## 10. Safe Refactor Rules

### 10.1 Keep Scope Local

- Only change relevant files

### 10.2 No Opportunistic Refactors

Do NOT include:
- Renaming
- Cleanup outside scope
- Store refactors

### 10.3 Preserve Logic Wiring

- Do not move logic
- Do not change handlers

### 10.4 Behavioral Boundary Components

The following components enforce product behavior and must not be structurally altered:

- `ExchangeResource`
  - must remain the outermost wrapper
  - do not move it inward
  - do not duplicate its logic

- Trade wrapper (`trade-wrapper.client.tsx`)
  - `showOrderbook` threshold at 996px is protected
  - do NOT change the value
  - do NOT convert to CSS

---

## 11. Required Workflow

Before implementing:

1. Identify pattern classification (use responsive-pattern-matrix as the source of truth)
2. Check matrix mapping
3. Confirm overlay and interaction rules

Before completing:

- Validate against all 4 docs
- Check data parity
- Check desktop integrity
- Check mobile adaptation

---

## 12. Common Violations

These are NOT allowed:

- Removing data on mobile
- Changing action priority
- Replacing shared components locally
- Introducing new UI patterns
- Simplifying desktop unnecessarily
- Creating mobile-only logic
- Breaking semantic colors
- Using wrong overlay type

---

## 13. Final Rule

When in doubt:

- Preserve behavior
- Preserve semantics
- Preserve desktop
- Reuse components
- Ask for approval

## 14. Stop Conditions

Stop and request human input if:

- The matrix does not clearly define the pattern
- A change would affect multiple routes or shared primitives
- A new component seems required
- The correct overlay type is unclear
- Data hierarchy is ambiguous
- Desktop vs mobile behavior conflicts