# Stage 7 — Publish & Export

## 1. Stage Intent
Provide a clear, intentional way to produce final artifacts from the app.

After this stage, I can reliably publish clean HTML (and optionally other formats) for use in external systems.

## 2. Scope

### In Scope (Must)
- Export clean HTML to file
- Copy clean HTML to clipboard
- Preserve export contract integrity

### Explicitly Out of Scope
- Direct integrations with ServiceNow, Zendesk, etc.
- Automated publishing workflows

## 3. User Workflow
1. User finishes editing content
2. User clicks Publish / Export
3. App produces clean HTML artifact

## 4. System Responsibilities
- Export only contract-valid HTML
- Prevent export if validation fails (with message)

## 5. Source of Truth
- `cleanHTML`

## 6. Acceptance Criteria
- [ ] Exported HTML matches contract
- [ ] Clipboard export matches file export
- [ ] No editor-only metadata leaks

## 7. Dependencies
- Stages 1–6 complete

## 8. Risk Notes
- Users may expect platform-specific formatting

## 9. Artifacts
- export logic