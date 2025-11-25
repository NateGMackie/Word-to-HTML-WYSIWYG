// src/editor/lexicalConfig.js
import {ParagraphNode, TextNode,} from 'lexical';
import {HeadingNode,} from '@lexical/rich-text';
import { AutoLinkNode } from '@lexical/link';
import { LinkNode } from '@lexical/link';
import {ListNode, ListItemNode,} from '@lexical/list';


// Basic theme classes. We can align these to your CSS later.
export const editorConfig = {
  namespace: 'w2h-editor',
  theme: {
    // Paragraphs will just inherit normal styles under #wysiwyg
    paragraph: 'w2h-paragraph',

    text: {
      bold: 'w2h-text-bold',
      italic: 'w2h-text-italic',
      underline: 'w2h-text-underline',
      strikethrough: 'w2h-text-strike',
      subscript: 'w2h-text-sub',
      superscript: 'w2h-text-super',
      code: 'w2h-text-code',
    },

    link: 'w2h-link',
  },
  onError(error) {
    throw error;
  },
  nodes: [
    ParagraphNode,
    TextNode,
    HeadingNode,
    ListNode,
    ListItemNode,
    LinkNode,
  ],
};
