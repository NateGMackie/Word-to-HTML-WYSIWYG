// src/editor/importHtmlToEditor.js
import { $getRoot, $createParagraphNode } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';

function coerceHtml(input) {
  if (typeof input === 'string') return input;
  if (input && typeof input === 'object') {
    if (typeof input.html === 'string') return input.html;
    if (typeof input.cleanHtml === 'string') return input.cleanHtml;
    if (typeof input.cleanHTML === 'string') return input.cleanHTML;
  }
  if (input == null) return '';
  return String(input);
}

export function importHtmlToEditor(editor, htmlLike) {
  const html = coerceHtml(htmlLike).trim();

  const parser = new DOMParser();
  const doc = parser.parseFromString(html || '<p></p>', 'text/html');

  editor.update(() => {
    const root = $getRoot();
    root.clear();

    const nodes = $generateNodesFromDOM(editor, doc);

    if (!nodes || nodes.length === 0) {
      root.append($createParagraphNode());
      return;
    }

    root.append(...nodes);
  });
}
