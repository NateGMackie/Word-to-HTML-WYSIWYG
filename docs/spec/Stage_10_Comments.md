# Stage 10 — Comments

## 1. Stage Intent
Allow lightweight annotations without affecting published content.

After this stage, I can leave comments for myself during drafting.

## 2. Scope

### In Scope (Must)
- Add comments to content
- Hide comments from export

### Explicitly Out of Scope
- Multi-user collaboration
- Comment resolution workflows

## 3. User Workflow
1. User selects text
2. User adds comment
3. Comment is visible in editor only

## 4. System Responsibilities
- Store comments separately from content
- Exclude comments from export

## 5. Source of Truth
- Draft metadata

## 6. Acceptance Criteria
- [ ] Comments persist in drafts
- [ ] Export excludes comments

## 7. Dependencies
- Draft save/load system

## 8. Risk Notes
- UI complexity creep

## 9. Artifacts
- comment model