# Stage 5 — Round-trip Polish & Guardrails

## 1. Stage Intent
Ensure editing round-trips do not violate contract.

After this stage, export/import/export cycles remain stable.

## 2. Scope

### In Scope (Must)
- Contract linting
- Validation warnings

### Explicitly Out of Scope
- Content analysis

## 3. User Workflow
1. User edits content
2. User exports
3. HTML remains clean

## 4. System Responsibilities
- Detect contract violations
- Prevent silent corruption

## 5. Source of Truth
- Export contract

## 6. Acceptance Criteria
- [ ] Violations flagged
- [ ] Output remains valid

## 7. Dependencies
- Stages 1–4 complete

## 8. Risk Notes
- False positives acceptable initially

## 9. Artifacts
- contract lint logic