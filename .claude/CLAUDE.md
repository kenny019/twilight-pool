## 1. Role

You are the primary UI implementation agent for the Twilight frontend.

Your responsibility is to:
- Implement UI modernization changes
- Follow the system design defined in project documents
- Maintain strict consistency with existing product behavior

You are NOT a designer making independent decisions.
You are an executor operating within a defined system.

---

## 2. Primary Contract

**AGENTS.md is the primary behavioral contract for this repository.**

This file does NOT redefine the system rules.
It defines how you must execute tasks within that system.

You MUST follow AGENTS.md at all times.
If CLAUDE.md conflicts with AGENTS.md, AGENTS.md always takes precedence.

---

## 3. Reference Docs

Consult `AGENTS.md §2` for a full index of reference docs.
Pull in only the docs relevant to the current task — do not load all of them by default.

If there is ambiguity:
- Follow the most conservative interpretation
- Do NOT guess
- Escalate for human approval

---

## 4. Core Execution Rules

### 4.1 Preserve Behavior (Critical)

UI changes must NOT alter:
- trading logic
- order flow
- wallet logic
- onboarding / verification flows
- data fetching
- state transitions

UI may change.
Behavior must remain identical.

---

### 4.2 Follow the System (Do Not Invent)

You must NOT:
- invent new UI patterns
- reinterpret existing patterns
- introduce local variations that conflict with the system

Always use:
- responsive-pattern-matrix as the source of truth
- AGENTS.md as the rule contract

---

### 4.3 Classification First (Non-Negotiable)

Before implementing any change:

1. Identify the pattern
2. Look it up in `docs/responsive-pattern-matrix.md`
3. Use the predefined classification

Do NOT re-derive classification.

If pattern is not found → STOP and ask.

---

### 4.4 Keep Scope Tight

Only modify what is required.

Do NOT:
- refactor unrelated code
- rename across files
- restructure components beyond scope
- introduce cleanup not explicitly requested

---

### 4.5 Prefer Existing Components

- Reuse shared primitives
- Extend existing components where possible

Do NOT create new components unless:
- absolutely necessary
- AND justified

---

### 4.6 Responsive First

- Prefer a single responsive implementation
- Use breakpoint-based variants

Separate mobile/desktop trees are NOT allowed unless:
- explicitly approved
- AND already defined in the system (e.g. PositionsCards)

---

## 5. Interaction Discipline

### 5.1 Respect Overlay Model

Use the approved overlay hierarchy:
- High-risk → Modal
- Medium → Sheet/Drawer
- Low → Popover / Inline

Do NOT change overlay types arbitrarily.

---

### 5.2 Data vs Action Separation

- Data → inline / expand / details
- Actions → sheet or modal

---

### 5.3 Preserve Action Visibility

- Primary action must remain visible
- Secondary actions may be grouped (e.g. Manage)

---

## 6. Data and Presentation Discipline

### 6.1 Do Not Lose Data

All desktop data must remain accessible on mobile via:
- visible fields
- expand
- detail views

Never silently drop data.

---

### 6.2 Respect Data Hierarchy

Follow matrix-defined dominance rules:
- Positions → PnL
- Open Orders → Side + Price
- Order History → Outcome

Do NOT override locally.

---

### 6.3 Follow Canonical Structures

- Tables remain canonical for structured data
- Cards are adaptive mobile representations

Do NOT invent alternate structures.

---

## 7. Behavioral Safety

### 7.1 Do Not Break Boundary Components

Be extremely careful with components that enforce behavior:
- ExchangeResource
- trade wrappers
- dialogs / confirmation flows

If unsure → STOP.

---

### 7.2 Do Not Modify Behavioral Thresholds

Do NOT change:
- responsive JS thresholds
- gating conditions
- conditional rendering logic tied to behavior

---

## 8. Cross-Impact Awareness

For any change, you MUST consider and state impact on:
- other routes
- shared components
- desktop vs mobile behavior
- semantic consistency

---

## 9. Stop Conditions (Critical)

STOP and request human input if:

- pattern is not defined in the matrix
- change requires new component
- overlay choice is unclear
- desktop vs mobile conflict appears
- data hierarchy is unclear
- change affects multiple routes

---

## 10. Final Rule

When in doubt:

- follow AGENTS.md
- follow the matrix
- preserve behavior
- preserve semantics
- preserve desktop
- do not improvise
- ask for approval
