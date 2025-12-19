# v1 Addendum: Scrub Mode vs Prep Mode

## Purpose

Clarify the **two-mode workflow** for v1:

- **Scrub Mode**: Convert Word-pasted content into **clean exportable HTML**.
- **Prep Mode**: Optionally load that clean HTML into the Lexical editor to apply **semantic authoring features** (callouts, user-input, variable), then export clean HTML.

This addendum intentionally separates **Word scrubbing** from **WYSIWYG authoring**, while preserving a clear bridge between them.

---

## Definitions

### Clean HTML (Export Contract)
“Clean HTML” is the canonical HTML output intended for downstream systems (e.g., ServiceNow KB HTML view).

Clean HTML must:
- Use only standard HTML tags for structure and inline formatting (e.g., `h1–h3`, `p`, `ul/ol/li`, `strong`, `em`, `a`, `table`).
- Contain **no Word/MSO artifacts** (namespaces, `mso-*`, `style=""`, etc.).
- Avoid arbitrary classes/attributes.
- Allow only the app’s **semantic classes** when created by the authoring features:
  - Callouts (`<div class="callout note|example|warning">…</div>`)
  - User input (`<span class="user-input">…</span>`)
  - Variable (`<span class="variable">…</span>`)

> Styling is applied by external CSS, not inline styles.

### Semantic authoring features (Lexical-backed)
These are intentional content semantics represented as Lexical nodes:
- **CalloutNode** (block-level container, supports child blocks like `p`, lists)
- **UserInputNode** (inline wrapper)
- **VariableNode** (inline wrapper)

---

## Guiding principles

1. The app is an **authoring tool**, not a webpage generator.
2. **Word scrubbing produces an export artifact** (clean HTML).
3. **Authoring semantics are applied in the editor**, not by arbitrary HTML hacks.
4. HTML view exists to:
   - show what will export
   - support small, power-user edits
   - act as a “compile/apply” gate back into the editor

---

## Modes

## Mode 1: Scrub Mode (Word → Clean HTML)

### Goal
Take Word-pasted content, remove Word cruft, preserve basic formatting, and generate clean HTML suitable for export.

### Source of truth
- `docState.cleanHTML` is the canonical output string.

### Pipeline
```
Word Paste → Cleaner (scrub + normalize) → docState.cleanHTML → HTML View (display/export)
```

### UI behavior
- User pastes into **Word view**.
- User clicks **Clean**.
- Result:
  - HTML view updates to show clean HTML.
  - Stats update (bytes/words).
  - No requirement to load into WYSIWYG.

### Acceptance criteria (Scrub Mode)
- Clicking **Clean** produces HTML that:
  - preserves headings, lists, bold/italic, links, tables (as supported)
  - removes Word-specific tags/attributes/styles
  - contains no inline `style=""`
  - contains no unknown/garbage class attributes

---

## Mode 2: Prep Mode (Clean HTML → WYSIWYG semantics → Clean HTML)

### Goal
Allow the user to apply semantic features (callouts, user-input, variable) to already-clean content.

### Source of truth
- During editing, the Lexical editor state is the working representation.
- Export returns to `docState.cleanHTML`.

### Pipeline
```
docState.cleanHTML → (Load into Editor) → Lexical Editor State
Lexical Editor State → (Export) → docState.cleanHTML → HTML View (display/export)
```

### UI behavior
- User enters Prep Mode by explicitly loading cleaned HTML into the editor:
  - **Action**: “Load cleaned HTML into editor”.
- User applies callouts / inline semantics in WYSIWYG.
- HTML view reflects the exported result for inspection/export.

---

## HTML view role and rules

### Purpose of HTML view (v1)
1. Inspect clean export HTML.
2. Validate tagging/structure.
3. Allow small, power-user edits.
4. Provide an explicit “compile/apply” back into the editor.

### Rule: HTML view is not a second full editor
HTML edits do not attempt to introduce new semantic nodes unless/until import mapping exists.

### “Pretty/Apply” behavior
The Pretty button is treated as a **compile/apply gate**:
- Formats HTML for readability.
- Saves it to `docState.cleanHTML`.
- Optionally imports it into Lexical (when user intends to apply changes).

---

## Known limitations (v1)

- HTML → WYSIWYG import does not recreate semantics.
- Semantic features must be applied in the WYSIWYG editor.
- Arbitrary tags/classes are normalized or removed.

---

## Out of scope for v1

1. Arbitrary HTML passthrough / raw HTML escape hatch nodes.
2. Full fidelity HTML editing with guaranteed round-trip of all attributes.
3. Semantic import mapping from HTML to Lexical nodes.

---

## Success definition for v1

v1 is complete when:
1. Word → Clean HTML is reliable and deterministic.
2. Clean HTML is easy to inspect and export from HTML view.
3. Prep Mode allows applying semantic features in WYSIWYG and exporting clean HTML.
4. The system avoids sync conflicts and preserves user intent through explicit transitions.
