# Stage 8 — Formal Import Process

## 1. Stage Intent
Move beyond copy/paste to structured content import.

After this stage, I can import supported files into the app intentionally.

## 2. Scope

### In Scope (Must)
- Import clean HTML files
- Import .drft files
- Validate imported content

### Explicitly Out of Scope
- PDF parsing
- Rich Word file ingestion

## 3. User Workflow
1. User selects Import
2. User chooses file
3. Content loads into app

## 4. System Responsibilities
- Validate file type and contents
- Reject unsupported formats gracefully

## 5. Source of Truth
- Imported cleanHTML

## 6. Acceptance Criteria
- [ ] Clean HTML imports correctly
- [ ] Invalid files are rejected with message

## 7. Dependencies
- Stage 6 complete

## 8. Risk Notes
- HTML from external tools may be malformed

## 9. Artifacts
- import handlers