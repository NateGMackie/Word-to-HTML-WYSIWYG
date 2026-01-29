# Stage 8.5 — Hardening & Trust

## 1. Stage Intent

Eliminate friction, ambiguity, and hesitation in the core workflows.

After this stage, the editor feels **inevitable**:
- Actions behave exactly as expected
- Documents feel persistent and continuous
- The system is predictable without being noisy

This stage focuses on **confidence**, not new capabilities.

---

## 2. Scope

### In Scope (Must)

- Strengthen **draft identity** and overwrite semantics
- Reduce unnecessary confirmation steps in happy paths
- Clarify “source of truth” transitions between:
  - Word view
  - HTML view
  - WYSIWYG editor
- Normalize import, save, and apply behaviors so they feel consistent
- Encode and enforce system **invariants**

### Explicitly Out of Scope

- New content features (templates, comments, validation)
- Collaboration or multi-user workflows
- Cloud sync or external integrations
- Semantic analysis of content quality

---

## 3. Sub‑Stages (Implementation Slices)

Stage 8.5 is intentionally broken into smaller, targeted slices.
Each slice may be implemented independently but must preserve all invariants.

### 3.1 Stage 8.5a — Draft Identity & Overwrite

**Goal:** Saving feels like saving, not forking.

**Focus Areas**
- Introduce a stable document identity (id, title, timestamps)
- Define overwrite‑by‑default save semantics
- Avoid accidental draft duplication
- Ensure reopening resumes the same document

**Acceptance Signals**
- Save → save again → reopen returns the same document
- Filenames and internal ids remain stable
- No unexpected “new draft” artifacts are created

---

### 3.2 Stage 8.5b — Happy‑Path Flow Polishing

**Goal:** Reduce friction in common workflows.

**Focus Areas**
- Clean action performs clean + state update + navigation when intent is clear
- Imports land in the correct view without extra confirmation
- Apply / Update gates remain only where user intent is ambiguous (e.g., manual HTML edits)

**Acceptance Signals**
- Fewer clicks in common flows
- No surprising view changes
- Guardrails remain for destructive actions

---

### 3.3 Stage 8.5c — Invariants & Divergence Detection

**Goal:** State divergence is impossible or loudly detected.

**Focus Areas**
- Make canonical source of truth explicit in code
- Detect editor vs HTML divergence early
- Add invariant checks (dev‑mode warnings acceptable)

**Acceptance Signals**
- Silent corruption is impossible
- Invalid states are detected immediately
- Recovery paths are obvious

---

### 3.4 Stage 8.5d — Error Handling & Recovery

**Goal:** Fail safely and recover without data loss.

**Focus Areas**
- Invalid HTML never crashes the editor
- Errors explain what happened and what to do next
- Provide recovery actions (revert, re‑clean, reopen HTML view)

**Acceptance Signals**
- No data loss during failures
- Errors are understandable and actionable

---

## 4. User Workflow (Target Experience)

### Draft Continuity
1. User opens or creates a document
2. User edits content across views
3. User saves
4. User reopens later
5. **Document resumes naturally, without surprise**

Saving feels like *saving*, not *forking*.

---

### Editing Flow
1. User pastes or imports content
2. User cleans or applies changes
3. Editor updates **without extra confirmation unless intent is ambiguous**
4. User continues writing

Happy paths are quiet. Guardrails remain, but only speak when needed.

---

## 5. System Responsibilities

### 5.1 Draft Identity & Persistence

- Each draft has a clear, stable identity
- Save operations:
  - Overwrite by default when appropriate
  - Only create new artifacts when explicitly requested
- Restore:
  - Editor state
  - HTML state
  - View context (where reasonable)

---

### 5.2 View Transitions & Source of Truth

- At any moment, the system must know which representation is canonical:
  - `cleanHTML`
  - Lexical editor state
- Transitions between views must be:
  - Explicit when destructive
  - Automatic when safe
- The system must never silently diverge states

---

### 5.3 Reduced Friction in Happy Paths

- Eliminate redundant “Apply / Update” steps when:
  - The user’s intent is unambiguous
  - The operation is safe and contract‑preserving
- Preserve explicit apply gates only when:
  - User edits raw HTML
  - Content validity is uncertain

---

### 5.4 Invariants Enforcement

The following invariants must always hold:

- Exported HTML always matches the export contract
- Editor state is always derivable from canonical HTML
- Invalid content never crashes the editor
- Guardrails prevent corruption, not productivity

Violations must be:
- Detected early
- Communicated clearly
- Recoverable without data loss

---

## 6. Source of Truth

- `cleanHTML` remains the canonical serialized form
- Lexical editor state is always derived, never authoritative
- Draft metadata is auxiliary and must not affect export

---

## 7. Acceptance Criteria

### Draft Confidence
- [ ] Saving a draft overwrites predictably when expected
- [ ] Opening a draft restores content exactly
- [ ] No accidental draft duplication occurs

### Workflow Smoothness
- [ ] Common flows require fewer clicks than before
- [ ] No user action causes unexpected view changes
- [ ] Guardrails appear only when intent is unclear

### Stability & Safety
- [ ] Export contract is never violated
- [ ] Invalid operations fail gracefully
- [ ] State divergence is impossible or loudly detected

---

## 8. Dependencies

- Stages 1–8 complete
- Stable `docState` model
- Export contract enforcement

---

## 9. Risk Notes

- Over‑automation may hide important state changes if done carelessly
- Must balance “quiet correctness” with debuggability
- Changes here affect *everything* downstream—test carefully

---

## 10. Artifacts

- Updated draft save / overwrite logic
- Clarified view‑transition rules
- Invariants checklist (internal)
- UX notes documenting intentional friction vs silent success

---

## 11. Exit Criteria (When This Stage Is Truly Done)

This stage is complete when:

> You stop thinking about how the app works  
> and only think about what you’re writing.

At that point, the system is ready to safely absorb:
- Templates
- Comments
- Versioning
- Validation
