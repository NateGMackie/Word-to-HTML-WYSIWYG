# 📄 Word-to-HTML WYSIWYG  
# **Export Contract (v1)**

This document defines the **expected HTML output** produced by the WYSIWYG editor after cleanup.  
It serves as a stability contract: changes to the editor **must not break** these semantics without an explicit version bump.

---

# 1. Overview

The editor produces:

- **Semantic HTML**  
- **Zero editor-only classes** (`w2h-*` is removed)
- **Clean, predictable markup** for block and inline structures  
- **Safe for ServiceNow** or any CSS-driven knowledge base  
- **Preserved content semantics** (e.g., callouts)

Whitespace spans and nested inline tags are normalized during export.

---

# 2. Block Elements

## 2.1 Headings

Lexical block headings map directly to semantic tags:

```html
<h1>Heading 1</h1>
<h2>Heading 2</h2>
<h3>Heading 3</h3>
```

No classes, no wrappers.

---

## 2.2 Paragraphs

Each paragraph is output as:

```html
<p>Your text…</p>
```

Inline formatting appears *inside* the paragraph as needed.

---

## 2.3 Blockquote

Generated using Lexical’s native `QuoteNode`:

```html
<blockquote>Quoted text</blockquote>
```

Decorative styling is applied in CSS, not in the HTML.

---

## 2.4 Code Blocks

Lexical `CodeNode` exports to semantic `<pre>`:

```html
<pre spellcheck="false">code block</pre>
```

Notes:

- Content is plain text inside `<pre>`
- No internal spans or editor classes survive export

---

## 2.5 Callouts

Callouts are **content semantics**, so they *do* export with their classes:

```html
<div class="callout note">
  <strong>Note:&nbsp;</strong>
  <p>Callout body</p>
</div>

<div class="callout example">
  <strong>Example:&nbsp;</strong>
  <p>Example body</p>
</div>

<div class="callout warning">
  <p>Warning body</p>
</div>
```

The CSS determines visual treatment (border-left, background, spacing).

---

# 3. Inline Formatting

The editor exports standardized, semantic inline tags.

### Bold
```html
<strong>bold</strong>
```

### Italic
```html
<em>italics</em>
```

### Underline
```html
<u>underline</u>
```

### Strikethrough
```html
<s>strikethrough</s>
```

### Subscript
```html
<sub>subscript</sub>
```

### Superscript
```html
<sup>superscript</sup>
```

### Link
```html
<a href="https://example.com" rel="noreferrer">link text</a>
```

**No editor theme classes** (e.g., `w2h-text-bold`) appear in exported HTML.

---

# 4. Lists

## 4.1 Unordered Lists

```html
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>
    <ul>
      <li>Nested item 1</li>
      <li>
        <ul>
          <li>Nested item 2</li>
        </ul>
      </li>
    </ul>
  </li>
</ul>
```

- No `value="…"`, `data-…`, or editor-specific classes  
- Nested lists are generated semantically

---

## 4.2 Ordered Lists

```html
<ol>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>
    <ol>
      <li>Sub 1</li>
      <li>
        <ol>
          <li>Sub–sub 1</li>
        </ol>
      </li>
    </ol>
  </li>
</ol>
```

All numbering and marker styles are handled solely by CSS, not inline HTML.

---

# 5. Cleanup Rules (Post-Processing)

The exported HTML undergoes cleanup to ensure stable, readable output.

### 5.1 Remove editor-only classes  
Any `class="…"` value containing `w2h-*` is stripped.  
Other classes are preserved as-is.

### 5.2 Normalize nested inline tags  
Examples:

- `<b><strong>bold</strong></b>` → `<strong>bold</strong>`
- `<i><em>italic</em></i>` → `<em>italic</em>`

### 5.3 Remove whitespace-preservation spans  
Simplifies:

```html
<span style="white-space: pre-wrap;">Text</span>
```

to:

```
Text
```

…but *only* when safe (plain text, no nested tags, not inside `<pre>`).

### 5.4 Remove `style="white-space: pre-wrap;"` from inline elements  
Example:

```html
<strong style="white-space: pre-wrap;">bold</strong>
```

→

```html
<strong>bold</strong>
```

### 5.5 Remove meaningless `value=` attributes from `<li>`  
(Lexical sometimes emits them.)  
They are stripped unconditionally.

---

# 6. Versioning

Whenever the editor changes its behavior in a way that affects exported HTML, update:

- This file  
- Editor documentation  
- Migration notes (if needed)

Breaking changes require a version bump (e.g. v1 → v1.1).
