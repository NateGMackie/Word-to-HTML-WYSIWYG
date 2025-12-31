# Stage 11 — Versioning & Diffing

## 1. Stage Intent
Understand how documents change over time.

After this stage, I can compare versions of a document.

## 2. Scope

### In Scope (Must)
- Snapshot versions
- Compare cleanHTML diffs

### Explicitly Out of Scope
- Inline track changes
- Branching workflows

## 3. User Workflow
1. User saves new version
2. User views differences

## 4. System Responsibilities
- Store version history
- Generate diffs reliably

## 5. Source of Truth
- cleanHTML snapshots

## 6. Acceptance Criteria
- [ ] Versions stored correctly
- [ ] Diff view accurate

## 7. Dependencies
- Stage 6 complete

## 8. Risk Notes
- Large docs may impact performance

## 9. Artifacts
- version history model