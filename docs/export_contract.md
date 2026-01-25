# 📄 Word-to-HTML WYSIWYG
# Export Contract (v1)

This document defines the **expected HTML output** produced by the WYSIWYG editor after cleanup.
It serves as a stability contract: changes to the editor **must not break** these semantics without an explicit version bump.

---

## 1. Overview

The editor produces:

- **Semantic HTML**
- **Zero editor-only classes** (`w2h-*` is removed)
- **Clean, predictable markup** for block and inline structures
- **Safe for ServiceNow** or any CSS-driven knowledge base
- **Preserved content semantics** (e.g., callouts)

Exported HTML is canonicalized so output is deterministic and regression-testable.

---

## 2. Allowlist (What is permitted)

Anything not explicitly allowed below is **removed or normalized** during export.

### 2.1 Allowed tags (v1)

**Block / structure**
- `h1`, `h2`, `h3`
- `p`
- `ul`, `ol`, `li`
- `blockquote`
- `pre`
- `div`
- `table`, `tr`, `th`, `td`
- `hr`
- `img`

**Inline**
- `span`
- `strong`, `em`, `u`, `s`, `sub`, `sup`
- `a`
- `br`

**Explicitly not allowed in v1**
- `code` (canonical code block is `<pre>`)
- `colgroup`, `col`, `thead`, `tbody`, `tfoot`
- `kbd`, `var`, `samp`

---

### 2.2 Allowed attributes (by tag)

**Global rules**
- Inline `style` attributes are **never allowed**
- `data-*` attributes are **never allowed**
- Unknown attributes are removed

**`a`**
- `href` (required)
- `target` (optional; normalized)
- `rel` (optional; normalized)

**`pre`**
- `spellcheck` (optional; if present must be `"false"`)

**`div`**
- `class` (required for callouts; otherwise stripped)

**`span`**
- `class` (required for semantic spans; otherwise stripped)

**`table`, `tr`**
- `id` (optional)

**`th`, `td`**
- `colspan` (optional)
- `rowspan` (optional)
- `id` (optional)

**`img`**
- `src` (required)
- `class` (optional; allowlisted tokens only)
- `alt` (optional, recommended)
- `height` (optional)
- `width` (optional)

**`h1`-`h6`**
- `id` (optional)

**`p`**
- `id` (optional)

**`li`**
- `id` (optional)



---

### 2.3 Allowed classes (exact tokens)

Only the following class tokens are allowed.

**`div` (callouts)**
- must contain `callout` and exactly one kind token:
  - `note` | `example` | `warning`

Examples:
```html
<div class="callout note">…</div>
<div class="callout example">…</div>
<div class="callout warning">…</div>
```

**`span` (inline semantics)**
- `user-input`
- `variable`

Examples:
```html
<span class="user-input">launch code</span>
<span class="variable">USERNAME</span>
```

**`img` (image semantics)**
- `screenshot`
- `icon`

Examples:
```html
<img class="screenshot" …>
<img class="icon" …>
```

**Removal rules**
- Any class containing `w2h-*` is removed
- Any class token not listed above is removed
- If `class` becomes empty after cleanup, the attribute is removed

---

### 2.4 ID attribute rules

**Allowed id usage**
- Allowed on: `h1`, `h2`, `h3`
- Format: `^[_A-Za-z][A-Za-z0-9_\-:.]{0,79}$`
- Normalization (import + export):
  - whitespace → `_`
  - remove chars outside `A–Z a–z 0–9 _ - : .`
  - if starts with digit, prefix with `id_`
  - truncate to 80 chars
- Uniqueness: if duplicates exist, suffix `-2`, `-3`, etc.

- id must be normalized:
  - Spaces → `_`
  - Only `[A-Za-z0-9_\-:.]`
  - Cannot start with a digit (prefix `id_`)
- id must be unique in the document:
  - duplicates get `-2`, `-3`, etc.
- When converting Word bookmarks:
  - Bookmark names should map to id on the nearest appropriate block element (prefer headings)

---

## 3. Canonical formatting rules

To support golden-file regression tests, export output is canonicalized:

- Tag names are lowercase
- Attribute values use double quotes
- Attribute order is alphabetical
- Output is always pretty-formatted
- Void elements use:
  - `<br>`
  - `<hr>`
  - `<img …>`

---

## 4. Block elements

### 4.1 Headings

```html
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
```

- No classes, no wrappers
- Must not contain block children

---

### 4.2 Paragraphs

```html
<p>Your text…</p>
```

**Empty paragraphs**
```html
<p><br></p>
```

---

### 4.3 Blockquote

```html
<blockquote>Quoted text</blockquote>
```

---

### 4.4 Code blocks

Canonical code blocks use `<pre>`:

```html
<pre spellcheck="false">code block</pre>
```

Rules:
- Plain text only
- No inline formatting
- `<code>` is normalized away

---

### 4.5 Callouts

Canonical structure:

```html
<div class="callout note">
  <p><strong>Note:&nbsp;</strong>Callout body</p>
</div>

<div class="callout example">
  <p><strong>Example:&nbsp;</strong>Example body</p>
</div>

<div class="callout warning">
  <p>Warning body</p>
</div>
```

**Allowed children**
- `p`
- `ul`
- `ol`

**Not allowed**
- headings
- tables
- images
- other callouts
- `pre`
- `blockquote`

---

### 4.6 Lists

```html
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
</ul>

<ol>
  <li>Item 1</li>
  <li>Item 2</li>
</ol>
```

Rules:
- Nested lists allowed
- `value` attributes on `li` are stripped

---

### 4.7 Horizontal rule

```html
<hr>
```

---

### 4.8 Tables (simple tables only)

```html
<table>
  <tr>
    <th>Header 1</th>
    <th>Header 2</th>
  </tr>
  <tr>
    <td>Cell 1</td>
    <td>Cell 2</td>
  </tr>
</table>
```

Rules:
- No inline styles
- No table scaffolding elements
- Only `rowspan` / `colspan` allowed

---

### 4.9 Images

```html
<img src="…" alt="…" class="screenshot">
```

Rules:
- Classes allowed: `screenshot`, `icon`
- No inline styles

---

## 5. Inline formatting

```html
<strong>bold</strong>
<em>italic</em>
<u>underline</u>
<s>strike</s>
<sub>sub</sub>
<sup>sup</sup>
```

Semantic spans:
```html
<span class="user-input">launch code</span>
<span class="variable">USERNAME</span>
```

---

## 6. Links (safety + normalization)

Canonical external link:

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">link text</a>
```

Rules:
- Allowed schemes: `http`, `https`, `mailto`
- Same-page anchors (`#…`) omit `target` and `rel`
- Missing `target` defaults to `_blank` for non-anchor links
- `_blank` requires `rel="noopener noreferrer"`

---

## 7. Cleanup rules

- Remove editor-only classes (`w2h-*`)
- Normalize nested inline tags
- Remove whitespace-preservation spans
- Remove forbidden attributes

---

## 8. Versioning

Breaking changes require:
- Updating this file
- Updating documentation
- Version bump (e.g., v1 → v1.1)

