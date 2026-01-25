# Stage 6 — Save & Open Drafts

## 1. Stage Intent
Allow persistent work across sessions.

After this stage, drafts can be saved and restored fully.

## 2. Scope

### In Scope (Must)
- Save .drft file
- Restore editor and HTML state

### Explicitly Out of Scope
- Cloud sync

## 3. User Workflow
1. User saves draft
2. User closes app
3. User reopens draft

## 4. System Responsibilities
- Serialize cleanHTML and Lexical state
- Restore accurately

## 5. Source of Truth
- .drft file contents

## 6. Acceptance Criteria
- [ ] Draft restores editor exactly
- [ ] Metadata preserved

## 7. Dependencies
- Stable docState model

## 8. Risk Notes
- Version migrations may be needed later

## 9. Artifacts
- draft schema