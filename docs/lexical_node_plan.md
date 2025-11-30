# Lexical Node Plan

This document maps the **Editor Content Model** onto **Lexical nodes** so we know:

- Which Lexical core nodes we can reuse.
- Which nodes we need to implement as custom nodes.
- Where we’ll hang our semantics (classes, attributes, export rules).

---

## 1. Overview

We will base the editor on Lexical’s **rich-text stack**, plus a few **custom nodes** to support:

- Callouts (note, warning, example, blockquote, code)
- Variables
- User input spans
- (Optionally) captions

Core Lexical concepts we’ll use:

- `RootNode` – the editor root.
- `ParagraphNode` – for paragraphs.
- `HeadingNode` – for headings.
- `ListNode` and `ListItemNode` – for lists.
- `LineBreakNode` – for soft breaks.
- `TextNode` – for text + marks.
- `LinkNode` – for hyperlinks.
- `HorizontalRuleNode` / HorizontalRule extension – for `<hr>`.

Custom nodes:

- `CalloutNode` – one node type with a `kind` field: `note`, `warning`, `example`, `blockquote`, `code`.
- `VariableNode` – inline, for variables.
- `UserInputNode` – inline, for user input.
- (Optional) `CaptionNode` – inline or block, if we decide it needs its own node later.

---

## 2. Block Types → Lexical Nodes

### 2.1 Paragraph

**Model:** `paragraph`  
**Lexical:**

- Use Lexical’s built-in `ParagraphNode`.
- Style via theme (e.g., `editorTheme.paragraph`).
- HTML export: `<p>...</p>`.

_No custom node needed._

---

### 2.2 Headings

**Model:** `heading-1`, `heading-2`, `heading-3`  
**Lexical:**

- Use Lexical’s `HeadingNode`.
- Use `tag` property to distinguish `h1`, `h2`, `h3`.
- Enforce top-level-only usage via transforms / keyboard behavior.

_No custom node needed._

---

### 2.3 Lists

**Model:**

- `ordered-list`
- `unordered-list`
- `list-item`

**Lexical:**

- Use Lexical’s `ListNode` and `ListItemNode`.
  - `ListNode` `listType` = `"number"` → ordered list.
  - `ListNode` `listType` = `"bullet"` → unordered list.
- Keyboard behavior:
  - Enter / Shift+Enter behaviors defined via List plugin + custom handlers if needed.

_No custom node needed beyond List/Item config._

---

### 2.4 Horizontal Rule

**Model:** `horizontal-rule`  
**Lexical:**

- Use Lexical’s horizontal rule implementation:
  - Either `HorizontalRuleNode` from `@lexical/react` or the `@lexical/extension` horizontal rule.
- HTML export: `<hr />`.

_Might be a thin wrapper or direct use of their node._

---

### 2.5 Callouts / Blockquote / Code

**Model:** unified `callout(kind=...)` with variants:

- `"note"`
- `"warning"`
- `"example"`
- `"blockquote"`
- `"code"`

**Lexical:**

We’ll implement a **custom `CalloutNode`** extending `ElementNode`:

- `type`: `"callout"`.
- `kind` field in JSON:
  - `"note" | "warning" | "example" | "blockquote" | "code"`.

**Rendering / Export:**

- For `note`:
  - HTML: `<div class="callout note">...</div>`
- For `warning`:
  - `<div class="callout warning">...</div>`
- For `example`:
  - `<div class="callout example-block">...</div>`
- For `blockquote`:
  - `<div class="callout blockquote">...</div>` or `<blockquote class="callout blockquote">...</blockquote>`
- For `code`:
  - `<pre class="callout code"><code>...</code></pre>`

**Children:**

- `note` / `warning` / `example` / `blockquote`:
  - children: `ParagraphNode`, `ListNode`, `ListItemNode`.
- `code`:
  - children: text only (no nested blocks); behaves like a code block.

This one custom node gives us all the “line blocks” you described.

---

## 3. Inline Types → Lexical Nodes

### 3.1 Text + marks

**Model:**

- `strong`, `emphasis`, `underline`, `strikethrough`, `subscript`, `superscript`

**Lexical:**

- Use standard `TextNode` with formatting flags.
- Lexical already supports bold/italic/underline/strikethrough out of the box.
- Subscript and superscript can be either:
  - Additional text formats, or
  - Export rules that wrap text in `<sub>` / `<sup>` on HTML generation.

_No custom node needed._  
_Most of this is toolbar + theme + export config._

---

### 3.2 Links

**Model:** `link`  
**Lexical:**

- Use Lexical’s `LinkNode` (from `@lexical/link`).
- Attributes: `href`, optional `title`, `target`.
- Export: `<a href="...">...</a>`.

_No custom node needed._

---

### 3.3 User Input

**Model:** `user-input`  
**Lexical:**

Implement a custom inline node, likely extending `TextNode`:

- `UserInputNode`:
  - Serialized type: `"user-input"`.
  - Export DOM: `<span class="user-input">...</span>`.
  - Inline (`isInline() → true`).

_Alternative:_ keep using `TextNode` + a mark and add the class via export logic, but a node is clearer.

---

### 3.4 Variable

**Model:** `variable`  
**Lexical:**

Custom inline node, also extending `TextNode` (or `DecoratorNode` if needed later):

- `VariableNode`:
  - Serialized type: `"variable"`.
  - Stores raw text (e.g., `"USERNAME"`).
  - Export DOM: `<span class="variable">USERNAME</span>`.

This maps cleanly to your current behavior.

---

### 3.5 Caption

**Model:** `caption` (inline for now)

**Lexical (v1 plan):**

- Represent as normal `TextNode` with a specific CSS class on export:
  - `<span class="caption">...</span>`
- We can later promote this to a real `CaptionNode` if we find we need block-level semantics (e.g., “caption must follow an image node”).

_No custom node required yet._

---

## 4. Validation Rules (to enforce our model)

We will enforce the content rules using:

- **Node transforms** to:
  - Prevent callouts nested inside callouts.
  - Ensure headings remain top-level.
  - Keep `callout(kind="code")` children simple (no lists).
- **Keyboard handlers** (`KEY_ENTER_COMMAND`, `KEY_SHIFT_ENTER_COMMAND`) to:
  - Implement Enter/Shift+Enter behavior for:
    - Paragraphs
    - List items
    - Callouts
    - Code blocks

We’ll use Lexical’s existing list and heading logic where possible, layering our rules on top.

---

## 5. Implementation Order

1. **Basic rich text**  
   - Root, ParagraphNode, TextNode, bold/italic/underline.
2. **Headings & lists**  
   - HeadingNode, ListNode, ListItemNode, standard Enter behavior.
3. **Horizontal rule**  
   - Add HorizontalRuleNode.
4. **CalloutNode**  
   - Implement callout with `kind` and HTML export.
5. **Inline custom nodes**  
   - VariableNode, UserInputNode.
6. **Transforms & keyboard rules**  
   - Enforce “no nested callouts”
   - Custom Enter rules in callouts, lists, and code.
