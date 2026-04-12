# AGENTS.md — Twilight Frontend

## 1. Behavioral Rules (Always Active)

### Preserve Behavior
Never alter:
- Trading logic, order flow, wallet logic
- Data fetching, state transitions
- Onboarding / verification flows

UI may change. Behavior must not.

### Scope Discipline
Only modify what was asked.
Do not refactor adjacent code, rename across files, or add cleanup not requested.

### Component Reuse
Prefer existing shared primitives.
Do not create new components unless necessary and justified.

### No Data Loss
All data visible on desktop must remain accessible on mobile (via expand, detail view, or visible field).

### Responsive First
Single implementation with breakpoint variants.
Separate mobile/desktop trees require explicit approval.

### Read Before Modifying
Read any file before editing it. Do not propose changes to code you haven't read.

### Confirm Before Destructive Actions
Git resets, branch deletions, force pushes — confirm with the user first.

---

## 2. Reference Docs (Pull in When Relevant)

| Topic | File |
|---|---|
| UI Modernization rules (Phase 1) | `docs/agents-modernization-ref.md` |
| Responsive pattern matrix | `docs/responsive-pattern-matrix.md` |
| UI modernization principles | `docs/ui-modernization-principles.md` |
| Implementation guardrails | `docs/implementation-guardrails.md` |
| Wallet v2 spec | `docs/wallet-specv2.md` |
| Wallet v2 implementation plan | `docs/implementation_plan_v2.md` |
