# Stage 1 — Export Contract & Test Harness

## 1. Stage Intent
Lock down what “clean HTML” means and make it regression-proof.

After this stage, clean HTML output is deterministic, testable, and trusted as the foundation for all future features.

## 2. Scope

### In Scope (Must)
- Finalize and freeze the Export Contract
- Define allowed tags, attributes, and classes
- Create regression (golden file) tests for sanitation output
- Validate no inline styles or proprietary markup remain

### Explicitly Out of Scope
- Editor syncing
- Importing content into Lexical
- UI polish

## 3. User Workflow
1. User pastes content or authors in editor
2. User clicks Clean
3. App outputs consistent clean HTML every time

## 4. System Responsibilities
- Enforce Export Contract strictly
- Fail loudly if contract is violated
- Provide deterministic output

## 5. Source of Truth
- `cleanHTML` is canonical import sanitizer
- `cleanAndNormalizeExportHtml` is canonical export gate

## 6. Acceptance Criteria
- [ ] Same input always yields same output
- [ ] No inline styles exist
- [ ] Output matches contract spec

## 7. Dependencies
- None

## 8. Risk Notes
- Contract changes later will require migrations

## 9. Artifacts
- export-contract.md
- sanitation tests