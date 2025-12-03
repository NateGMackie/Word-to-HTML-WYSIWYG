# Word-to-HTML WYSIWYG — V1 Specification

## 1. Purpose

The goal of v1 is to deliver a **simple, stable WYSIWYG editor** built on **Lexical’s default behavior**, suitable for writing clean, structured technical documentation.  
Customization is intentionally limited so core editing remains predictable, maintainable, and consistent with Lexical’s built-in model.

This version focuses *only* on the writing environment itself — not import pipelines, not persistence, not advanced semantic structures. Those remain future iterations.

---

## 2. In-Scope Features

### 2.1 Basic Editing & Formatting (Follow Lexical Defaults)

The editor must support the following core text-editing features using Lexical’s built-in nodes, behaviors, and keyboard shortcuts:

#### Block Types
- Paragraph
- Headings (H1, H2, H3)
- Blockquote *(via Lexical’s default BlockquoteNode)*
- Code block *(via Lexical’s CodeNode)*
- Lists:
  - Bulleted list
  - Numbered list
  - Nested list items using Tab / Shift+Tab

#### Inline Formatting
- Bold  
- Italic  
- Underline  
- Hyperlink (Lexical’s LinkNode)

#### Keyboard Behavior
- Default Lexical behaviors for:
  - Enter / Shift+Enter  
  - Tab / Shift+Tab (list indent/outdent)  
  - Ctrl/Cmd formatting shortcuts  
- **One exception:**  
  When inside a list item *inside a callout*, two consecutive empty list items at the end collapse into a paragraph.  
  (This behavior will remain in v1.)

---

### 2.2 Custom Block Types (Minimal V1 Scope)

#### Callouts: Note, Example, Warning
- These already exist and function as custom `CalloutNode` blocks.
- For v1:
  - Keep existing callout behavior intact.
  - No additional enhancements or keyboard rules.
  - Accept current implementation as-is.

#### No Other Custom Blocks in v1
- Code block will no longer be implemented as a callout.
- Blockquote will no longer be implemented as a callout.

---

### 2.3 Code Blocks (v1 Stance)

#### Editor Behavior
- Use Lexical’s native `CodeNode`.
- Use Lexical’s default code behavior:
  - Multi-line editing  
  - Enter/Shift+Enter behavior  
  - Optional syntax highlighting (can be deferred)

#### Export Behavior
- Code blocks must export as **`<pre>`** (no callout classes).

#### Not Required in v1
- Language selection  
- Syntax highlighting  
- Smart indentation  

---

### 2.4 Editor UI (Toolbar / Styles Dropdown)

- Keep existing dropdown for block-level formatting.
- Keep existing inline formatting buttons.
- No redesign required for v1.

---

## 3. Out-of-Scope for v1 (Non-Goals)

These will not be included in v1:

### Import / Content Cleaning
- Smart paste from Microsoft Word  
- Removing MSO-specific HTML  
- Auto-normalization of headings/lists  

### Persistence
- Local storage  
- Saving/loading documents  

### Advanced Custom Blocks
- Steps / procedures  
- Screenshot components  
- Variables / placeholders  

### Advanced Callout Behavior
- Auto-labeling  
- Complex enter/exit semantics  

### UX Enhancements
- Slash commands  
- Context menus  
- Collaborative editing  

---

## 4. Future Enhancements / v1.1+ Backlog

### Editor & UX QoL
- Smarter Enter behavior in callouts  
- Visual spacing normalization in code  
- Auto-detect block types on paste  

### Importing / Word Cleaning
- Full Word → clean HTML transformation  
- Style stripping  

### Content Blocks
- Steps (procedures)  
- Screenshot annotations  
- Variables / dynamic placeholders  

### Export Enhancements
- Minimal CSS output  
- Theme-aware HTML  

### Persistence
- Draft save/restore  
- Document management  

---

## 5. V1 Completion Checklist

### A. Clean the Codebase
- [x] Remove `"code"` from `CalloutNode`  
- [x] Remove `CodeBlockBridgePlugin.jsx`  
- [x] Remove `"blockquote"` from `CalloutNode`  
- [x] Revert `KeyboardPlugin` to default except list-cleanup  
- [ ] Verify no custom Enter behavior interferes with Lexical defaults  

### B. Restore Lexical Defaults
- [x] Add Lexical’s BlockquoteNode to Styles  
- [x] Add Lexical’s CodeNode + Code plugin  
- [x] Ensure toolbar triggers Lexical’s native code block command  

### C. Testing / Verification
Verify HTML output for each type:
- [ ] Paragraph → `<p>`  
- [ ] Headings → `<h1>`–`<h3>`  
- [ ] Blockquote → `<blockquote>`  
- [ ] Code block → `<pre>`  
- [ ] Lists → correct `<ul>/<ol>/<li>`  
- [ ] Inline styles → correct tags  
- [ ] Callouts → correct `<div class="callout …">`  

### D. Final polish
- [ ] Ensure no editor-specific classes leak into exported HTML  
- [ ] Verify stable Enter/Tab behavior  
- [ ] UI labels validated  

---

## 6. Summary

v1 is intentionally minimal and aligned with Lexical’s built-in assumptions.  
Custom callouts remain, but all other formatting follows Lexical defaults.  
This version lays the foundation for future enhancements without fighting the editor engine.
