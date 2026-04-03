# Implementation Guardrails

## 1. Purpose

This document defines the execution rules for UI modernization work in this repo.

It is the operational layer that sits below:

- `docs/ui-pattern-extraction-and-modernization-audit.md`
- `docs/ui-modernization-principles.md`
- `docs/responsive-pattern-matrix.md`

It exists to ensure that implementation work by humans or agents does not introduce drift, accidental redesign, hidden behavior changes, or inconsistent responsive patterns.

This file is not a design document.  
It is a safety and execution contract.

---

## 2. Scope

These guardrails apply to all UI modernization work, including:

- component refactors
- responsive changes
- layout changes
- mobile adaptations
- pattern unification
- overlay behavior changes
- data presentation changes
- route-level UI cleanup

These guardrails do **not** authorize:

- business logic changes
- product flow changes
- data model changes
- API contract changes
- route architecture changes
- redesign of the brand system

---

## 3. Core Enforcement Model

### 3.1 Strict by default

UI modernization work is **strictly constrained**.

If a proposed change is not clearly allowed by the audit, principles, matrix, or this file, it should be treated as **disallowed until explicitly approved by a human**.

### 3.2 Human approval required for exceptions

The following always require explicit human approval:

- introducing a new shared component where an existing one could be extended
- replacing an existing primitive with a new implementation
- changing color usage beyond approved semantic and brand rules
- changing typography roles
- changing route structure
- changing action hierarchy
- changing overlay type for high-risk actions
- introducing mobile-only flows
- broad multi-file refactors beyond the approved task scope

### 3.3 Authoritative source hierarchy

Implementation decisions must follow this order:

1. `docs/ui-pattern-extraction-and-modernization-audit.md`
2. `docs/ui-modernization-principles.md`
3. `docs/responsive-pattern-matrix.md`
4. `docs/implementation-guardrails.md`

If guidance appears ambiguous, prefer the more conservative interpretation and request human approval.

This document operationalizes the above three sources and does not override them.

---

## 4. Non-Negotiable Rules

### 4.1 No functional behavior changes

UI modernization must not change:

- trading logic
- order flow
- confirmation logic
- wallet behavior
- verification behavior
- registration gating
- data fetching semantics
- live update behavior
- calculation logic
- state transitions

Presentation may change.  
Behavior may not.

### 4.2 No product flow changes

Do not introduce new product flows or alter existing ones.

Examples of prohibited changes:

- turning a one-step task into a multi-step flow
- changing when users see confirmation vs input surfaces
- moving critical actions behind new navigation layers
- changing the logical order of trade / deposit / withdrawal steps

### 4.3 Preserve data contracts

Do not change:

- prop contracts
- store contracts
- data shapes
- field meaning
- semantic mapping of values

Responsive alternates must derive from the **same underlying data source**.

### 4.4 Preserve route structure unless explicitly approved

Do not:

- move route ownership
- split routes
- merge routes
- convert route-level pages into new flow structures
- create “mobile-only routes”

Route-level UI may be reorganized visually, but route structure remains stable unless explicitly approved.

---

## 5. Desktop and Mobile Authority Rules

### 5.1 Desktop is authoritative

Desktop trading and data-dense layouts are the canonical product expression.

Do not simplify desktop to make it look more consistent with mobile.

### 5.2 Mobile adapts from desktop

Mobile may:

- reorder
- group
- collapse
- stage
- change overlay style where approved

Mobile may not:

- remove critical data
- alter meaning
- introduce new action semantics
- become the new source of truth for a pattern

### 5.3 Data parity is mandatory

If a field exists on desktop, it must remain available on mobile through:

- direct visibility
- inline expansion
- one approved detail interaction

Fields may be reorganized.  
They may not be silently dropped.

### 5.4 Breakpoint system rules

The responsive system uses a constrained and pre-defined breakpoint model.

Approved roles:
- `sm:` — typography only (not layout)
- `md:` — primary layout breakpoint
- `lg:` — limited use (header, ticker strip, header navigation)
- `xl:` — card grid scaling only
- `max-md:` — approved mobile override prefix

Constraints:
- Do NOT introduce new breakpoints
- Do NOT use `sm:` for layout changes
- Do NOT expand `lg:` usage beyond approved areas
- Do NOT repurpose breakpoint roles for new behaviors
- Do NOT use CSS to replicate behavioral thresholds

Behavioral constant:
- The `showOrderbook` threshold at **996px** is a JS behavioral constant
- Do NOT change the value
- Do NOT convert it into a CSS breakpoint

---

## 6. Component and Pattern Ownership

### 6.1 Prefer existing shared primitives

Default rule:

- reuse existing shared components
- extend existing primitives where appropriate
- align route-level compositions to shared patterns

Do not create new components just because it is faster.

### 6.2 New components require approval

A new shared primitive or replacement component may only be introduced when:

- the current primitive is genuinely insufficient
- extension would be more harmful than replacement
- the human explicitly approves the change

### 6.3 PnL rendering must use PnlCell

`PnlCell` (lib/components/pnl-display.tsx) is the exclusive renderer for all PnL values.

Do not:
- build custom PnL display components
- manually style PnL values
- duplicate PnL formatting logic

Allowed variants:
- stacked
- inline
- responsive
- hero

All PnL presentation must be derived from `PnlCell`.

### 6.4 Prefer responsive variants over separate implementations

Default rule:

- use one responsive component
- use breakpoint-scoped variants
- keep logic unified

### 6.5 Separate desktop/mobile branches are exceptions

Separate presentation branches are allowed only when all of the following are true:

- the surface is high-complexity or data-dense
- a single responsive tree would be materially worse to maintain
- both branches share:
  - the same data source
  - the same semantics
  - the same action wiring

This exception is expected mainly on advanced trading surfaces.

Currently approved dual-layout pattern:
- `PositionsCards` only

All other patterns require explicit human approval before introducing separate desktop/mobile DOM branches.

### 6.6 Implement at the lowest appropriate shared layer

Pattern changes should be made at the lowest shared layer that safely captures the pattern.

Preferred order:

1. shared primitive
2. shared route-level composition
3. route-specific implementation

Do not solve a shared problem with repeated local hacks.

---

## 7. Visual and Brand Guardrails

### 7.1 No redesign by default

Do not redesign the UI under the label of modernization.

Modernization means:

- better responsiveness
- better touch ergonomics
- better spacing
- cleaner adaptation
- better clarity

It does **not** mean:

- new visual language
- new button philosophy
- new brand expression
- flatter consumer-finance styling
- generic SaaS restyling

### 7.2 Visual drift is tightly controlled

Small visual refinements are allowed only when they improve usability and remain aligned with the existing brand system.

Examples of acceptable refinement:

- mobile touch target sizing
- safe-area padding
- breakpoint-specific spacing
- improving truncation and overflow handling

Examples requiring approval:

- new color usage rules
- changing border language
- changing typography hierarchy
- changing core panel look
- changing button visual identity

### 7.3 Preserve terminal / trading identity

The product must remain:

- dense where appropriate
- numeric-first
- panel-oriented
- serious
- semantically legible

Do not flatten the product into a generic fintech or consumer UI.

### 7.4 Preserve semantic state language

Do not change the meaning or visual logic of:

- PnL colors
- buy/sell colors
- risk states
- alert states
- confirmation states
- relayer / status badges

Semantic consistency is part of product trust.

---

## 8. Interaction and Overlay Guardrails

### 8.1 Primary next action must remain obvious

The user’s next critical action must be visible without requiring exploration.

Critical sub-actions may sit behind one visible entry point such as:

- Manage
- Edit
- Details

But they must not disappear behind deeper navigation.

### 8.2 Secondary actions must remain one interaction away

If a secondary action is collapsed, it must remain accessible in one interaction.

Do not create nested menus or multi-step access for trading actions.

### 8.3 Overlay selection must follow risk level

Approved overlay model:

- High-risk actions → modal/dialog
- Medium-complexity contextual tasks → sheet/drawer
- Lightweight informational context → popover / inline

Do not change overlay type based on convenience alone.

### 8.4 Inline expansion is preferred for reading; sheets/modals for acting

General rule:

- data reveal → inline expand or explicit details
- action workflows → sheet or modal based on risk

Do not overuse sheets for passive information or modals for low-risk contextual browsing.

### 8.5 Safe-area handling for mobile overlays

Mobile overlays that reach the viewport edge must preserve safe-area insets.

Applies to:
- dialogs
- drawers / sheets
- toast surfaces

Requirement:
- include bottom safe-area padding using `env(safe-area-inset-bottom)` where applicable

This is a required mobile adaptation, not optional.

---

## 9. Tables, Cards, and Data Presentation

### 9.1 Table is canonical

For structured datasets, table structure is canonical.

Desktop remains table-first unless a route already defines an approved alternate.

### 9.2 Cards are adaptive presentation

Cards are an adaptive mobile presentation for dense or action-heavy records.

Cards must map directly to the same canonical data model.

### 9.3 Trading data vs transactional data presentation

Different data categories use different mobile representations:

- Trading and position data (positions, open orders, order history)
  → use card-based layout on mobile

- Transactional data (wallet history, transfers, deposits, withdrawals)
  → use list-row layout on mobile (not cards)

Do not interchange these representations.

### 9.4 No card-only data

Do not introduce data into cards that does not exist in the canonical dataset.

Do not omit canonical fields from cards without an approved alternate reveal.

### 9.5 Dominant field hierarchy must be preserved

Where the matrix defines dominant fields, implementation must preserve them.

Examples:

- Positions → PnL dominant
- Open Orders → Side + Price dominant
- Order History → Outcome dominant

Do not improvise new dominance rules locally.

---

## 10. Safe Refactor Scope

### 10.1 Localized changes by default

Only touch files directly relevant to the assigned pattern or route.

Do not widen scope unless explicitly approved.

### 10.2 No opportunistic refactors

Do not mix these into UI modernization work unless explicitly requested:

- unrelated cleanup
- renaming sprees
- store refactors
- utility rewrites
- style system rewrites
- unrelated accessibility refactors
- dependency swaps

### 10.3 Preserve existing logic wiring

Do not change:

- event handler source
- action dispatch source
- store ownership
- calculation source
- gating logic placement

Unless explicitly approved.

### 10.4 Preserve behavioral boundary components

Be especially careful around components that sit on the UI / behavior boundary, including:

- `ExchangeResource`
- trade dialogs
- confirmation components
- route-level wrappers with responsive thresholds
- any component combining presentation with access gating

These may look like UI components but often encode real product rules.

Additional constraints:

- `ExchangeResource` must remain the outermost wrapper for any trigger it gates
  - do not move it inward
  - do not duplicate its logic

- The `showOrderbook` threshold in `trade-wrapper.client.tsx` at 996px is a protected behavioral constant
  - do not change the value
  - do not move it to CSS

---

## 11. Required Implementation Process

### 11.1 Classify before changing

Before implementation begins, identify the target pattern’s classification from the audit:

- Keep
- Refine
- Adapt
- Replace

If this is not known, implementation should not proceed.

The responsive pattern matrix pre-classifies all known patterns. If the target pattern exists in the matrix, use that classification directly and do not re-derive it.

### 11.2 Check matrix before changing pattern behavior

Before changing any responsive or interaction behavior, verify:

- canonical structure
- approved mobile expression
- overlay type
- dominant field
- whether dual layout is allowed

### 11.3 Document cross-impact

For any shared or semi-shared change, note likely impact on:

- desktop
- mobile
- route siblings
- shared primitives
- semantic consistency

### 11.4 Validate against all three layers

Before considering a task complete, verify against:

- audit
- principles
- responsive matrix

---

## 12. Common Violations

The following are considered violations even if the UI “looks better”:

- silently removing desktop fields on mobile
- changing action priority without approval
- replacing a shared primitive locally
- introducing new visual language
- simplifying desktop density for consistency
- creating mobile-only business logic
- duplicating data derivation across mobile and desktop branches
- changing status color meaning
- changing confirmation severity by switching modal → sheet without approval
- introducing new layouts that contradict the matrix
- treating route-specific convenience as a reason to bypass shared patterns

---

## 13. Review Checklist for Implementers and Auditors

Before shipping a UI modernization change, confirm:

- [ ] No functional behavior changed
- [ ] No product flow changed
- [ ] Route structure is unchanged
- [ ] Existing data contracts are preserved
- [ ] Desktop remains authoritative
- [ ] Mobile adapts without losing data
- [ ] Shared primitives were reused where possible
- [ ] Any dual-layout branch is explicitly justified
- [ ] Overlay choice matches risk level
- [ ] Semantic color/state language is preserved
- [ ] Trading terminal identity is preserved
- [ ] No unapproved visual drift was introduced
- [ ] The pattern's matrix row was consulted and followed (canonical structure, mobile expression, overlay type, dominant field)
- [ ] The pattern classification from the audit was respected
- [ ] Cross-impact was considered and documented

---

## 14. Final Rule

When in doubt:

- preserve behavior
- preserve semantics
- preserve desktop
- preserve shared primitives
- preserve brand identity
- ask for approval before expanding scope