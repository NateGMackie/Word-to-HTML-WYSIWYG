# Editor Content Model

This document defines the structural model for the editor, including block types, inline types, structural rules, and expected keyboard behavior.  
Any implementation should aim to match this conceptual model.

---

## 1. Block Types

Block types are the highest-level structural units of a document.

---

### 1.1 `paragraph`

**Purpose:** Standard body text.

**Allowed children:**
- Inline content only:
  - Text with marks (strong, emphasis, underline, strikethrough, subscript, superscript)
  - `user-input`
  - `variable`
  - `link`
  - `caption` (if inline)

**Allowed parents:**
- `document`
- `list-item`
- `callout` (non-code)

---

### 1.2 Headings: `heading-1`, `heading-2`, `heading-3`

**Allowed children:**
- Inline content only

**Allowed parents:**  
- `document` only

**Constraints:**
- Cannot contain block-level elements.
- May contain inline links.
- Callouts and lists must appear as siblings, not children.

---

### 1.3 Lists

---

#### 1.3.1 `ordered-list`

**Allowed children:**  
- `list-item`

**Allowed parents:**  
- `document`
- `callout` (non-code)

---

#### 1.3.2 `unordered-list`

**Allowed children:**  
- `list-item`

**Allowed parents:**  
- `document`
- `callout` (non-code)

---

#### 1.3.3 `list-item`

**Allowed children:**
- `paragraph`
- `callout` (any variant)
- `ordered-list` / `unordered-list`
- `horizontal-rule` (optional)

**Notes:**  
A list-item may include:
- A step line (`paragraph`)
- Supporting blocks such as examples or notes
- Nested lists

---

### 1.4 `horizontal-rule`

Self-contained block used for section separation.

**Allowed parents:**
- `document`
- `list-item`
- `callout` (non-code)

---

### 1.5 Unified Block Type: `callout`


**Variants (`kind` values):**
- `note`
- `warning`
- `example`
- `blockquote`
- `code`

---

#### 1.5.1 Note, Warning, Example

**Allowed children:**
- `paragraph`
- `ordered-list`
- `unordered-list`

**Allowed parents:**
- `document`
- `list-item`

**Constraints:**
- Cannot contain other callouts.

---

#### 1.5.2 Blockquote

**Variant:** `callout(kind="blockquote")`

**Allowed children:**
- `paragraph`
- `ordered-list` / `unordered-list`

**Allowed parents:**
- `document`
- `list-item`

**Constraints:**  
Same as other callouts.

---

#### 1.5.3 Code Block

**Variant:** `callout(kind="code")`

**Allowed children:**
- Raw text (preformatted)
- `<br>` line breaks

**Disallowed:**
- Structured lists
- Inline formatting

**Allowed parents:**
- `document`
- `list-item`

---

## 2. Inline Types

Inline types appear only within block nodes.

---

### 2.1 Marks

- `strong`
- `emphasis`
- `underline`
- `strikethrough`
- `subscript`
- `superscript`

Marks may stack freely.

---

### 2.2 Inline Nodes

#### `user-input`
- `<span class="user-input">...</span>`

#### `variable`
- `<span class="variable">...</span>`

#### `link`
- `<a href="...">...</a>`

#### `caption`
- Inline-only for now.

---

## 3. Structural Rules

---

### 3.1 Callout Placement

Callouts may appear:
- Top-level in the document
- Inside `list-item`s

Callouts must **not** appear:
- Inside headings
- Inside other callouts

---

### 3.2 No Nested Callouts

A callout cannot contain another callout.

---

### 3.3 Lists Inside Callouts

Allowed:
- Lists inside all non-code callouts

Not allowed:
- Structured lists inside code blocks

---

### 3.4 Headings

- Cannot contain blocks.
- May contain inline formatting.
- Only allowed as children of the document root.

---

## 4. Keyboard Behavior

---

### 4.1 Paragraphs

**Enter:** new paragraph  
**Shift+Enter:** `<br>` soft break  

---

### 4.2 List Items

**Enter:**  
- If text exists → new list item  
- If empty → exit list → return to paragraph  

**Shift+Enter:**  
- Soft break inside the same list-item  

---

### 4.3 Callouts (note, warning, example, blockquote)

**Not inside a list:**
- Enter → soft break  
- Shift+Enter → soft break  

**Inside a list:**
- Behave exactly like list-item rules  

---

### 4.4 Code Blocks

Enter → newline inside code  
Shift+Enter → newline inside code  
No structural splitting  

---

## 5. HTML Mapping

---

### 5.1 Blocks

- `paragraph` → `<p>`
- `heading-1` → `<h1>`
- `heading-2` → `<h2>`
- `heading-3` → `<h3>`
- `ordered-list` → `<ol>`
- `unordered-list` → `<ul>`
- `list-item` → `<li>`
- `horizontal-rule` → `<hr>`

---

### 5.2 Callouts

- `note` → `<div class="callout note">...</div>`
- `warning` → `<div class="callout warning">...</div>`
- `example` → `<div class="callout example-block">...</div>`
- `blockquote` → `<div class="callout blockquote">...</div>`
- `code` → `<pre class="callout code"><code>...</code></pre>`

---

### 5.3 Inline

- `strong` → `<strong>`
- `emphasis` → `<em>`
- `underline` → `<u>`
- `strikethrough` → `<s>`
- `subscript` → `<sub>`
- `superscript` → `<sup>`
- `user-input` → `<span class="user-input">`
- `variable` → `<span class="variable">`
- `link` → `<a href="...">`
- `caption` → `<span class="caption">`
