import {
  $getRoot,
  $createParagraphNode,
  $isElementNode,
  $isDecoratorNode,
} from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';


import { cleanHTML } from '../import/htmlImport.js'; // adjust path if yours differs
import { sanitizeToContract } from '../import/sanitizeToContract.js';

export function importHtmlToEditor(editor, html, { onWarnings } = {}) {
  // 1) Word-style normalization belt (even if already “clean”)
  const normalized = cleanHTML(html || '');

  // 2) Contract enforcement suspenders
  const { html: safeHtml, warnings } = sanitizeToContract(normalized);
  if (warnings.length) onWarnings?.(warnings);

  editor.update(() => {
    const root = $getRoot();
    root.clear();

    const parser = new DOMParser();
    const doc = parser.parseFromString(safeHtml || '', 'text/html');

    const nodes = $generateNodesFromDOM(editor, doc);

    const rootChildren = [];
    let textWrapper = null;

    for (const n of nodes) {
      const okAtRoot = $isElementNode(n) || $isDecoratorNode(n);

      if (okAtRoot) {
        if (textWrapper && textWrapper.getChildrenSize() > 0) {
          rootChildren.push(textWrapper);
        }
        textWrapper = null;
        rootChildren.push(n);
      } else {
        if (!textWrapper) textWrapper = $createParagraphNode();
        textWrapper.append(n);
      }
    }

    if (textWrapper && textWrapper.getChildrenSize() > 0) {
      rootChildren.push(textWrapper);
    }

    root.append(...(rootChildren.length ? rootChildren : [$createParagraphNode()]));
  });
}
