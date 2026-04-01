

# UI Review Checklist

## 1. Purpose

This checklist is the review contract for UI modernization work in the Twilight frontend.

It is used to verify that a change:
- follows the audited system
- follows the responsive pattern matrix
- preserves behavior and data integrity
- does not introduce local drift, accidental redesign, or hidden regressions

This checklist is for review and verification.
It is not a design brief and it is not an implementation guide.

---

## 2. Review Mode (Critical)

You are a strict system reviewer.

You MUST:
- flag violations clearly
- reference the violated source when possible (`AGENTS.md`, `docs/responsive-pattern-matrix.md`, `docs/implementation-guardrails.md`, or other companion docs)
- prioritize behavior, structure, and system integrity over visual preference
- identify both direct violations and likely drift risks

You MUST NOT:
- suggest redesigns unless explicitly requested
- invent new patterns during review
- reinterpret approved patterns
- approve partial compliance as if it were full compliance

This is a verification pass, not a design pass.

---

## 3. Required Review Inputs

Before reviewing a change, consult:

1. `AGENTS.md`
2. `docs/ui-pattern-extraction-and-modernization-audit.md`
3. `docs/ui-modernization-principles.md`
4. `docs/responsive-pattern-matrix.md`
5. `docs/implementation-guardrails.md`

If the reviewed change touches a specific pattern family, also consult the corresponding matrix row and any relevant deep-dive section.

---

## 4. Review Outcome Format

For each review, produce findings using this structure:

### 4.1 Pass / Fail summary
- Pass
- Pass with concerns
- Fail

### 4.2 Findings grouped by severity
- Critical
- Major
- Minor

### 4.3 Each finding should state
- what is wrong
- what rule or source it violates
- where it appears (file / component / route)
- whether it is behavior-risk, system-drift risk, or presentation-only

---

## 5. System and Behavior Review

- [ ] No functional behavior changed
- [ ] No product flow changed
- [ ] No route structure changed without approval
- [ ] No data contracts changed
- [ ] No business logic was moved under the label of UI work
- [ ] State transitions, gating, and confirmations still behave the same

### Critical checks
- [ ] `ExchangeResource` behavior is preserved
- [ ] `ExchangeResource` remains the outermost wrapper where applicable
- [ ] No trigger gating logic was duplicated locally
- [ ] Trade / confirmation dialogs were not restructured in a way that changes logic
- [ ] `showOrderbook` threshold remains at **996px** and is still JS-driven
- [ ] No behavioral threshold was silently moved into CSS

---

## 6. Pattern Identification and Matrix Compliance

- [ ] Pattern identified correctly
- [ ] Pattern matched to the exact row in `docs/responsive-pattern-matrix.md` (no approximation)
- [ ] Matrix classification was respected (`Keep / Refine / Adapt / Replace`)
- [ ] Canonical structure was followed
- [ ] Approved mobile expression was followed
- [ ] Approved overlay type was followed
- [ ] Approved dominant field hierarchy was followed
- [ ] No local route-specific pattern was introduced that conflicts with the matrix

---

## 7. Desktop vs Mobile Integrity

- [ ] Desktop remains authoritative
- [ ] Desktop layout was not simplified just to help mobile
- [ ] Mobile adapts from desktop rather than redefining the pattern
- [ ] No desktop data was lost on mobile
- [ ] No mobile-only flow or business logic was introduced
- [ ] Any mobile adaptation is structurally consistent with the principles doc

### Data parity checks
- [ ] All desktop fields remain accessible on mobile
- [ ] Hidden fields use approved reveal methods (inline expand, detail view, sheet where appropriate)
- [ ] No field is silently dropped

---

## 8. Responsive System Review

### Breakpoint rules
- [ ] `sm:` is used for typography only, not layout
- [ ] `md:` remains the main layout breakpoint where expected
- [ ] `lg:` usage was not expanded beyond approved areas without approval
- [ ] `xl:` is not repurposed outside approved card-grid scaling behavior
- [ ] `max-md:` is used correctly for mobile override patterns
- [ ] No new breakpoint semantics were introduced

### Threshold and responsive behavior
- [ ] The 996px trade-layout threshold was not changed
- [ ] No CSS breakpoint was introduced to mimic protected JS behavior
- [ ] Breakpoint use remains aligned with the responsive matrix

---

## 9. Tables, Cards, Lists, and Data Presentation

### Canonical structure
- [ ] Tables remain canonical for structured datasets
- [ ] Cards map correctly to canonical table data
- [ ] No card-only data was introduced
- [ ] No canonical table field became inaccessible in cards

### Mobile presentation rules
- [ ] Trading data uses cards on mobile where the matrix requires it
- [ ] Transactional data uses list rows on mobile where the matrix requires it
- [ ] Trading and transactional presentation models were not mixed incorrectly

### Dominance rules
- [ ] Positions still lead with PnL
- [ ] Open Orders still lead with Side + Price
- [ ] Order History still leads with Outcome
- [ ] Dominant field also drives visual emphasis where required

### PnL enforcement
- [ ] All PnL rendering uses `PnlCell`
- [ ] No custom PnL renderer was introduced
- [ ] Existing `PnlCell` mode selection is appropriate (`stacked`, `inline`, `responsive`, `hero`)

---

## 10. Components, Reuse, and Layout Ownership

- [ ] Existing shared components were reused where expected
- [ ] Shared primitives were extended instead of bypassed
- [ ] No unnecessary new component was introduced
- [ ] No route-specific hack replaced a shared pattern
- [ ] Pattern changes were implemented at the lowest reasonable shared layer

### Dual-layout controls
- [ ] No new dual-layout desktop/mobile branch was introduced without approval
- [ ] If dual-layout exists, it is the approved case (`PositionsCards`) or explicitly approved
- [ ] Dual-layout branches still share the same data, semantics, and action wiring

---

## 11. Interaction and Overlay Review

### Action visibility
- [ ] The next critical action remains obvious without interaction
- [ ] Secondary actions remain accessible in one interaction where required
- [ ] No nested or delayed access was introduced for critical trading actions

### Overlay hierarchy
- [ ] High-risk actions still use modal/dialog
- [ ] Medium-complexity contextual tasks still use sheet/drawer
- [ ] Lightweight informational context still uses popover/inline treatment
- [ ] Overlay choice was not changed for convenience alone

### Data vs action separation
- [ ] Data reveal uses approved inline/details patterns
- [ ] Action workflows use sheet/modal as defined
- [ ] The review does not find sheets being used as a substitute for clear data presentation

### Safe area
- [ ] Mobile overlays preserve bottom safe-area handling where applicable
- [ ] Toast surfaces preserve safe-area handling where applicable

---

## 12. Visual and Semantic Integrity

- [ ] No unapproved visual drift was introduced
- [ ] Twilight brand identity remains intact
- [ ] Trading terminal tone remains intact
- [ ] Dense / numeric-first surfaces were not flattened into generic fintech UI
- [ ] Typography roles remain consistent
- [ ] Semantic state language remains intact

### Semantic color checks
- [ ] PnL colors still mean the same thing
- [ ] Buy / Sell colors still mean the same thing
- [ ] Risk / warning / confirmation colors still mean the same thing
- [ ] Status badges and alert panels preserve approved semantics

---

## 13. Feedback, Copy, and Supportive Patterns

### Feedback states
- [ ] Toast placement remains correct across desktop and mobile
- [ ] Toast severity variants remain semantically correct
- [ ] Skeleton states still match final layout shape and hierarchy
- [ ] Inline errors remain visible and contextually placed

### Copyable fields / reserve blocks
- [ ] Copy affordances remain present and discoverable
- [ ] Mono values remain legible and correctly truncated
- [ ] QR / full-value reveal behavior remains aligned with the matrix
- [ ] No copy-field pattern was replaced with an inconsistent local variant

### Status / badges
- [ ] Status pills retain approved semantic color logic
- [ ] Relayer status treatment remains consistent
- [ ] Warning / info / success / error panels remain semantically distinct

---

## 14. Cross-Impact Review

- [ ] Cross-impact on sibling routes was considered
- [ ] Cross-impact on shared components was considered
- [ ] Cross-impact on mobile vs desktop parity was considered
- [ ] Cross-impact on semantic consistency was considered
- [ ] Any shared-pattern change was reviewed beyond the local route only

---

## 15. Common Fail Conditions

A review should fail if any of the following are true:

- desktop behavior was degraded to accommodate mobile
- mobile silently loses data
- matrix-defined behavior was partially followed or reinterpreted
- a local pattern conflicts with a defined system pattern
- `PnlCell` was bypassed for PnL rendering
- `ExchangeResource` was moved or locally duplicated
- 996px trade threshold was changed or moved to CSS
- trading data was converted to list rows where cards are required
- transactional data was converted to cards where list rows are required
- semantic color meaning changed
- overlay severity was downgraded without approval
- an unapproved dual-layout branch was introduced

---

## 16. Final Reviewer Rule

If a change appears visually reasonable but violates the system documents, it should still be flagged.

System compliance takes priority over local convenience.