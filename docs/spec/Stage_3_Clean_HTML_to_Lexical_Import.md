# Stage 3 — Clean HTML → Lexical Import

## 1. Stage Intent
Enable editing sanitized HTML inside the WYSIWYG editor.

After this stage, clean HTML can be loaded into Lexical safely.

## 2. Scope

### In Scope (Must)
- Parse clean HTML
- Map allowed tags to Lexical nodes
- Explicit load action

### Explicitly Out of Scope
- Live syncing
- Cursor mapping

## 3. User Workflow
1. User cleans content
2. User clicks Load into Editor
3. WYSIWYG displays structured content

## 4. System Responsibilities
- Validate HTML before import
- Degrade unsupported tags safely

## 5. Source of Truth
- cleanHTML is canonical
- Lexical state is derived

## 6. Acceptance Criteria
- [ ] Clean HTML loads into editor
- [ ] Export after edit still valid

## 7. Dependencies
- Stages 1–2 complete

## 8. Risk Notes
- Some degradation is expected

## 9. Artifacts
- htmlToLexical importer