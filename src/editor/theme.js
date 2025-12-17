// src/editor/theme.js

export const editorTheme = {
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
  horizontalRule: 'w2h-hr',

  // Custom callout kinds
  callout: {
    base: 'callout',
    note: 'callout note',
    warning: 'callout warning',
    example: 'callout example-block',
    blockquote: 'callout blockquote',
    code: 'callout code',
  },

  // Inline semantic spans
  userInput: 'user-input',
  variable: 'variable',
  caption: 'caption', // if you decide to treat it specially
};
