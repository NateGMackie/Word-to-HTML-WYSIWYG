// src/editor/lexicalConfig.js

import { ParagraphNode } from 'lexical';
import { HeadingNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { LinkNode } from '@lexical/link';

// Minimal theme just so Lexical has something.
// You can wire this into your Tailwind/CSS later.
const editorTheme = {
  paragraph: 'w2h-paragraph',
  heading: {
    h1: 'w2h-heading-1',
    h2: 'w2h-heading-2',
    h3: 'w2h-heading-3',
  },

  list: {
    ul: 'w2h-ul',
    ol: 'w2h-ol',
    listitem: 'w2h-li',
  },

  link: 'w2h-link',

  // ---- ADD THIS ----
  text: {
    bold: 'w2h-text-bold',
    italic: 'w2h-text-italic',
    underline: 'w2h-text-underline',
    strikethrough: 'w2h-text-strike',
    subscript: 'w2h-text-sub',
    superscript: 'w2h-text-super',
    code: 'w2h-text-code',
  },
};


export const editorNodes = [
  ParagraphNode,
  HeadingNode,
  ListNode,
  ListItemNode,
  LinkNode,
];

export const editorConfig = {
  namespace: 'w2h-editor',
  theme: editorTheme,
  nodes: editorNodes,
  onError(error) {
    console.error('Lexical editor error:', error);
  },
};
