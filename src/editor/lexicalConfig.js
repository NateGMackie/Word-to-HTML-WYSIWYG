// src/editor/lexicalConfig.js
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { CodeNode /*, CodeHighlightNode */ } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListNode, ListItemNode, } from '@lexical/list';
import { TableNode, TableRowNode, TableCellNode } from '@lexical/table';

// custom nodes 
import { CalloutNode } from '../nodes/CalloutNode.js';
import { UserInputNode } from '../nodes/UserInputNode.js';
import { VariableNode } from '../nodes/VariableNode.js';


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

    table: 'w2h-table',
tableRow: 'w2h-table-row',
tableCell: 'w2h-table-cell',
tableCellHeader: 'w2h-table-cell-header',


    link: 'w2h-link',
    userInput: 'user-input',
    variable: 'variable',
  },
  onError(error) {
    throw error;
  },
  nodes: [
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

    // Tables
    TableNode,
TableRowNode,
TableCellNode,


    // Custom blocks
    CalloutNode,

    // User input
    UserInputNode,
    VariableNode,

  ],
};
