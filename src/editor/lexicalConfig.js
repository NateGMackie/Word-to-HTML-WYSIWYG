// src/editor/lexicalConfig.js
import { ParagraphNode, TextNode, } from 'lexical';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode /*, CodeHighlightNode */ } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListNode, ListItemNode, } from '@lexical/list';
// src/editor/lexicalConfig.js
import { CalloutNode } from '../nodes/CalloutNode.js';



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
    QuoteNode,
    // Lists
    ListNode,
    ListItemNode,

    // Links
    LinkNode,
    // AutoLinkNode, // uncomment if/when you add the AutoLinkPlugin

    // Code
    CodeNode,
    // CodeHighlightNode, // optional, if you later wire in a code highlight plugin

    // Custom blocks
    CalloutNode,

  ],
};
