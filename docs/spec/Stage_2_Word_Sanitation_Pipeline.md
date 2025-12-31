# Stage 2 — Word Sanitation Pipeline

## 1. Stage Intent
Make Word paste a reliable, first-class way to generate clean HTML.

After this stage, Word content can be scrubbed confidently.

## 2. Scope

### In Scope (Must)
- Desktop Word HTML sanitation
- Word Online HTML sanitation
- Tables, lists, headings normalization

### Explicitly Out of Scope
- File upload import
- WYSIWYG editing of imported content

## 3. User Workflow
1. User pastes Word content
2. User clicks Clean
3. Clean HTML is generated

## 4. System Responsibilities
- Strip proprietary tags and attributes
- Normalize structure
- Preserve semantic meaning

## 5. Source of Truth
- `cleanHTML`

## 6. Acceptance Criteria
- [ ] Word desktop and online both sanitize correctly
- [ ] Tables render structurally correct
- [ ] Output matches export contract

## 7. Dependencies
- Stage 1 complete

## 8. Risk Notes
- Word HTML variants are unpredictable

## 9. Artifacts
- sanitation pipeline code
- Word fixture library