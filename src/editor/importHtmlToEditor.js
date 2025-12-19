import {
  $getRoot,
  $createParagraphNode,
  $isElementNode,
  $isDecoratorNode,
} from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';

export function importHtmlToEditor(editor, html) {
  editor.update(() => {
    const root = $getRoot();
    root.clear();

    // Parse whatever the user typed (even if it's mid-edit / malformed)
    const parser = new DOMParser();
    const doc = parser.parseFromString(html || '', 'text/html');

    const nodes = $generateNodesFromDOM(editor, doc);

    // Root can only contain Element or Decorator nodes.
    // If we get TextNodes (common while typing), wrap them in a paragraph.
    const rootChildren = [];
    let textWrapper = null;

    for (const n of nodes) {
      const okAtRoot = $isElementNode(n) || $isDecoratorNode(n);

      if (okAtRoot) {
        // flush any pending wrapper first
        if (textWrapper && textWrapper.getChildrenSize() > 0) {
          rootChildren.push(textWrapper);
        }
        textWrapper = null;
        rootChildren.push(n);
      } else {
        // wrap any non-root-safe nodes (TextNode, LineBreakNode, etc.)
        if (!textWrapper) textWrapper = $createParagraphNode();
        textWrapper.append(n);
      }
    }

    if (textWrapper && textWrapper.getChildrenSize() > 0) {
      rootChildren.push(textWrapper);
    }

    if (rootChildren.length > 0) {
      root.append(...rootChildren);
    } else {
      root.append($createParagraphNode());
    }
  });
}
