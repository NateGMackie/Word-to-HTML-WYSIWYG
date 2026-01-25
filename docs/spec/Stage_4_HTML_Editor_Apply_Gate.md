# Stage 4 — HTML Editor Apply Gate

## 1. Stage Intent
Make HTML editing explicit and safe.

After this stage, HTML edits are applied intentionally, not live-synced.

## 2. Scope

### In Scope (Must)
- HTML editor edits cleanHTML
- Apply button loads into Lexical

### Explicitly Out of Scope
- Bi-directional live sync

## 3. User Workflow
1. User edits HTML
2. User clicks Apply
3. Editor updates

## 4. System Responsibilities
- Validate before apply
- Show errors clearly

## 5. Source of Truth
- cleanHTML canonical

## 6. Acceptance Criteria
- [ ] Invalid HTML does not crash editor
- [ ] Apply updates editor predictably

## 7. Dependencies
- Stage 3 complete

## 8. Risk Notes
- Cursor position reset accepted

## 9. Artifacts
- html editor logic