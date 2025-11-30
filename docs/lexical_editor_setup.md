# Lexical Editor Setup Plan

This document describes how to wire our **Editor Content Model** into a Lexical editor configuration.

It is **framework-agnostic** (React vs vanilla), but uses Lexical’s concepts:

- `nodes` – all block/inline node types the editor understands.
- `theme` – CSS class names used when rendering.
- `onError` – error boundary for editor updates.
- `registerCommand` / `registerNodeTransform` – for behavior and validation.

Use this as a roadmap when you start coding the Lexical-based WYSIWYG.

---

## 1. Files & Structure (Suggested)

You can adjust this, but here’s a sane starting point:

- src/
  - editor/
    - lexicalConfig.js # editorConfig object & node list
    - theme.js # Lexical theme (CSS class mapping)
  - nodes/
    - CalloutNode.js # custom ElementNode
    - VariableNode.js # custom inline node
    - UserInputNode.js # custom inline node
    - (optional) CaptionNode.js later
  - plugins/
    - CalloutPlugin.js # toolbar + commands for note/warning/example/blockquote/code
    - KeyboardPlugin.js # Enter / Shift+Enter rules
    - ToolbarPlugin.js # buttons for bold/italics/headings/lists/etc.
    - HtmlImportPlugin.js # (later) HTML → Lexical conversion
    - HtmlExportPlugin.js # (later) Lexical → HTML for ServiceNow

---

## 2. `editorConfig` Skeleton

This is the conceptual core. Whether you use React’s `LexicalComposer` or a vanilla setup, you’ll have something like this.

```js
// src/editor/lexicalConfig.js

import { ParagraphNode } from 'lexical';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';
import { HorizontalRuleNode } from '@lexical/react/LexicalHorizontalRuleNode'; // or equivalent

// Custom nodes (you'll implement these)
import { CalloutNode } from './nodes/CalloutNode.js';
import { VariableNode } from './nodes/VariableNode.js';
import { UserInputNode } from './nodes/UserInputNode.js';

// Theme (CSS class names mapped to node roles)
import { editorTheme } from './theme.js';

export const editorNodes = [
  // Core text structure
  ParagraphNode,
  HeadingNode,

  // Lists
  ListNode,
  ListItemNode,

  // Links
  LinkNode,

  // Horizontal rule
  HorizontalRuleNode,

  // Custom blocks
  CalloutNode,

  // Custom inline
  VariableNode,
  UserInputNode,
];

export const editorConfig = {
  namespace: 'w2h-editor',
  theme: editorTheme,
  nodes: editorNodes,
  onError(error) {
    // For now: simple logging. Later you can add better error reporting.
    console.error('Lexical editor error:', error);
  },
};
