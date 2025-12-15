// src/nodes/VariableNode.js
import { ElementNode, $applyNodeReplacement } from 'lexical';

export class VariableNode extends ElementNode {
  static getType() {
    return 'variable';
  }

  static clone(node) {
    return new VariableNode(node.__key);
  }

  isInline() {
    return true;
  }

  static importJSON(serializedNode) {
    return $applyNodeReplacement(new VariableNode());
  }

  // For HTML → Lexical (copy/paste, HTML import)
  static importDOM() {
    return {
      span: (domNode) => {
        if (
          domNode instanceof HTMLSpanElement &&
          domNode.classList.contains('variable')
        ) {
          return {
            conversion: () => ({ node: new VariableNode() }),
            priority: 1,
          };
        }
        return null;
      },
    };
  }

  exportJSON() {
    return {
      ...super.exportJSON(),
      type: 'variable',
      version: 1,
    };
  }

  createDOM(config) {
    const span = document.createElement('span');
    const theme = config.theme;
    span.className = theme.variable || 'variable';
    return span;
  }

  updateDOM() {
    return false;
  }

  exportDOM(editor) {
    const span = document.createElement('span');
    const theme = editor._config.theme;
    span.className = theme.variable || 'variable';
    return { element: span };
  }
}

export function $createVariableNode() {
  return new VariableNode();
}
